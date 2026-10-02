/** Resolve the authored source of a public feature entry, never its FESM bundle. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { listPackages, REPO_ROOT } from "./packages.mjs";

function exportTarget(value) {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return undefined;
  for (const condition of ["import", "default", "types", "require"]) {
    const target = exportTarget(value[condition]);
    if (target !== undefined) return target;
  }
  return undefined;
}

function angularEntrySource(dir, subpath) {
  const configPath = join(dir, subpath ?? "", "ng-package.json");
  if (!existsSync(configPath)) return undefined;
  const entry = JSON.parse(readFileSync(configPath, "utf8")).lib?.entryFile;
  if (typeof entry !== "string") return undefined;
  const file = join(dirname(configPath), entry);
  return existsSync(file) ? file : undefined;
}

function distEntrySource(dir, target) {
  if (!target.startsWith("./dist/")) return undefined;
  const stem = target
    .slice("./dist/".length)
    .replace(/(?:\.d)?\.[cm]?[jt]sx?$/, "");
  return ["ts", "tsx"]
    .map((extension) => join(dir, "src", `${stem}.${extension}`))
    .find((file) => existsSync(file));
}

/**
 * Follow the package's exports map, then ng-packagr's configured source for
 * Angular entries or the corresponding source of a dist module for other kits.
 * A declared entry with missing source stays unresolved so the guard rejects it.
 */
export function entrySource(specifier, root = REPO_ROOT) {
  const match = /^(@adapttable\/[\w-]+)(?:\/([\w/-]+))?$/.exec(specifier);
  if (!match) return undefined;
  const [, name, subpath] = match;
  for (const { dir } of listPackages(root)) {
    const manifest = JSON.parse(
      readFileSync(join(dir, "package.json"), "utf8")
    );
    if (manifest.name !== name) continue;
    const target = exportTarget(
      manifest.exports?.[subpath ? `./${subpath}` : "."]
    );
    if (target === undefined) return undefined;

    return existsSync(join(dir, "ng-package.json"))
      ? angularEntrySource(dir, subpath)
      : distEntrySource(dir, target);
  }
  return undefined;
}

/** A relative module next to `from`, resolved the way the bundler does. */
function relativeSource(from, specifier) {
  const base = join(dirname(from), specifier);
  return [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")].find((file) =>
    existsSync(file)
  );
}

const DECLARATION_KINDS = new Set([
  "const",
  "function",
  "interface",
  "type",
  "class",
  "enum",
]);

/** The name an `export const|function|… Name` line declares, if it is one. */
function declaredName(line) {
  const words = line.split(/\s+/);
  let at = 1;
  while (words[at] === "declare" || words[at] === "async") at++;
  if (!DECLARATION_KINDS.has(words[at] ?? "")) return undefined;
  return /^[A-Za-z_$][\w$]*/.exec(words[at + 1] ?? "")?.[0];
}

/** The text with its block and line comments removed. */
function withoutComments(text) {
  let out = "";
  let at = 0;
  while (at < text.length) {
    const block = text.indexOf("/*", at);
    const line = text.indexOf("//", at);
    const next = [block, line].filter((index) => index >= 0);
    if (next.length === 0) return out + text.slice(at);
    const start = Math.min(...next);
    out += text.slice(at, start);
    const end =
      start === block
        ? text.indexOf("*/", start + 2)
        : text.indexOf("\n", start);
    if (end < 0) return out;
    at = start === block ? end + 2 : end;
  }
  return out;
}

/** One `{ … }` specifier: its exported name and whether it is deprecated. */
function specifierName(raw) {
  const specifier = withoutComments(raw)
    .trim()
    .replace(/^type\s+/, "");
  if (!specifier) return undefined;
  const aliasAt = specifier.lastIndexOf(" as ");
  const name =
    aliasAt < 0 ? specifier : specifier.slice(aliasAt + " as ".length);
  const source = aliasAt < 0 ? specifier : specifier.slice(0, aliasAt);
  return {
    name: name.trim(),
    source: source.trim(),
    deprecated: raw.includes("@deprecated"),
  };
}

