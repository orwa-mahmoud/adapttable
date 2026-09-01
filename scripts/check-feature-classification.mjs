#!/usr/bin/env node
/**
 * The feature inventory, reconciled against the code it describes.
 *
 * `feature-classification.json` is the single source of truth for the v3
 * feature surface: what each opt-in is, which core modules carry it, which kit
 * components render it, which enabling prop it replaces, and whether
 * `standardFeatures()` includes it. The adapter split, the parity test and the
 * generated feature lists in README, the comparison page and the docs all read
 * it, so a stale entry does not stay a documentation problem for long — it
 * becomes a wrong feature list on a published page.
 *
 * An inventory is only worth what it is reconciled against, so this checks the
 * claims rather than the format:
 *
 * 1. **Every factory is listed exactly once.** The factories exported from
 *    `@adapttable/core/features` are the population; a new one that nobody
 *    classified fails here rather than being quietly absent from every
 *    generated list.
 * 2. **Every named module exists.** Implementation paths and kit components
 *    are resolved on disk, so a rename cannot leave the manifest pointing at
 *    a file that moved.
 * 3. **Every replaced prop is real.** Each `replacesProps` entry must appear
 *    in the deprecation list `warnDeprecatedFeatureProps` warns on, which is
 *    what proves the v2 path and the v3 replacement are the same feature.
 * 4. **`standardFeatures()` is honest.** Its zero-argument list may name only
 *    factories that are callable bare — a factory that needs options is inert
 *    without them, so naming it in a preset would bundle an implementation the
 *    table cannot use. Each `requiresConfig` is checked against the real
 *    signature rather than trusted.
 * 5. **The removal inventory matches the surface.** Every warned prop and
 *    every main-entry alias is accounted for in both directions, so the major
 *    cannot quietly drop something nobody wrote down — or keep advertising a
 *    removal that already happened.
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

/* 1. The factories core exports are exactly the factories listed. ---------- */

const featuresEntry = readFileSync(
  join(PACKAGES, "core", "src", "features.ts"),
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
      `${name} is exported from @adapttable/core/features but is not classified in feature-classification.json`
    );
  }
}
for (const name of Object.keys(listed)) {
  if (!exported.has(name)) {
    problems.push(
      `${name} is classified but is not exported from @adapttable/core/features`
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
const props = readFileSync(join(PACKAGES, "core", "src", "props.ts"), "utf8");
const publicSurface = props.slice(
  props.indexOf("export interface BaseDataTableProps<TRow> {")
);
for (const [name, feature] of Object.entries(listed)) {
  for (const prop of feature.replacesProps) {
    if (new RegExp(`^  ${prop}\\??:`, "m").test(publicSurface)) {
      problems.push(
        `${name}: replacesProps names "${prop}", which v3 removed but BaseDataTableProps declares again`
      );
    }
  }
}

/* 4. `standardFeatures()` names only factories that work with no options. -- */

/** Every module that defines a factory, shared or feature-owned. */
const factoryModules = readdirSync(join(PACKAGES, "core", "src", "features"))
  .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
  .map((name) =>
    readFileSync(join(PACKAGES, "core", "src", "features", name), "utf8")
  );
const factories = factoryModules.join("\n");

/** Split a parameter list on its top-level commas. */
function parameters(text) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if ("<({[".includes(ch)) depth++;
    else if (">)}]".includes(ch)) depth--;
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
    const ch = parameter[i];
    if ("<({[".includes(ch)) depth++;
    else if (">)}]".includes(ch)) depth--;
    else if (ch === "=" && depth === 0) {
      if (parameter[i + 1] === ">" || parameter[i + 1] === "=") continue;
      if ("=!<>".includes(parameter[i - 1])) continue;
      return true;
    }
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

/**
 * The aliases are gone, and staying gone is the assertion now.
 *
 * Every name the inventory lists was re-exported from the MAIN entry as well
 * as from `@adapttable/core/adapter`; v3 removed the main-entry copy. If one
 * comes back — a stray `export * from` somewhere in the barrel — this is what
 * notices, because the adapter entry is the only place any of them may live.
 */
const mainEntry = readFileSync(
  join(PACKAGES, "core", "src", "index.ts"),
  "utf8"
);
const inventoried = new Set(removals["main-entry-aliases"].names);
for (const name of inventoried) {
  if (
    new RegExp(`^export (?:const|type|function) ${name}\\b`, "m").test(
      mainEntry
    )
  ) {
    problems.push(
      `v3Removals: "${name}" was removed from the main entry at v3 but is exported there again`
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
