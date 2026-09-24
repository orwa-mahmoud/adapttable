#!/usr/bin/env node
/**
 * The feature inventory, reconciled against the code it describes.
 *
 * `feature-classification.json` is the single source of truth for the v3
 * feature surface: what each opt-in is, which core modules carry it, which kit
 * components render it, which enabling prop it replaces, and whether
 * `standardFeatures()` includes it. The feature-parity check, the
 * framework-boundary check and the consumer harness all read it, so a stale
 * entry fails a gate instead of staying a documentation problem.
 *
 * An inventory is only worth what it is reconciled against, so this checks the
 * claims rather than the format:
 *
 * 1. **Every factory is listed exactly once.** The factories exported from
 *    `@adapttable/react/features` are the population; a new one that nobody
 *    classified fails here rather than being quietly absent from every check
 *    that reads the inventory.
 * 2. **Every named module exists.** Implementation paths and kit components
 *    are resolved on disk, so a rename cannot leave the manifest pointing at
 *    a file that moved.
 * 3. **Every replaced prop stays removed.** No `replacesProps` entry may be
 *    declared again on the public `BaseDataTableProps` or on an adapter's
 *    `DataTablePropsBase`.
 * 4. **`standardFeatures()` is honest.** Its zero-argument list may name only
 *    factories that are callable bare — a factory that needs options is inert
 *    without them, so naming it in a preset would bundle an implementation the
 *    table cannot use. Each `requiresConfig` is checked against the real
 *    signature rather than trusted.
 * 5. **The removal inventory matches the surface.** Every warned prop and
 *    every main-entry alias is accounted for in both directions, so the major
 *    cannot quietly drop something nobody wrote down — or keep advertising a
 *    removal that already happened. A moved name the main entry still serves
 *    must carry `@deprecated`, seen through `export *` barrels too.
 * 6. **Every migration row sends people somewhere real.** Each import an
 *    alias row names exports that name, and each removed-prop row's factory
 *    is the one the inventory maps the prop to and is exported from that
 *    subpath of every published kit.
 * 7. **Every v4 removal is still a working, flagged API.** Each prop the
 *    `v4Removals` inventory names is declared on `BaseDataTableProps` with a
 *    `@deprecated` notice until the major that removes it.
 *
 *   node scripts/check-feature-classification.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "scripts", "feature-classification.json");
const PACKAGES = join(ROOT, "packages");

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const listed = manifest.features;

const adapters = readdirSync(PACKAGES).filter((name) =>
  name.startsWith("adapter-")
);

const problems = [];

/* 1. The factories the binding exports are exactly the factories listed. -- */

const featuresEntry = readFileSync(
  join(PACKAGES, "react", "src", "features.ts"),
  "utf8"
);
/**
 * The built-in factories the entry re-exports.
 *
 * Most still come from the shared `factories` module; a feature that owns
 * hooks has moved to its own entry so a table that never imports it never
 * carries it, and those are re-exported by name.
 */
const exported = new Set();
for (const block of featuresEntry.matchAll(
  /export\s+\{([^}]*)\}\s+from\s+"\.\/features\/[\w-]+";/g
)) {
  for (const raw of block[1].split(",")) {
    // Prettier normalizes `X as Y` to single spaces, so a literal split is exact.
    const name = raw.trim().split(" as ").pop()?.trim();
    if (name && !name.startsWith("type ") && !/^[A-Z]/.test(name)) {
      exported.add(name);
    }
  }
}
// Not features: the ad-hoc patch escape hatch, and the two composition
// helpers every adapter runs.
for (const name of ["feature", "applyTableFeatures", "useTableFeatures"]) {
  exported.delete(name);
}

for (const name of exported) {
  if (!(name in listed)) {
    problems.push(
      `${name} is exported from @adapttable/react/features but is not classified in feature-classification.json`
    );
  }
}
for (const name of Object.keys(listed)) {
  if (!exported.has(name)) {
    problems.push(
      `${name} is classified but is not exported from @adapttable/react/features`
    );
  }
}

/* 2. Every named module resolves on disk. --------------------------------- */

for (const [name, feature] of Object.entries(listed)) {
  for (const relative of feature.implementation) {
    if (!existsSync(join(PACKAGES, relative))) {
      problems.push(`${name}: implementation ${relative} does not exist`);
    }
  }
  for (const component of feature.adapterComponents) {
    const kits = adapters.filter((adapter) =>
      existsSync(
        join(PACKAGES, adapter, "src", "components", `${component}.tsx`)
      )
    );
    if (kits.length === 0) {
      problems.push(
        `${name}: adapter component ${component}.tsx exists in no kit`
      );
    }
  }
}

