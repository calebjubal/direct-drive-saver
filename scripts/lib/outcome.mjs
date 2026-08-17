// Shared install-outcome classification (METHODOLOGY.md §1.2).
// Kept tiny and dependency-free so the validator, orchestrator, and the Phase-3
// error classifier all agree on the same taxonomy.

/** Signatures that mean "manager refused to run lifecycle scripts", not a crash. */
const POLICY_BLOCKED = [
  /ERR_PNPM_IGNORED_BUILDS/i,
  /Ignored build scripts/i,
];

/**
 * @param {number|null} status  process exit code
 * @param {string} output       combined stdout+stderr
 * @returns {{outcome: "success"|"policy-blocked"|"failure", signature: string|null}}
 */
export function classifyInstall(status, output = "") {
  if (status === 0) return { outcome: "success", signature: null };
  for (const re of POLICY_BLOCKED) {
    const m = output.match(re);
    if (m) return { outcome: "policy-blocked", signature: m[0] };
  }
  return { outcome: "failure", signature: firstErrorLine(output) };
}

/** Best-effort one-line normalized signature for a failure. */
export function firstErrorLine(output = "") {
  const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errLine = lines.find((l) => /error|ERR_|EACCES|ENOENT|ENOSPC|failed/i.test(l));
  return (errLine ?? lines.at(-1) ?? null)?.slice(0, 200) ?? null;
}
