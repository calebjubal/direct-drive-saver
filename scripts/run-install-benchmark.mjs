#!/usr/bin/env node
// Cross-platform node_modules install benchmark — local orchestrator (Phase 2).
//
// For each (configuration x condition x rep) it runs a frozen install and a
// `next build` in an isolated fixture with an isolated cache, measures the two
// phases separately (wall time + peak process-tree RSS), collects storage
// metrics, classifies the outcome (METHODOLOGY §1.2), and appends one immutable
// JSONL record per trial.
//
// Usage:
//   node scripts/run-install-benchmark.mjs [options]
//     --configs npm,pnpm,bun-hoisted,bun-isolated   (default: all)
//     --conditions cold,warm,no-op                  (default: all)
//     --reps N                                      (default: 1)
//     --interval MS                                 (default: 100)
//     --out PATH                                    (default: data/runs/run-<ts>.jsonl)
//     --keep                                        keep temp work/cache dirs
//     --smoke                                       cold only, 1 rep (quick engine check)

import { spawn, execSync } from "node:child_process";
import { readFileSync, mkdtempSync, mkdirSync, rmSync, cpSync, existsSync, appendFileSync, statSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir, cpus, totalmem, release } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { measureTree } from "./lib/storage.mjs";
import { startMemSampler } from "./lib/mem-sampler.mjs";
import { classifyInstall } from "./lib/outcome.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const fixtureDir = join(repoRoot, "fixtures", "next-app");
const versions = JSON.parse(readFileSync(join(repoRoot, "versions.json"), "utf8"));

const SCHEMA_VERSION = 1;
const ALL_CONDITIONS = ["cold", "warm", "no-op"];

// --- args --------------------------------------------------------------------
const args = parseArgs(process.argv.slice(2));
const smoke = args.smoke;
const wantedConfigs = args.configs ? args.configs.split(",") : versions.configurations.map((c) => c.id);
const conditions = smoke ? ["cold"] : (args.conditions ? args.conditions.split(",") : ALL_CONDITIONS);
const reps = smoke ? 1 : Number(args.reps ?? 1);
const intervalMs = Number(args.interval ?? 100);
const configs = versions.configurations.filter((c) => wantedConfigs.includes(c.id));
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = args.out ?? join(repoRoot, "data", "runs", `run-${runId}.jsonl`);
mkdirSync(dirname(outPath), { recursive: true });

const machine = collectMachine();
console.log(`Run ${runId} -> ${outPath}`);
console.log(`Configs: ${configs.map((c) => c.id).join(", ")} | Conditions: ${conditions.join(", ")} | Reps: ${reps}\n`);

// --- main loop ---------------------------------------------------------------
let trialNo = 0;
for (let rep = 1; rep <= reps; rep++) {
  for (const config of shuffle([...configs])) { // randomized manager order per rep (blocking)
    for (const condition of conditions) {
      trialNo++;
      const label = `[${trialNo}] ${config.id}/${condition} rep${rep}`;
      process.stdout.write(`${label} ... `);
      try {
        const record = await runTrial({ config, condition, rep });
        appendFileSync(outPath, JSON.stringify(record) + "\n");
        console.log(`install=${record.install.outcome} ${fmt(record.install.wallMs)} | build=${record.build.outcome} ${fmt(record.build.wallMs)} | nm=${mb(record.storage.nodeModules.logicalBytes)}`);
      } catch (err) {
        console.log(`ERROR: ${err.message}`);
        appendFileSync(outPath, JSON.stringify({ schemaVersion: SCHEMA_VERSION, runId, error: err.message, config: config.id, condition, rep }) + "\n");
      }
    }
  }
}
console.log(`\nDone. ${trialNo} trials -> ${outPath}`);

