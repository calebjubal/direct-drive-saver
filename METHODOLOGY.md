# Methodology

This document fixes the measurement and analysis rules for the cross-platform
`node_modules` install benchmark **before** any data is collected, so that
results cannot be shaped after the fact. All pinned versions live in
[`versions.json`](versions.json).

## 1. Configurations under test

| id | Manager | Version | Linker | Frozen install command |
|----|---------|---------|--------|------------------------|
| `npm`          | npm  | 11.5.2  | hoisted  | `npm ci` |
| `pnpm`         | pnpm | 11.11.0 | isolated | `pnpm install --frozen-lockfile` |
| `bun-hoisted`  | Bun  | 1.2.19  | hoisted  | `bun install --frozen-lockfile --linker=hoisted` |
| `bun-isolated` | Bun  | 1.2.19  | isolated | `bun install --frozen-lockfile --linker=isolated` |

The fixture is one minimal Next.js 16.2.12 app (React/React-DOM 19.2.6). Only
**frozen** installs are used; any trial whose install mutates its lockfile is
**rejected** (see §6).

### 1.1 Lifecycle scripts — native defaults (no normalization)

Each manager runs **exactly as it ships**; we do **not** approve build scripts to
make them agree. This measures real out-of-box behavior. The consequence is a
built-in asymmetry around Next's optional `sharp` dependency (which has a build
script):

- **npm** runs dependency build scripts by default → `sharp` builds, exit 0.
- **pnpm 11** blocks them by default and exits **1** with `ERR_PNPM_IGNORED_BUILDS`.
  This is recorded as a **`policy-blocked`** outcome, **not** a failure, provided
  the dependency tree is still usable and `next build` succeeds.
- **Bun** blocks postinstall scripts by default (absent `trustedDependencies`)
  and exits 0 silently.

Because our fixture renders no images, `next build` succeeds whether or not
`sharp` is built, so the tree remains usable in every case. The differing
default policy is itself a **qualitative security/DX finding**, reported
alongside the quantitative metrics rather than penalized as a crash.

### 1.2 Outcome taxonomy

Every trial's install phase is classified as one of:

- **`success`** — exit 0, tree usable.
- **`policy-blocked`** — non-zero exit caused *only* by a manager's default refusal
  to run dependency lifecycle scripts (e.g. `ERR_PNPM_IGNORED_BUILDS`); tree still
  usable and the subsequent `next build` succeeds. Counted as a completed install
  for performance purposes, flagged separately for reporting.
- **`failure`** — any other non-zero exit, unusable tree, or failed build.

## 2. Platforms (blocks)

Each OS is a block; configurations are compared **within** a block. Cross-platform
statements use relative effects only, never absolute times, because runner
hardware differs.

- `windows-2025`
- `ubuntu-24.04`
- macOS — **runner label unresolved.** `macos-15-intel` is not a valid GitHub
  label; Intel is `macos-13`, `macos-15` is Apple Silicon. Resolved in Phase 4.

The exact runner image release is recorded on every job.

## 3. Conditions

| Condition | Cache | `node_modules` | Isolation guarantee |
|-----------|-------|----------------|---------------------|
| Cold  | empty | absent  | fresh cache root + fresh fixture per trial |
| Warm  | populated | absent | cache pre-warmed once, `node_modules` removed |
| No-op | populated | present | second install over a completed one |

`.next` is deleted before **every** build so build-cache effects never leak
between trials.

## 4. Metrics

Install and build are measured as **separate phases**.

**Time** — wall-clock (monotonic), CPU time (user+sys of the process tree),
cache/store growth (bytes), per phase.

**Memory** — peak combined RSS of the **entire process tree**, sampled at a
**target** 100 ms interval. The *actual* mean interval is recorded per trial
(`memMeanIntervalMs`): on Windows the per-sample `Win32_Process` (CIM) query
costs ~0.5 s, so effective cadence there is coarser (~400–700 ms) and short
spikes may be undersampled — the sampler is hardened and unit-tested in Phase 3.
Reported as a within-OS relative metric; absolute values on shared CI runners are
noisy and not compared across platforms.

**Storage** (per-OS definitions, because links are not portable):
- *Logical size* — sum of apparent file sizes in `node_modules`.
- *Physical size* — allocated-on-disk bytes; best-effort per OS
  (`st_blocks`×512 on Unix; allocation size on Windows). Hardlinked content is
  counted once per physical inode where the OS exposes it, and this is stated
  alongside every physical number.
- *Counts* — files, directories, and links (symlink + hardlink + Windows
  junction), reported separately. pnpm and `bun-isolated` rely on links; npm and
  `bun-hoisted` largely do not — so link counts are expected to differ by design,
  not by defect.
- *Cache/store size* — manager cache or content-addressable store.

**Errors** — exit code, failing phase, normalized error signature, raw log,
time-to-failure, recurrence count. Classes: resolution, peer, lockfile, cache,
permissions, storage, memory, Babel, SWC/native-binary, network, unknown.

**Stability** — install+build success rate, time/RAM variation, unchanged
lockfiles, repeatable dependency-inventory hash, repeatable build route manifest
(after normalizing embedded hashes/timestamps).

**Security** — known vulnerabilities from OSV-Scanner 2.3.8 against the
**actually-installed** inventory: affected package, severity, fixed version,
direct/transitive, and whether the vulnerable package was truly installed.
Scanner version, DB timestamp, and raw JSON are preserved.

## 5. Statistics

Performance data is **not** assumed normal.

- Central tendency: **median**; spread: **IQR**.
- Uncertainty: **bootstrap 95% confidence intervals** (percentile).
- Effect size for pairwise comparisons (e.g. cliff's delta / ratio-of-medians),
  reported with direction — not just p-values.
- Design: **randomized blocking** — manager order is randomized within each
  runner job so all configurations share one temporary machine.
- Screening uses **7** repetitions; confirmation uses **20 new** repetitions,
  never pooled with screening.

**Winner rule.** A single universal winner is declared only if it has (a) no
reproducible correctness failure, (b) no avoidable Critical/High vulnerability
regression, and (c) dominance across the primary performance metrics. Otherwise
publish **co-winners** and a platform/usage-specific decision table.

## 6. Trial rejection & job-fail rules

A trial is **rejected** (excluded, logged) when its lockfile changes during a
frozen install. A research **job fails** when: a lockfile changes, telemetry is
incomplete, the expected trial count is missing, or a raw observation cannot be
linked to its summary.

## 7. Reproducibility

Every observation is stored as immutable JSONL. A completed dataset must
regenerate identical tables, plots, rankings, and website summaries; this is a
gate, not a nicety.

## 8. Scope & assumptions

- "Memory" = peak process RAM **and** physical disk allocation.
- Security scope = publicly known vulnerabilities only. Malware, package-signing,
  and runtime pen-testing are out of scope.
- Hosted machines are compared within each OS; cross-OS aggregation uses relative
  effects.
- Co-winners are permitted when evidence does not support one universal winner.