/* 3. Every replaced prop is gone from the public prop surface. ------------- */

/**
 * v3 removed the enabling props, so there is no warning list to reconcile
 * against any more — the check is that they are ABSENT.
 *
 * `FeatureProps` still declares each one, because that is the channel a
 * feature's `apply()` writes through; what must never come back is a
 * declaration on the public `BaseDataTableProps`, which is the only shape a
 * host can write.
 */
const props = readFileSync(join(PACKAGES, "react", "src", "props.ts"), "utf8");
const publicSurface = props.slice(
  props.indexOf("export interface BaseDataTableProps<TRow> {")
);
const adapterPublicSurfaces = adapters.flatMap((adapter) => {
  const typesPath = join(PACKAGES, adapter, "src", "types.ts");
  if (!existsSync(typesPath)) return [];
  const source = readFileSync(typesPath, "utf8");
  const start = source.indexOf("export interface DataTablePropsBase<TRow>");
  const end = source.indexOf("export type DataTableProps<TRow>", start);
  return start < 0 || end < 0
    ? []
    : [{ adapter, surface: source.slice(start, end) }];
});
for (const [name, feature] of Object.entries(listed)) {
  for (const prop of feature.replacesProps) {
    if (new RegExp(`^  ${prop}\\??:`, "m").test(publicSurface)) {
      problems.push(
        `${name}: replacesProps names "${prop}", which v3 removed but BaseDataTableProps declares again`
      );
    }
    for (const { adapter, surface } of adapterPublicSurfaces) {
      if (new RegExp(`^  ${prop}\\??:`, "m").test(surface)) {
        problems.push(
          `${name}: replacesProps names "${prop}", which v3 removed but ${adapter} DataTablePropsBase declares again`
        );
      }
    }
  }
}

/* 4. `standardFeatures()` names only factories that work with no options. -- */

/** Every module that defines a factory, shared or feature-owned. */
const factoryModules = readdirSync(join(PACKAGES, "react", "src", "features"))
  .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
  .map((name) =>
    readFileSync(join(PACKAGES, "react", "src", "features", name), "utf8")
  );
const factories = factoryModules.join("\n");

/**
 * How a character moves the bracket depth. The `>` of an arrow (`=>`) closes
 * nothing, so it leaves the depth where it was.
 */
function depthStep(text, i) {
  const ch = text[i];
  if ("<({[".includes(ch)) return 1;
  if (ch === ">" && text[i - 1] === "=") return 0;
  if (">)}]".includes(ch)) return -1;
  return 0;
}

/** Split a parameter list on its top-level commas. */
function parameters(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    depth += depthStep(text, i);
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim());
}

/** `name?: T` or `name = default`. An arrow type is not a default. */
function isOptional(parameter) {
  if (/^\w+\s*\?\s*:/.test(parameter)) return true;
  let depth = 0;
  for (let i = 0; i < parameter.length; i++) {
    depth += depthStep(parameter, i);
    if (parameter[i] !== "=" || depth !== 0) continue;
    if (parameter[i + 1] === ">" || parameter[i + 1] === "=") continue;
    if ("=!<>".includes(parameter[i - 1])) continue;
    return true;
  }
  return false;
}

/** Can this factory be called with no arguments at all? */
const callableBare = new Map();
for (const block of factories.split("\nexport function ").slice(1)) {
  const name = /^(\w+)/.exec(block)?.[1];
  // A row-independent factory returns `StaticTableFeature`, which is the
  // whole point of that type — both spellings are a factory signature.
  const signature =
    /^\w+(?:<[^>]*>)?\(([\s\S]*?)\):\s*(?:Static)?TableFeature/.exec(block);
  if (!name || !signature) continue;
  callableBare.set(name, parameters(signature[1]).every(isOptional));
}

for (const [name, feature] of Object.entries(listed)) {
  const bare = callableBare.get(name);
  if (bare === undefined) {
    problems.push(
      `${name}: no factory signature found in features/factories.ts`
    );
    continue;
  }
  if (feature.requiresConfig === bare) {
    problems.push(
      `${name}: requiresConfig is ${feature.requiresConfig}, but the factory ` +
        `${bare ? "takes no required argument" : "requires an argument"}`
    );
  }
}

