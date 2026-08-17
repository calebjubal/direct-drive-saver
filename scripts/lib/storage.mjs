// Storage metrics for a directory tree (e.g. node_modules or a manager store).
//
// Portability notes (see METHODOLOGY.md §4):
//  - logicalBytes: sum of apparent file sizes.
//  - physicalBytes: best-effort allocated-on-disk bytes. On Unix we use
//    stat.blocks*512 and count each hardlinked inode once. On Windows stat.blocks
//    is unavailable, so we round each file up to `clusterBytes` and cannot dedupe
//    hardlinks reliably — this is flagged in the returned `physicalMethod`.
//  - links: symlinks (and Windows junctions, which lstat reports as symlink).

import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_CLUSTER = 4096;

/**
 * @param {string} root
 * @param {{clusterBytes?: number}} [opts]
 */
export function measureTree(root, opts = {}) {
  const clusterBytes = opts.clusterBytes ?? DEFAULT_CLUSTER;
  const onUnix = process.platform !== "win32";
  const seenInodes = new Set(); // dev:ino of hardlinked files already counted physically

  let logicalBytes = 0;
  let physicalBytes = 0;
  let files = 0;
  let dirs = 0;
  let links = 0;

  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // vanished mid-walk; ignore
    }
    for (const ent of entries) {
      const full = join(dir, ent.name);
      let st;
      try {
        st = lstatSync(full);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        links++;
        continue; // never follow; target is counted where it physically lives
      }
      if (st.isDirectory()) {
        dirs++;
        walk(full);
        continue;
      }
      if (st.isFile()) {
        files++;
        logicalBytes += st.size;
        if (onUnix && typeof st.blocks === "number") {
          const key = `${st.dev}:${st.ino}`;
          if (st.nlink > 1) {
            if (seenInodes.has(key)) continue; // count hardlinked content once
            seenInodes.add(key);
          }
          physicalBytes += st.blocks * 512;
        } else {
          physicalBytes += Math.ceil(st.size / clusterBytes) * clusterBytes;
        }
      }
    }
  }

  let exists = true;
  try {
    lstatSync(root);
    walk(root);
  } catch {
    exists = false;
  }

  return {
    exists,
    logicalBytes,
    physicalBytes,
    physicalMethod: onUnix ? "st_blocks*512, hardlinks deduped" : "cluster-rounded, hardlinks not deduped",
    files,
    dirs,
    links,
  };
}
