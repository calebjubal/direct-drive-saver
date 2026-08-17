// Peak process-tree RSS sampler (METHODOLOGY.md §4).
//
// Windows: a persistent PowerShell loop (sample-tree-mem.ps1) samples the working
// set of the whole subtree and appends JSONL to a temp file, avoiding per-sample
// process spawn overhead.
// Unix (mac/linux): an in-process interval shells `ps` each tick, walks the tree
// from the root pid, and sums RSS.
//
// Both return the same shape from stop(): { peakRssBytes, sampleCount,
// meanIntervalMs, method }. Peak RSS is a within-OS relative metric only.

import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startMemSampler({ rootPid, intervalMs = 100 }) {
  return process.platform === "win32"
    ? startWindows(rootPid, intervalMs)
    : startUnix(rootPid, intervalMs);
}

// --- Windows -----------------------------------------------------------------
function startWindows(rootPid, intervalMs) {
  const workDir = mkdtempSync(join(tmpdir(), "memsample-"));
  const outFile = join(workDir, "samples.jsonl");
  const ps1 = join(__dirname, "sample-tree-mem.ps1");
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1,
     "-RootPid", String(rootPid), "-IntervalMs", String(intervalMs), "-OutFile", outFile],
    { stdio: "ignore", windowsHide: true },
  );

  return {
    async stop() {
      try { child.kill(); } catch {}
      await delay(150); // let the last append flush
      return parseSamples(outFile, () => rmSync(workDir, { recursive: true, force: true }));
    },
  };
}

// --- Unix --------------------------------------------------------------------
function startUnix(rootPid, intervalMs) {
  const samples = [];
  const tick = () => {
    const rss = subtreeRssUnix(rootPid);
    if (rss != null) samples.push({ t: Date.now(), rssBytes: rss });
  };
  const timer = setInterval(tick, intervalMs);
  tick();

  return {
    async stop() {
      clearInterval(timer);
      return summarize(samples);
    },
  };
}

function subtreeRssUnix(rootPid) {
  let out;
  try {
    out = execFileSync("ps", ["-A", "-o", "pid=,ppid=,rss="], { encoding: "utf8" });
  } catch {
    return null;
  }
  const children = new Map(); // ppid -> [pid]
  const rssKb = new Map();
  for (const line of out.split("\n")) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/);
    if (!m) continue;
    const pid = +m[1], ppid = +m[2], rss = +m[3];
    rssKb.set(pid, rss);
    if (!children.has(ppid)) children.set(ppid, []);
    children.get(ppid).push(pid);
  }
  if (!rssKb.has(rootPid)) return null;
  let total = 0;
  const stack = [rootPid];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    total += (rssKb.get(cur) ?? 0) * 1024;
    for (const c of children.get(cur) ?? []) stack.push(c);
  }
  return total;
}

// --- shared ------------------------------------------------------------------
function parseSamples(outFile, cleanup) {
  let samples = [];
  try {
    samples = readFileSync(outFile, "utf8")
      .split("\n").map((l) => l.trim()).filter(Boolean)
      .map((l) => JSON.parse(l));
  } catch { /* no samples captured */ }
  finally { try { cleanup(); } catch {} }
  return summarize(samples);
}

function summarize(samples) {
  const peakRssBytes = samples.reduce((mx, s) => Math.max(mx, s.rssBytes), 0);
  let meanIntervalMs = null;
  if (samples.length > 1) {
    const span = samples.at(-1).t - samples[0].t;
    meanIntervalMs = Math.round(span / (samples.length - 1));
  }
  return { peakRssBytes, sampleCount: samples.length, meanIntervalMs, method: "process-tree RSS" };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