const { zeroArgument, onlyWithOptions } = manifest.standardFeatures;
const preset = Object.keys(listed).filter(
  (name) => listed[name].standardPreset
);
for (const name of zeroArgument) {
  if (listed[name]?.requiresConfig) {
    problems.push(
      `standardFeatures(): ${name} is listed as zero-argument but needs options`
    );
  }
}
for (const name of onlyWithOptions) {
  if (listed[name] && !listed[name].requiresConfig) {
    problems.push(
      `standardFeatures(): ${name} is listed as needing options but takes none`
    );
  }
}
const named = new Set([...zeroArgument, ...onlyWithOptions]);
for (const name of preset) {
  if (!named.has(name)) {
    problems.push(
      `standardFeatures(): ${name} is a preset member but appears in neither list`
    );
  }
}
for (const name of named) {
  if (!preset.includes(name)) {
    problems.push(
      `standardFeatures(): ${name} is listed but is not a preset member`
    );
  }
}

/* 5. The v3 removal inventory still matches the code it describes. -------- */

const removals = Object.fromEntries(
  manifest.v3Removals.groups.map((group) => [group.id, group])
);

const enabling = removals["enabling-props"];
for (const prop of Object.keys(enabling.props)) {
  // Inventoried as removed, so it must be off the public surface AND still on
  // the internal channel — a prop features can write but no host can pass.
  if (new RegExp(`^  ${prop}\\??:`, "m").test(publicSurface)) {
    problems.push(
      `v3Removals: "${prop}" is inventoried for removal but BaseDataTableProps declares it`
    );
  }
  if (!new RegExp(`^  ${prop}\\??:`, "m").test(props)) {
    problems.push(
      `v3Removals: "${prop}" is inventoried for removal but FeatureProps does not declare it, so no feature can apply it`
    );
  }
}

