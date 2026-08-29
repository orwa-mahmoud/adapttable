/**
 * One entry per public entry point every package under `packages/` advertises.
 *
 * The list is READ from each `exports` map, never hand-written: a hand-written
 * list goes stale silently, and this repository has already paid for that
 * twice. Core shipped `/xlsx`, `/pdf`, `/sparkline`, `/query`, `/pivot` and
 * `/formula` while only `.` and `/adapter` were extracted, so most of the
 * public surface could change shape with no report to show it. And
 * `@adapttable/cli` was skipped outright as "a bin, not an API" while its
 * `exports` map advertised `.` and its own README called the building blocks
 * usable programmatically.
 *
 * `./package.json` is not an API and `./styles.css` is not typed, so a subpath
 * counts only when it names a bare module. A package's `bin` is a program, not
 * a typed entry point, and is not listed here.
 *
 * `api-reports.mjs` extracts one report per entry; `api-entrypoints.test.mjs`
 * holds the list to what the packages actually publish.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

/** A subpath is extractable when it names a bare module, not a file. */
function isTypedSubpath(key) {
  return key === "." || !key.slice(2).includes(".");
}

/**
 * `{ dir, isMainEntry, report, entry, published }` for every typed entry
 * point, package by package, subpath sorted.
 *
 * `published` is false for a workspace-private package (`@adapttable/bootstrap`
 * is `private: true`): its parity is still worth reporting, but it carries no
 * SemVer promise, which is a distinction the contract checks depend on.
 */
export function entrypoints() {
  const list = [];
  for (const dir of readdirSync(PACKAGES_DIR)) {
    const manifest = JSON.parse(
      readFileSync(join(PACKAGES_DIR, dir, "package.json"), "utf8")
    );
    const subpaths = Object.keys(manifest.exports ?? { ".": {} }).filter(
      isTypedSubpath
    );
    for (const key of subpaths.sort()) {
      const name = key === "." ? "index" : key.slice(2);
      list.push({
        dir,
        isMainEntry: key === ".",
        published: manifest.private !== true,
        report: key === "." ? `${dir}.api.md` : `${dir}-${name}.api.md`,
        entry: join(PACKAGES_DIR, dir, "dist", `${name}.d.ts`),
      });
    }
  }
  return list;
}
