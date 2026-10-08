/** Source ownership and dependency direction for Angular's canonical entries. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import ts from "typescript";

import { sourceExports } from "./vue-export-contracts.mjs";

export const ANGULAR_ENTRIES = {
  root: "src/index.ts",
  features: "src/features.ts",
  adapter: "src/adapter.ts",
  formula: "formula/index.ts",
  pivot: "pivot/index.ts",
  router: "router/index.ts",
  sparkline: "sparkline/index.ts",
  stream: "stream/index.ts",
};

/** Named entries each entry may import; everything else is a forbidden edge. */
const ALLOWED_EDGES = {
  root: [],
  features: ["root"],
  adapter: ["root", "features"],
  formula: ["root", "adapter"],
  pivot: ["root", "adapter"],
  router: ["root", "adapter"],
  sparkline: ["root", "adapter"],
  stream: ["root", "adapter"],
};

const OWNED_ENTRIES = ["root", "features", "adapter"];

const binding = (repository) => join(repository, "packages/angular/angular");
const routeFor = (entry) =>
  entry === "root" ? "@adapttable/angular" : `@adapttable/angular/${entry}`;
const entryFor = (specifier) =>
  Object.keys(ANGULAR_ENTRIES).find((entry) => routeFor(entry) === specifier);

function relativeSource(file, specifier) {
  const base = resolve(dirname(file), specifier);
  return [`${base}.ts`, join(base, "index.ts"), base].find((file) =>
    existsSync(file)
  );
}

/** Names are a reviewed contract, independent of what the barrels currently export. */
export function angularOwnership(repository) {
  return JSON.parse(
    readFileSync(join(repository, "scripts/angular-entry-owners.json"), "utf8")
  );
}

/** The package export and ng-packagr entry both point at the canonical source. */
function entryTargetErrors(dir, manifest, entry, file) {
  const errors = [];
  const key = entry === "root" ? "." : `./${entry}`;
  const suffix = entry === "root" ? "" : `-${entry}`;
  const target = manifest.exports[key];
  if (
    target?.types !== `./dist/types/adapttable-angular${suffix}.d.ts` ||
    target?.default !== `./dist/fesm2022/adapttable-angular${suffix}.mjs`
  ) {
    errors.push(`${key}: missing canonical package export targets`);
  }
  const entryDir = entry === "root" ? dir : join(dir, entry);
  const pack = JSON.parse(
    readFileSync(join(entryDir, "ng-package.json"), "utf8")
  );
  if (resolve(entryDir, pack.lib.entryFile) !== join(dir, file)) {
    errors.push(`${entry}: ng-packagr does not use the canonical source entry`);
  }
  return errors;
}

/** An entry's exported names match the reviewed list exactly. */
function entryNameErrors(entry, source, expected) {
  const exports = sourceExports(source);
  if (exports.some((edge) => edge.names === "*")) {
    return [`${entry}: wildcard closure hides export ownership`];
  }
  const actual = exports.flatMap((edge) => edge.names.map((name) => name.name));
  const errors = [];
  if (new Set(actual).size !== actual.length) {
    errors.push(`${entry}: duplicate public names`);
  }
  for (const name of expected) {
    if (!actual.includes(name)) errors.push(`${entry}: missing ${name}`);
  }
  for (const name of actual) {
    if (!expected.includes(name)) errors.push(`${entry}: unexpected ${name}`);
  }
  return errors;
}

export function angularSourceOwnershipErrors(repository) {
  const expected = angularOwnership(repository);
  const dir = binding(repository);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  return Object.entries(ANGULAR_ENTRIES).flatMap(([entry, file]) => [
    ...entryTargetErrors(dir, manifest, entry, file),
    ...(entry in expected
      ? entryNameErrors(
          entry,
          readFileSync(join(dir, file), "utf8"),
          expected[entry]
        )
      : []),
  ]);
}

