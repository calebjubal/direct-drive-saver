#!/usr/bin/env node
// Validates the controlled fixture before it is used for any benchmark run.
//
// Static checks (always): each configuration's lockfile exists, pins the exact
// next/react/react-dom versions from versions.json, and records the SWC package
// for the current platform.
//
// Frozen checks (default; skip with --static-only): each frozen install command
// runs in an isolated temp copy and MUST exit 0 while leaving its lockfile byte-
// identical. A mutated lockfile is a hard failure (METHODOLOGY.md §6).
//
// Usage:
//   node scripts/validate-fixture.mjs [--static-only]

import { readFileSync, cpSync, rmSync, mkdtempSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const fixtureDir = join(repoRoot, "fixtures", "next-app");
const staticOnly = process.argv.includes("--static-only");

const versions = JSON.parse(readFileSync(join(repoRoot, "versions.json"), "utf8"));

/** Resolve the single @next/swc-* package Next installs on this platform. */
export function currentPlatformSwc(swcMap = versions.swc, platform = process.platform, arch = process.arch) {
  if (platform === "win32") return swcMap[`win32-${arch}`];
  if (platform === "darwin") return swcMap[`darwin-${arch}`];
  if (platform === "linux") {
    // Default to glibc; fall back to musl when the runtime has no glibc.
    const isMusl = !process.report?.getReport?.()?.header?.glibcVersionRuntime;
    return swcMap[`linux-${arch}-${isMusl ? "musl" : "gnu"}`] ?? swcMap[`linux-${arch}-gnu`];
  }
  return undefined;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const results = [];
function record(config, name, ok, detail) {
  results.push({ config, name, ok, detail });
}

const swcPkg = currentPlatformSwc();
if (!swcPkg) {
  console.error(`No SWC mapping for ${process.platform}/${process.arch}; add it to versions.json.`);
  process.exit(2);
}
console.log(`Platform ${process.platform}/${process.arch} -> expected SWC: ${swcPkg}\n`);

// --- Static checks -----------------------------------------------------------
for (const config of versions.configurations) {
  const lockPath = join(fixtureDir, config.lockfile);
  if (!existsSync(lockPath)) {
    record(config.id, "lockfile-exists", false, `${config.lockfile} missing`);
    continue;
  }
  record(config.id, "lockfile-exists", true, config.lockfile);

  const lock = readFileSync(lockPath, "utf8");
  for (const [pkg, ver] of Object.entries(versions.fixture)) {
    const ok = lock.includes(`${pkg}@${ver}`) || lock.includes(`"${ver}"`) || lock.includes(`: ${ver}`);
    record(config.id, `pins-${pkg}`, ok, `${pkg}@${ver}`);
  }
  record(config.id, "records-platform-swc", lock.includes(swcPkg), swcPkg);
}

// --- Frozen checks -----------------------------------------------------------
if (!staticOnly) {
  for (const config of versions.configurations) {
    const work = mkdtempSync(join(tmpdir(), `fixture-${config.id}-`));
    try {
      cpSync(fixtureDir, work, {
        recursive: true,
        filter: (src) => !src.includes("node_modules") && !src.endsWith(".next"),
      });
      const lockPath = join(work, config.lockfile);
      const before = sha256(lockPath);
      const [cmd, ...args] = config.installCmd;
      const run = spawnSync(cmd, args, { cwd: work, shell: true, encoding: "utf8" });
      const combined = `${run.stdout || ""}\n${run.stderr || ""}`;
      // Native-defaults framing (METHODOLOGY §1.1): a non-zero exit caused ONLY by a
      // manager refusing to run dependency lifecycle scripts is `policy-blocked`,
      // an acceptable outcome — not a fixture failure.
      const policyBlocked = run.status !== 0 && /ERR_PNPM_IGNORED_BUILDS|Ignored build scripts/i.test(combined);
      const outcome = run.status === 0 ? "success" : policyBlocked ? "policy-blocked" : "failure";
      const exitOk = outcome !== "failure";
      record(config.id, "frozen-install-ok", exitOk, exitOk ? `outcome=${outcome}` : combined.trim().split("\n").slice(-3).join(" | "));
      const after = sha256(lockPath);
      record(config.id, "lockfile-unchanged", before === after, before === after ? "" : "lockfile mutated during frozen install");
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  }
}

// --- Report ------------------------------------------------------------------
let failed = 0;
for (const r of results) {
  const mark = r.ok ? "PASS" : "FAIL";
  if (!r.ok) failed++;
  console.log(`[${mark}] ${r.config.padEnd(13)} ${r.name}${r.detail ? "  — " + r.detail : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed === 0 ? 0 : 1);