/**
 * Every name a module exports, with whether that export carries a
 * `@deprecated` notice: its own declarations and specifier lists, and the
 * names behind relative and workspace `export *`, which a check reading only the
 * braces would miss.
 */
export function exportsOf(file, seen = new Set(), root = REPO_ROOT) {
  const out = new Map();
  if (!file || seen.has(file)) return out;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  for (const [name, deprecated] of declaredExports(source)) {
    out.set(name, deprecated);
  }
  for (const [name, deprecated] of specifierExports(file, source, seen, root)) {
    out.set(name, deprecated);
  }
  for (const [name, deprecated] of barrelExports(file, source, seen, root)) {
    // An explicit export in this module shadows the barrel's.
    if (!out.has(name)) out.set(name, deprecated);
  }
  return out;
}

/**
 * Every name the module declares with `export`, and whether the doc comment
 * right above the declaration marks it `@deprecated`.
 */
function declaredExports(source) {
  const out = new Map();
  let doc = "";
  let inDoc = false;
  for (const line of source.split("\n")) {
    const text = line.trim();
    if (inDoc || text.startsWith("/**")) {
      doc = inDoc ? doc + text : text;
      inDoc = !text.endsWith("*/");
      continue;
    }
    const name = line.startsWith("export ") ? declaredName(line) : undefined;
    if (name) out.set(name, doc.includes("@deprecated"));
    if (text !== "") doc = "";
  }
  return out;
}

/** Every name the module's `export { … }` lists carry. */
function specifierExports(file, source, seen, root) {
  const out = new Map();
  for (const match of source.matchAll(
    /^export (?:type )?\{([^}]*)\}(?: from "(\.[^"]+)")?/gm
  )) {
    // A relative re-export carries the notice its declaration has.
    const target = match[2]
      ? exportsOf(relativeSource(file, match[2]), new Set(seen), root)
      : undefined;
    for (const raw of match[1].split(",")) {
      const entry = specifierName(raw);
      if (!entry) continue;
      out.set(
        entry.name,
        entry.deprecated || target?.get(entry.source) === true
      );
    }
  }
  return out;
}

/** Every name behind the module's relative or workspace `export *` barrels. */
function barrelExports(file, source, seen, root) {
  const out = new Map();
  for (const match of source.matchAll(
    /^export \* from "((?:\.|@adapttable\/)[^"]+)";/gm
  )) {
    for (const [name, deprecated] of exportsOf(
      match[1].startsWith(".")
        ? relativeSource(file, match[1])
        : entrySource(match[1], root),
      seen,
      root
    )) {
      if (!out.has(name)) out.set(name, deprecated);
    }
  }
  return out;
}

/** Every authored name served by a public entry, including forwarded barrels. */
export function entryExports(specifier, root = REPO_ROOT) {
  return exportsOf(entrySource(specifier, root), new Set(), root);
}

/** The canonical feature inventory must be served by every published kit. */
export function featureEntryProblems(packageName, features, root = REPO_ROOT) {
  const problems = [];
  // A kit may explicitly place a feature in a different secondary entry from
  // React's inventory, for example Angular's /batch-editing. Read that public
  // mapping from its own feature barrel, then verify the actual target source.
  const declared = new Map();
  const barrel = entrySource(`${packageName}/features`, root);
  const source = barrel ? readFileSync(barrel, "utf8") : "";
  for (const match of source.matchAll(
    /^export (?:type )?\{([^}]*)\} from "([^"]+)"/gm
  )) {
    if (!match[2].startsWith(`${packageName}/`)) continue;
    for (const raw of match[1].split(",")) {
      const entry = specifierName(raw);
      if (entry)
        declared.set(entry.name, { from: match[2], name: entry.source });
    }
  }
  for (const [factory, { subpath }] of Object.entries(features)) {
    const target = declared.get(factory);
    const specifier = target?.from ?? `${packageName}/${subpath}`;
    if (!entryExports(specifier, root).has(target?.name ?? factory)) {
      problems.push(
        `feature classification: ${specifier} does not export ${factory}`
      );
    }
  }
  return problems;
}
