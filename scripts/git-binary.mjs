/**
 * Locate the git executable for the local gate scripts.
 *
 * A single hardcoded path breaks wherever git lives somewhere else — Homebrew
 * on Apple Silicon, a per-user Windows install, a macOS whose `/usr/bin/git`
 * is an Xcode stub that refuses to run. Reading the name from `PATH` would let
 * a writable directory decide what `git` means inside the gate, which
 * `sonarjs/no-os-command-from-path` rightly forbids.
 *
 * So: a fixed list of absolute, root-owned locations, and the first one that
 * answers `--version` wins.
 */
import { execFileSync } from "node:child_process";

/** Absolute candidates, most specific install first. */
export const GIT_CANDIDATES =
  process.platform === "win32"
    ? [
        "C:\\Program Files\\Git\\cmd\\git.exe",
        "C:\\Program Files (x86)\\Git\\cmd\\git.exe",
      ]
    : ["/opt/homebrew/bin/git", "/usr/local/bin/git", "/usr/bin/git"];

/** @type {string | undefined} */
let resolved;

/**
 * The absolute path of a working git.
 *
 * @returns {string}
 * @throws when no candidate runs — the caller decides whether that is fatal.
 */
export function gitBinary() {
  if (resolved !== undefined) return resolved;
  for (const candidate of GIT_CANDIDATES) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
    } catch {
      continue; // Absent here, or present and refusing to run. Try the next.
    }
    resolved = candidate;
    return resolved;
  }
  throw new Error(
    `git not found. Looked in: ${GIT_CANDIDATES.join(", ")}. ` +
      `Install git in one of those locations, or add yours to GIT_CANDIDATES ` +
      `in scripts/git-binary.mjs.`
  );
}
