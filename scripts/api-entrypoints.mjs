/**
 * One entry per public entry point every package under `packages/<group>/`
 * advertises.
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
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { listPackages, REPO_ROOT } from "./packages.mjs";

/** A subpath is extractable when it names a bare module, not a file. */
function isTypedSubpath(key) {
  return key === "." || !key.slice(2).includes(".");
}

/**
 * The declaration file a subpath resolves to, as the package itself declares.
 *
 * Read rather than derived from the subpath, because a subpath need not be
 * spelled like the module behind it: `./ag-ui` is built from `agui.ts`,
 * `./ai-sdk` from `aiSdk.ts` and `./mcp-apps` from `mcpApps.ts`. A name guessed
 * from the key finds no file for any of them, and an entry point whose
 * declaration cannot be found is an entry point with no report — which is the
 * one thing this list exists to prevent.
 */
function typesTarget(value) {
  if (typeof value === "string")
    return value.endsWith(".d.ts") ? value : undefined;
  if (value === null || typeof value !== "object") return undefined;
  for (const condition of ["types", "import", "require", "default"]) {
    if (condition in value) {
      const found = typesTarget(value[condition]);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/**
 * `{ dir, subpath, isMainEntry, report, entry, published }` for every typed entry
 * point, package by package, subpath sorted.
 *
 * `published` is false for a workspace-private package (`@adapttable/bootstrap`
 * is `private: true`): its parity is still worth reporting, but it carries no
 * SemVer promise, which is a distinction the contract checks depend on.
 */
export function entrypoints(root = REPO_ROOT) {
  const list = [];
  for (const { name: dir, dir: packageDir } of listPackages(root)) {
    const manifest = JSON.parse(
      readFileSync(join(packageDir, "package.json"), "utf8")
    );
    const subpaths = Object.keys(manifest.exports ?? { ".": {} }).filter(
      isTypedSubpath
    );
    for (const key of subpaths.sort()) {
      const name = key === "." ? "index" : key.slice(2);
      list.push({
        dir,
        // The exports-map key this came from. Carried rather than recovered
        // from the report name, which flattens a nested subpath's separator.
        subpath: key,
        isMainEntry: key === ".",
        published: manifest.private !== true,
        // A nested subpath (`./features/row-reorder`) still names ONE report,
        // so the separator is flattened — `etc/` is a flat directory.
        report:
          key === "."
            ? `${dir}.api.md`
            : `${dir}-${name.replaceAll("/", "-")}.api.md`,
        entry: join(
          packageDir,
          typesTarget(manifest.exports?.[key])?.replace(/^\.\//, "") ??
            join("dist", `${name}.d.ts`)
        ),
      });
    }
  }
  return list;
}
