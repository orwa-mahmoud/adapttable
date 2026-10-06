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

const binding = (repository) => join(repository, "packages/angular/angular");
const routeFor = (entry) =>
  `@adapttable/angular${entry === "root" ? "" : `/${entry}`}`;
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

export function angularSourceOwnershipErrors(repository) {
  const errors = [];
  const expected = angularOwnership(repository);
  const dir = binding(repository);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  for (const [entry, file] of Object.entries(ANGULAR_ENTRIES)) {
    const key = entry === "root" ? "." : `./${entry}`;
    const suffix = entry === "root" ? "" : `-${entry}`;
    if (
      manifest.exports[key]?.types !==
        `./dist/types/adapttable-angular${suffix}.d.ts` ||
      manifest.exports[key]?.default !==
        `./dist/fesm2022/adapttable-angular${suffix}.mjs`
    ) {
      errors.push(`${key}: missing canonical package export targets`);
    }
    const entryDir = entry === "root" ? dir : join(dir, entry);
    const pack = JSON.parse(
      readFileSync(join(entryDir, "ng-package.json"), "utf8")
    );
    if (resolve(entryDir, pack.lib.entryFile) !== join(dir, file)) {
      errors.push(
        `${entry}: ng-packagr does not use the canonical source entry`
      );
    }
    if (!(entry in expected)) continue;
    const exports = sourceExports(readFileSync(join(dir, file), "utf8"));
    if (exports.some((edge) => edge.names === "*")) {
      errors.push(`${entry}: wildcard closure hides export ownership`);
      continue;
    }
    const actual = exports.flatMap((edge) =>
      edge.names.map((name) => name.name)
    );
    if (new Set(actual).size !== actual.length) {
      errors.push(`${entry}: duplicate public names`);
    }
    for (const name of expected[entry]) {
      if (!actual.includes(name)) errors.push(`${entry}: missing ${name}`);
    }
    for (const name of actual) {
      if (!expected[entry].includes(name))
        errors.push(`${entry}: unexpected ${name}`);
    }
  }
  return errors;
}

/** Includes type-only imports, as ng-packagr's source analysis does. */
export function angularEntryGraphErrors(repository, overrides = new Map()) {
  const dir = binding(repository);
  const errors = [];
  const read = (file) => overrides.get(file) ?? readFileSync(file, "utf8");
  const owners = new Map();
  for (const entry of ["root", "features", "adapter"]) {
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
  const allowed = {
    root: [],
    features: ["root"],
    adapter: ["root", "features"],
    formula: ["root", "adapter"],
    pivot: ["root", "adapter"],
    router: ["root", "adapter"],
    sparkline: ["root", "adapter"],
    stream: ["root", "adapter"],
  };
  for (const [entry, source] of Object.entries(ANGULAR_ENTRIES)) {
    const seen = new Set();
    const visit = (file) => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = read(file);
      for (const imported of ts.preProcessFile(text, true, true)
        .importedFiles) {
        const target = entryFor(imported.fileName);
        if (target) {
          if (!allowed[entry].includes(target)) {
            errors.push(
              `${entry}: forbidden named edge to ${target} in ${file}`
            );
          }
          continue;
        }
        if (!imported.fileName.startsWith(".")) continue;
        const next = relativeSource(file, imported.fileName);
        if (!next) {
          errors.push(`${file}: unresolved ${imported.fileName}`);
          continue;
        }
        const owner = owners.get(next);
        if (owner && owner !== entry) {
          errors.push(
            `${entry}: relative cross-entry edge to ${owner} in ${file}`
          );
          continue;
        }
        visit(next);
      }
      if (entry !== "adapter") return;
      const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      for (const statement of ast.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          statement.moduleSpecifier.text !== "@adapttable/angular/features"
        )
          continue;
        const clause = statement.importClause;
        const names = clause?.namedBindings;
        if (
          clause &&
          !clause.isTypeOnly &&
          (!names ||
            !ts.isNamedImports(names) ||
            names.elements.some((name) => !name.isTypeOnly))
        ) {
          errors.push(
            `${file}: adapter has a runtime dependency on feature factories`
          );
        }
      }
    };
    visit(join(dir, source));
  }
  return errors;
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
    if (!entry || !["root", "features", "adapter"].includes(entry)) continue;
    const names = ts.isImportDeclaration(statement)
      ? statement.importClause?.namedBindings
      : statement.exportClause;
    if (!names || (!ts.isNamedImports(names) && !ts.isNamedExports(names)))
      continue;
    for (const element of names.elements) {
      const name = element.propertyName?.text ?? element.name.text;
      const owner = expected.get(name);
      if (owner && owner !== entry) {
        errors.push(`${name}: use ${routeFor(owner)}, not ${routeFor(entry)}`);
      }
    }
  }
  return errors;
}