/** Which owned entry re-exports each relative source module. */
function sourceOwners(dir, read, errors) {
  const owners = new Map();
  for (const entry of OWNED_ENTRIES) {
    const file = join(dir, ANGULAR_ENTRIES[entry]);
    for (const edge of sourceExports(read(file))) {
      if (!edge.from?.startsWith(".")) continue;
      const source = relativeSource(file, edge.from);
      if (owners.has(source) && owners.get(source) !== entry) {
        errors.push(`${source}: source declaration belongs to two entries`);
      }
      owners.set(source, entry);
    }
  }
  return owners;
}

/** The adapter entry may name feature types, never feature runtime values. */
function adapterFeatureImportErrors(file, text) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  return ast.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier.text === "@adapttable/angular/features" &&
        importsRuntimeValue(statement.importClause)
    )
    .map(
      () => `${file}: adapter has a runtime dependency on feature factories`
    );
}

function importsRuntimeValue(clause) {
  if (!clause || clause.isTypeOnly) return false;
  const names = clause.namedBindings;
  if (!names || !ts.isNamedImports(names)) return true;
  return names.elements.some((name) => !name.isTypeOnly);
}

/** Walks one entry's relative import closure, reporting forbidden edges. */
function entryClosureErrors(entry, start, owners, read) {
  const errors = [];
  const seen = new Set();
  const pending = [start];
  while (pending.length > 0) {
    const file = pending.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const text = read(file);
    for (const imported of ts.preProcessFile(text, true, true).importedFiles) {
      const next = importEdge(entry, file, imported.fileName, owners, errors);
      if (next) pending.push(next);
    }
    if (entry === "adapter") {
      errors.push(...adapterFeatureImportErrors(file, text));
    }
  }
  return errors;
}

/** Classifies one import; returns the next file to visit when it stays in the entry. */
function importEdge(entry, file, specifier, owners, errors) {
  const target = entryFor(specifier);
  if (target) {
    if (!ALLOWED_EDGES[entry].includes(target)) {
      errors.push(`${entry}: forbidden named edge to ${target} in ${file}`);
    }
    return undefined;
  }
  if (!specifier.startsWith(".")) return undefined;
  const next = relativeSource(file, specifier);
  if (!next) {
    errors.push(`${file}: unresolved ${specifier}`);
    return undefined;
  }
  const owner = owners.get(next);
  if (owner && owner !== entry) {
    errors.push(`${entry}: relative cross-entry edge to ${owner} in ${file}`);
    return undefined;
  }
  return next;
}

/** Includes type-only imports, as ng-packagr's source analysis does. */
export function angularEntryGraphErrors(repository, overrides = new Map()) {
  const dir = binding(repository);
  const errors = [];
  const read = (file) => overrides.get(file) ?? readFileSync(file, "utf8");
  const owners = sourceOwners(dir, read, errors);
  for (const [entry, source] of Object.entries(ANGULAR_ENTRIES)) {
    errors.push(...entryClosureErrors(entry, join(dir, source), owners, read));
  }
  return errors;
}

/** The named import or export elements of a statement, or none. */
function namedElements(statement) {
  const names = ts.isImportDeclaration(statement)
    ? statement.importClause?.namedBindings
    : statement.exportClause;
  if (!names || (!ts.isNamedImports(names) && !ts.isNamedExports(names))) {
    return [];
  }
  return names.elements;
}

/** Mixed, renamed, type-only imports and re-exports all retain their owner. */
export function angularConsumerOwnershipErrors(text, ownership) {
  const expected = new Map(
    Object.entries(ownership).flatMap(([entry, names]) =>
      names.map((name) => [name, entry])
    )
  );
  const ast = ts.createSourceFile(
    "consumer.ts",
    text,
    ts.ScriptTarget.Latest,
    true
  );
  const errors = [];
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) &&
      !ts.isExportDeclaration(statement)
    )
      continue;
    const entry = entryFor(statement.moduleSpecifier?.text);
    if (!OWNED_ENTRIES.includes(entry)) continue;
    for (const element of namedElements(statement)) {
      const name = element.propertyName?.text ?? element.name.text;
      const owner = expected.get(name);
      if (owner && owner !== entry) {
        errors.push(`${name}: use ${routeFor(owner)}, not ${routeFor(entry)}`);
      }
    }
  }
  return errors;
}