// --- trial -------------------------------------------------------------------
async function runTrial({ config, condition, rep }) {
  const work = mkdtempSync(join(tmpdir(), `bench-${config.id}-`));
  const cache = mkdtempSync(join(tmpdir(), `cache-${config.id}-`));
  try {
    seedFixture(work);
    const { installArgs, env } = installInvocation(config, cache);

    // Condition setup: reach the required (cache, node_modules) state *before* the
    // measured install, using unmeasured prep runs.
    if (condition === "warm") {
      await runSilent(installArgs, work, env);            // populate cache + node_modules
      rmSync(join(work, "node_modules"), { recursive: true, force: true }); // drop node_modules, keep cache
    } else if (condition === "no-op") {
      await runSilent(installArgs, work, env);            // populate cache + node_modules; measured run is the 2nd
    }
    // cold: fresh cache + no node_modules (nothing to prep)

    // Measured install
    const lockPath = join(work, config.lockfile);
    const lockBefore = sha256File(lockPath);
    const install = await runPhase(installArgs, work, env);
    const lockChanged = sha256File(lockPath) !== lockBefore;
    const { outcome, signature } = classifyInstall(install.status, install.output);

    const storage = {
      nodeModules: measureTree(join(work, "node_modules")),
      cache: measureTree(cache),
    };

    // Measured build (always clean .next first so build-cache never leaks).
    // Resolve Next's real bin and run it via node — uniform across managers/linkers,
    // sidestepping shim differences (npm/pnpm .cmd vs Bun .exe/.bunx on Windows).
    rmSync(join(work, ".next"), { recursive: true, force: true });
    const nextBin = resolveNextBin(work);
    const build = await runPhase(["node", nextBin, "build"], work, env);

    return {
      schemaVersion: SCHEMA_VERSION,
      runId, trialId: randomUUID(), ts: new Date().toISOString(),
      platform: { os: process.platform, arch: process.arch, osRelease: release(), runnerImage: process.env.RUNNER_IMAGE ?? null },
      machine,
      toolVersions: versions.managers,
      config: { id: config.id, manager: config.manager, linker: config.linker, concurrency: null },
      condition, rep,
      install: {
        outcome, signature, exitCode: install.status, wallMs: install.wallMs, cpuMs: null,
        peakRssBytes: install.mem.peakRssBytes, memSampleCount: install.mem.sampleCount, memMeanIntervalMs: install.mem.meanIntervalMs,
      },
      build: {
        outcome: build.status === 0 ? "success" : "failure", exitCode: build.status, wallMs: build.wallMs,
        peakRssBytes: build.mem.peakRssBytes, memSampleCount: build.mem.sampleCount,
      },
      storage,
      inventoryHash: null,   // Phase 3: hash of actually-installed inventory
      lockfileChanged: lockChanged,   // METHODOLOGY §6: true => trial should be rejected
    };
  } finally {
    if (!args.keep) {
      rmSync(work, { recursive: true, force: true });
      rmSync(cache, { recursive: true, force: true });
    }
  }
}

// --- process execution -------------------------------------------------------
function runPhase(cmd, cwd, env) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const child = spawn(cmd[0], cmd.slice(1), { cwd, env, shell: true, windowsHide: true });
    const sampler = startMemSampler({ rootPid: child.pid, intervalMs });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("close", async (status) => {
      const wallMs = Number(process.hrtime.bigint() - start) / 1e6;
      const mem = await sampler.stop();
      resolve({ status, output, wallMs, mem });
    });
  });
}

function runSilent(cmd, cwd, env) {
  return new Promise((resolve) => {
    const child = spawn(cmd[0], cmd.slice(1), { cwd, env, shell: true, windowsHide: true, stdio: "ignore" });
    child.on("close", (status) => resolve(status));
  });
}

// --- helpers -----------------------------------------------------------------
function installInvocation(config, cacheDir) {
  const cmd = [...config.installCmd];
  const env = { ...process.env };
  if (config.manager === "npm") env.npm_config_cache = cacheDir;
  else if (config.manager === "pnpm") cmd.push(`--store-dir=${cacheDir}`);
  else if (config.manager === "bun") env.BUN_INSTALL_CACHE_DIR = cacheDir;
  return { installArgs: cmd, env };
}

function resolveNextBin(work) {
  const pkgPath = join(work, "node_modules", "next", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.next;
  return join(work, "node_modules", "next", rel);
}

function seedFixture(dest) {
  cpSync(fixtureDir, dest, {
    recursive: true,
    filter: (src) => !src.includes("node_modules") && !src.endsWith(".next"),
  });
}

function collectMachine() {
  return {
    cpuModel: cpus()[0]?.model ?? "unknown",
    cpus: cpus().length,
    totalMemBytes: totalmem(),
    node: process.version,
  };
}

function sha256File(p) {
  try { return createHash("sha256").update(readFileSync(p)).digest("hex"); }
  catch { return null; }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (["keep", "smoke"].includes(key)) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

function fmt(ms) { return ms == null ? "n/a" : `${(ms / 1000).toFixed(1)}s`; }
function mb(b) { return `${(b / 1e6).toFixed(1)}MB`; }