/** A source file for an entry specifier, or `undefined` when there is none. */
function entrySource(specifier) {
  const match = /^@adapttable\/([\w-]+)(?:\/([\w-]+))?$/.exec(specifier);
  if (!match) return undefined;
  const [, pkg, sub] = match;
  // Kits publish as `@adapttable/<kit>` from `packages/adapter-<kit>`.
  return [pkg, `adapter-${pkg}`]
    .flatMap((dir) =>
      ["ts", "tsx"].map((ext) =>
        join(PACKAGES, dir, "src", `${sub ?? "index"}.${ext}`)
      )
    )
    .find((file) => existsSync(file));
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
 * names behind any relative `export *`, which a check reading only the
 * braces would miss.
 */
function exportsOf(file, seen = new Set()) {
  const out = new Map();
  if (!file || seen.has(file)) return out;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  for (const [name, deprecated] of declaredExports(source)) {
    out.set(name, deprecated);
  }
  for (const [name, deprecated] of specifierExports(file, source, seen)) {
    out.set(name, deprecated);
  }
  for (const [name, deprecated] of barrelExports(file, source, seen)) {
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
function specifierExports(file, source, seen) {
  const out = new Map();
  for (const match of source.matchAll(
    /^export (?:type )?\{([^}]*)\}(?: from "(\.[^"]+)")?/gm
  )) {
    // A relative re-export carries the notice its declaration has.
    const target = match[2]
      ? exportsOf(relativeSource(file, match[2]), new Set(seen))
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

/** Every name behind the module's relative `export *` barrels. */
function barrelExports(file, source, seen) {
  const out = new Map();
  for (const match of source.matchAll(/^export \* from "(\.[^"]+)";/gm)) {
    for (const [name, deprecated] of exportsOf(
      relativeSource(file, match[1]),
      seen
    )) {
      if (!out.has(name)) out.set(name, deprecated);
    }
  }
  return out;
}

/**
 * What the main entry still serves of the names v3 moved.
 *
 * The 72 v2 aliases left for `@adapttable/react/adapter`. The framework-neutral
 * ones are still exported from the main entry, each with a `@deprecated`
 * notice until the major that removes them; a name the inventory keeps on the
 * main entry on purpose is listed in `keptOnMain`. Anything else served there
 * — undeprecated, through a barrel or a brace — is one that came back.
 */
const mainEntryExports = exportsOf(join(PACKAGES, "core", "src", "index.ts"));
const keptOnMain = new Set(removals["main-entry-aliases"].keptOnMain ?? []);
const inventoried = new Set(removals["main-entry-aliases"].names);
for (const name of inventoried) {
  if (
    mainEntryExports.has(name) &&
    mainEntryExports.get(name) !== true &&
    !keptOnMain.has(name)
  ) {
    problems.push(
      `v3Removals: "${name}" moved at v3 but the main entry serves it without a @deprecated notice`
    );
  }
}

const codemodSource = readFileSync(
  join(PACKAGES, "cli", "src", "migrateV3.ts"),
  "utf8"
);
// The codemod's route table maps every moved export to the package that now
// owns it, keyed by the specifier a v2 source imported it from. Read the
// symbol keys: a specifier key starts with "@", a symbol never does.
// Only the names that left core's MAIN entry are main-entry aliases; the
// table's other blocks are subpath moves, which this inventory does not cover.
const codemodAliasStart = codemodSource.indexOf('"@adapttable/core": {');
const codemodAliasEnd = codemodSource.indexOf("\n  },", codemodAliasStart);
const codemodAliases = new Set(
  [
    ...codemodSource
      .slice(codemodAliasStart, codemodAliasEnd)
      .matchAll(/^[ \t]+"?([A-Za-z_$][\w$]*)"?:[ \t]*"@adapttable\//gm),
  ].map((match) => match[1])
);
for (const name of inventoried) {
  if (!codemodAliases.has(name)) {
    problems.push(`v3Removals: migrate-v3 does not move alias "${name}"`);
  }
}
for (const name of codemodAliases) {
  if (!inventoried.has(name)) {
    problems.push(`v3Removals: migrate-v3 moves uninventoried alias "${name}"`);
  }
}

const migrationGuide = readFileSync(
  join(ROOT, "docs", "migrate-from-v2.md"),
  "utf8"
);
for (const name of [
  ...Object.keys(enabling.props),
  ...inventoried,
  "useChromeBodyData",
  "FilterTypeRegistry.register",
  "FilterTypeRegistry.extend",
  "size",
]) {
  if (!migrationGuide.includes(`\`${name}\``)) {
    problems.push(
      `v3Removals: docs/migrate-from-v2.md does not name removed API "${name}"`
    );
  }
}

/**
 * Each migration row points at an import that really serves the name.
 *
 * An alias row names one or more entries (`@adapttable/react/adapter`, or
 * `@adapttable/core` or `@adapttable/react`); every one must export it. A
 * removed-prop row names a factory and a kit subpath; every kit must publish
 * that subpath and export the factory from it, and the factory must be the one
 * the inventory maps the prop to.
 */
const exportCache = new Map();
function entryExports(specifier) {
  if (!exportCache.has(specifier)) {
    exportCache.set(specifier, exportsOf(entrySource(specifier)));
  }
  return exportCache.get(specifier);
}
/** A migration-guide table row: its first cell's code name and its second cell. */
function guideRow(line) {
  if (!line.startsWith("| `")) return undefined;
  const cells = line.split("|").map((cell) => cell.trim());
  const first = /^`([^`]+)`$/.exec(cells[1] ?? "");
  return first ? { name: first[1], target: cells[2] ?? "" } : undefined;
}
const guideRows = migrationGuide
  .split("\n")
  .map(guideRow)
  .filter((row) => row !== undefined);
for (const name of inventoried) {
  const row = guideRows.find((entry) => entry.name === name);
  if (!row) continue;
  const targets = [...row.target.matchAll(/`(@adapttable\/[\w/-]+)`/g)].map(
    (match) => match[1]
  );
  if (targets.length === 0) {
    problems.push(
      `v3Removals: docs/migrate-from-v2.md names no import for "${name}"`
    );
  }
  for (const target of targets) {
    if (!entryExports(target).has(name)) {
      problems.push(
        `v3Removals: docs/migrate-from-v2.md sends "${name}" to ${target}, which does not export it`
      );
    }
  }
}

/**
 * The entries a "name → import" row sends people to, when that cell holds
 * nothing but entry specifiers (`@adapttable/core` or `@adapttable/react`).
 */
function importTargets(cell) {
  const only =
    /^`@adapttable\/[\w/-]+`(?:\s*(?:,|or|and)\s*`@adapttable\/[\w/-]+`)*$/;
  if (!only.test(cell)) return [];
  return [...cell.matchAll(/`(@adapttable\/[\w/-]+)`/g)].map((m) => m[1]);
}
for (const row of guideRows) {
  if (inventoried.has(row.name)) continue;
  for (const target of importTargets(row.target)) {
    if (!entryExports(target).has(row.name)) {
      problems.push(
        `docs/migrate-from-v2.md sends "${row.name}" to ${target}, which does not export it`
      );
    }
  }
}

/** Every `import { … } from "@adapttable/…"` a removal's v3 path shows. */
function v3PathImports(v3Path) {
  return [
    ...v3Path.matchAll(
      /import (?:type )?\{([^}]*)\} from "(@adapttable\/[\w/-]+)"/g
    ),
  ].flatMap((match) =>
    match[1]
      .split(",")
      .map((raw) => raw.trim().split(" as ")[0].trim())
      .filter((name) => name !== "")
      .map((name) => ({ name, from: match[2] }))
  );
}
for (const group of manifest.v3Removals.groups) {
  for (const { name, from } of v3PathImports(group.v3Path)) {
    if (!entryExports(from).has(name)) {
      problems.push(
        `v3Removals: ${group.id} shows importing ${name} from ${from}, which does not export it`
      );
    }
  }
}

const kitPackages = adapters.filter((adapter) =>
  existsSync(join(PACKAGES, adapter, "package.json"))
);
const publishedKits = kitPackages.filter(
  (adapter) =>
    JSON.parse(readFileSync(join(PACKAGES, adapter, "package.json"), "utf8"))
      .private !== true
);
for (const match of migrationGuide.matchAll(
  /^\| (`[^|]+`)\s*\|\s*`(\w+)\([^`]*\)`\s*\|\s*`@adapttable\/<kit>\/([\w-]+)`\s*\|/gm
)) {
  const rowProps = [...match[1].matchAll(/`(\w+)`/g)].map((prop) => prop[1]);
  const factory = match[2];
  const subpath = match[3];
  for (const prop of rowProps) {
    const mapped = enabling.props[prop];
    if (mapped !== undefined && mapped !== factory) {
      problems.push(
        `v3Removals: docs/migrate-from-v2.md replaces "${prop}" with ${factory}, but the inventory maps it to ${mapped}`
      );
    }
  }
  for (const adapter of publishedKits) {
    const pkg = JSON.parse(
      readFileSync(join(PACKAGES, adapter, "package.json"), "utf8")
    );
    if (!pkg.exports?.[`./${subpath}`]) {
      problems.push(
        `v3Removals: ${pkg.name} does not publish ./${subpath}, which docs/migrate-from-v2.md sends ${factory} to`
      );
      continue;
    }
    const file = relativeSource(
      join(PACKAGES, adapter, "src", "index.ts"),
      `./${subpath}`
    );
    const served = exportsOf(file);
    const reExportsAll = file
      ? /export\s+\*\s+from\s+"@adapttable\//.test(readFileSync(file, "utf8"))
      : false;
    if (!served.has(factory) && !reExportsAll) {
      problems.push(
        `v3Removals: ${pkg.name}/${subpath} does not export ${factory}`
      );
    }
  }
}

const apiGuide = readFileSync(join(ROOT, "docs", "api.md"), "utf8");
const dataTableReference = apiGuide.slice(
  0,
  apiGuide.indexOf("## Headless hooks")
);
for (const prop of Object.keys(enabling.props)) {
  if (dataTableReference.includes(`| \`${prop}\``)) {
    problems.push(
      `v3Removals: docs/api.md still lists removed DataTable prop "${prop}"`
    );
  }
}

for (const group of manifest.v3Removals.groups) {
  // The test reference may carry a trailing " — <test name>"; the path is the head.
  const path = group.test.split(" — ")[0];
  if (!existsSync(join(ROOT, path))) {
    problems.push(
      `v3Removals: ${group.id} names test ${path}, which does not exist`
    );
  }
}

/* 7. The v4 removal inventory: still declared, still flagged. ------------ */

/**
 * Whether the doc comment right above `  <prop>?:` in a source marks it
 * `@deprecated`.
 */
function propDeprecated(source, prop) {
  const declaration = new RegExp(`^  ${prop}\\??:`, "m").exec(source);
  if (!declaration) return false;
  const before = source.slice(0, declaration.index).trimEnd();
  if (!before.endsWith("*/")) return false;
  return before.slice(before.lastIndexOf("/**")).includes("@deprecated");
}

for (const group of manifest.v4Removals.groups) {
  for (const prop of group.props ?? []) {
    if (!new RegExp(`^  ${prop}\\??:`, "m").test(publicSurface)) {
      problems.push(
        `v4Removals: "${prop}" is inventoried for v4 but BaseDataTableProps no longer declares it`
      );
    } else if (!propDeprecated(publicSurface, prop)) {
      problems.push(
        `v4Removals: BaseDataTableProps declares "${prop}" without a @deprecated notice`
      );
    }
  }
  const path = group.test.split(" — ")[0];
  if (!existsSync(join(ROOT, path))) {
    problems.push(
      `v4Removals: ${group.id} names test ${path}, which does not exist`
    );
  }
}

/* ------------------------------------------------------------------------- */

if (problems.length === 0) {
  console.log(
    `✓ feature classification — ${Object.keys(listed).length} features, ` +
      `standardFeatures() ${zeroArgument.length} bare + ${onlyWithOptions.length} ` +
      `with options, every module, prop and signature reconciled`
  );
  process.exit(0);
}

for (const problem of problems) console.error(`✗ ${problem}`);
console.error(`\n${problems.length} inventory problem(s).`);
process.exit(1);
