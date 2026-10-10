/**
 * Resolve and walk built module graphs the way shipped packages load them.
 *
 * Shared by smoke-dist, framework-boundary checking, and isolation fixtures.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import ts from "typescript";

import { listPackages, REPO_ROOT } from "./packages.mjs";

function readPackageJson(pkgDir) {
  return JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
}

/**
 * Every workspace package directory keyed by its published name.
 *
 * @param {string} [root] repository root to read, for fixtures
 */
export function buildPkgDirByName(root = REPO_ROOT) {
  return new Map(
    listPackages(root).map(({ dir }) => [readPackageJson(dir).name, dir])
  );
}

/** Every specifier a built file imports, from TypeScript's scanner. */
export function importsOf(file) {
  const scanned = ts.preProcessFile(readFileSync(file, "utf8"), true, true);
  return [
    ...scanned.importedFiles.map((found) => found.fileName),
    ...scanned.referencedFiles.map(({ fileName }) =>
      fileName.startsWith(".") || isAbsolute(fileName)
        ? fileName
        : `./${fileName}`
    ),
    ...scanned.typeReferenceDirectives.map((found) => found.fileName),
  ];
}

/** The first `exports` branch a given set of conditions allows. */
function pickCondition(node, conditions) {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return undefined;
  for (const [key, value] of Object.entries(node)) {
    if (key !== "default" && !conditions.has(key)) continue;
    const hit = pickCondition(value, conditions);
    if (hit) return hit;
  }
  return undefined;
}

/** TypeScript resolves JavaScript-looking declaration imports to their types. */
function declarationTarget(target) {
  const extension = /\.(?:js|mjs|cjs)$/.exec(target)?.[0];
  if (extension) {
    const declarationExtension = {
      ".js": ".d.ts",
      ".mjs": ".d.mts",
      ".cjs": ".d.cts",
    }[extension];
    const declaration =
      target.slice(0, -extension.length) + declarationExtension;
    if (existsSync(declaration)) return declaration;
  }
  if (existsSync(target)) return target;
  return (
    [".d.ts", ".d.mts", ".d.cts", "/index.d.ts"]
      .map((suffix) => target + suffix)
      .find(existsSync) ?? target
  );
}

/**
 * Resolve one specifier the way the importing file's loader would.
 *
 * @returns `{ file }` | `{ external }` | `{ unresolved }`
 */
export function resolveImport(spec, fromFile, pkgDirByName) {
  const declaration = /\.d\.(?:ts|mts|cts)$/.test(fromFile);
  if (spec.startsWith(".") || isAbsolute(spec)) {
    const target = resolve(dirname(fromFile), spec);
    return { file: declaration ? declarationTarget(target) : target };
  }
  const scoped = spec.startsWith("@");
  const name = spec
    .split("/")
    .slice(0, scoped ? 2 : 1)
    .join("/");
  const pkgDir = pkgDirByName.get(name);
  if (!pkgDir) return { external: name };
  const conditions = new Set([
    "node",
    /\.(?:cjs|cts)$/.test(fromFile) ? "require" : "import",
  ]);
  if (declaration) conditions.add("types");
  const pkgJson = readPackageJson(pkgDir);
  const subpath = `.${spec.slice(name.length)}`;
  const target = pickCondition(pkgJson.exports?.[subpath], conditions);
  if (!target) return { unresolved: spec };
  return { file: join(pkgDir, target) };
}

/**
 * Every local file reachable from `entryFiles`, plus externals and unresolved
 * specifiers the walk could not follow.
 */
export function walkGraph(entryFiles, pkgDirByName) {
  const files = new Set();
  const externals = new Set();
  const unresolved = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const file = queue.pop();
    if (files.has(file)) continue;
    files.add(file);
    for (const spec of importsOf(file)) {
      const found = resolveImport(spec, file, pkgDirByName);
      if (found.external) externals.add(found.external);
      else if (found.unresolved) unresolved.add(found.unresolved);
      else if (!existsSync(found.file)) unresolved.add(spec);
      else queue.push(found.file);
    }
  }
  return { files, externals, unresolved };
}

/** Resolve a published subpath to its primary runtime file on disk. */
export function resolvePublishedEntry(pkgName, subpath = ".", pkgDirByName) {
  const pkgDir = pkgDirByName.get(pkgName);
  if (!pkgDir) return { missing: pkgName };
  const pkgJson = readPackageJson(pkgDir);
  const key = subpath === "." ? "." : `./${subpath.replace(/^\.\//, "")}`;
  const target = pickCondition(
    pkgJson.exports?.[key],
    new Set(["import", "node"])
  );
  if (!target) return { missing: `${pkgName}/${subpath}` };
  const file = join(pkgDir, target.replace(/^\.\//, ""));
  if (!existsSync(file)) return { missing: file };
  return { file, pkgDir };
}

/** Does a built file open with the `"use client"` directive? */
export function hasClientDirective(file) {
  return /^\s*["']use client["']/.test(
    readFileSync(file, "utf8").slice(0, 200)
  );
}

/** Flatten one `exports` condition entry into string targets. */
export function conditionTargets(entry, into = new Set()) {
  if (typeof entry === "string") {
    into.add(entry);
    return into;
  }
  if (!entry || typeof entry !== "object") return into;
  for (const value of Object.values(entry)) {
    conditionTargets(value, into);
  }
  return into;
}

/** Every target a package advertises through exports and legacy fields. */
export function exportTargets(pkgJson) {
  const targets = new Set();
  for (const entry of Object.values(pkgJson.exports ?? {})) {
    conditionTargets(entry, targets);
  }
  if (pkgJson.main) targets.add(pkgJson.main);
  if (pkgJson.module) targets.add(pkgJson.module);
  if (pkgJson.types) targets.add(pkgJson.types);
  conditionTargets(pkgJson.bin, targets);
  return [...targets];
}

export { readPackageJson };
