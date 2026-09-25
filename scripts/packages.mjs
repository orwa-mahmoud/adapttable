/**
 * Where the workspace packages live.
 *
 * Packages are grouped by framework under `packages/<group>/<name>` —
 * `shared` for the framework-neutral packages, one folder per framework
 * binding and its kits. A package's folder name is unique across groups, so
 * scripts address a package by that name and never by its group.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PACKAGES_ROOT = join(REPO_ROOT, "packages");

/**
 * Every package, as `{ name, group, dir, rel }`: `name` is its folder name,
 * `dir` its absolute path and `rel` its path relative to the repository root.
 *
 * @param {string} [root] repository root to read, for fixtures
 */
export function listPackages(root = REPO_ROOT) {
  const packagesRoot = join(root, "packages");
  const packages = [];
  for (const group of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!group.isDirectory()) continue;
    const groupDir = join(packagesRoot, group.name);
    for (const entry of readdirSync(groupDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(groupDir, entry.name);
      if (!existsSync(join(dir, "package.json"))) continue;
      packages.push({
        name: entry.name,
        group: group.name,
        dir,
        rel: relative(root, dir).split("\\").join("/"),
      });
    }
  }
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

/** Folder names of every package, sorted. */
export function packageNames(root = REPO_ROOT) {
  return listPackages(root).map((pkg) => pkg.name);
}

/**
 * Absolute path of the package whose folder is `name`.
 *
 * @param {string} name folder name, e.g. `"core"` or `"adapter-mui"`
 * @param {string} [root] repository root to read, for fixtures
 */
export function packageDir(name, root = REPO_ROOT) {
  return findPackage(name, root).dir;
}

/**
 * Path of the package whose folder is `name`, relative to the repository root
 * and `/`-separated — `"packages/shared/core"`.
 *
 * @param {string} name folder name, e.g. `"core"` or `"adapter-mui"`
 * @param {string} [root] repository root to read, for fixtures
 */
export function packageRel(name, root = REPO_ROOT) {
  return findPackage(name, root).rel;
}

/**
 * @param {string} name folder name
 * @param {string} root repository root
 */
function findPackage(name, root) {
  const pkg = listPackages(root).find((candidate) => candidate.name === name);
  if (!pkg)
    throw new Error(`no package folder named "${name}" under packages/`);
  return pkg;
}

/**
 * Resolve a path written relative to a package folder — `"core/src/x.ts"` —
 * to its absolute location, whatever group the package sits in.
 *
 * @param {string} packagePath `<package folder>/<path inside it>`
 * @param {string} [root] repository root to read, for fixtures
 */
export function resolvePackagePath(packagePath, root = REPO_ROOT) {
  const [name, ...rest] = packagePath.split("/");
  return join(packageDir(name, root), ...rest);
}
