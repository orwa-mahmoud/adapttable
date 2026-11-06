/**
 * Binding implementation imports of a focused core value use that door.
 *
 * A value published by exactly one of engine, grouping, editing, or
 * selection is imported or re-exported from that subpath. Type-only
 * imports stay on the root. A name the root alone publishes, or that
 * more than one door publishes, stays on the root.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DOORS = ["editing", "engine", "grouping", "selection"];
const BINDINGS = [
  "packages/react/react",
  "packages/angular/angular",
  "packages/vue/vue",
];

/**
 * @param {Map<string, string>} owner
 * @param {Set<string>} shared
 * @param {string} door
 * @param {string} name
 */
function rememberValue(owner, shared, door, name) {
  const current = owner.get(name);
  if (current === undefined) owner.set(name, door);
  else if (current !== door) {
    owner.delete(name);
    shared.add(name);
  }
}

/**
 * @param {import("typescript").Statement} statement
 */
function valueExportElements(statement) {
  if (
    !ts.isExportDeclaration(statement) ||
    statement.isTypeOnly ||
    statement.exportClause === undefined ||
    !ts.isNamedExports(statement.exportClause)
  ) {
    return undefined;
  }
  return statement.exportClause.elements.filter((element) => !element.isTypeOnly);
}

/** @param {string} file */
export function focusedValueDoors(file = join(ROOT, "packages/shared/core/src")) {
  /** @type {Map<string, string>} */
  const owner = new Map();
  /** @type {Set<string>} */
  const shared = new Set();
  for (const door of DOORS) {
    const source = ts.createSourceFile(
      `${door}.ts`,
      readFileSync(join(file, `${door}.ts`), "utf8"),
      ts.ScriptTarget.Latest,
      true
    );
    for (const statement of source.statements) {
      const elements = valueExportElements(statement);
      if (elements === undefined) continue;
      for (const element of elements) {
        rememberValue(
          owner,
          shared,
          door,
          (element.propertyName ?? element.name).text
        );
      }
    }
  }
  for (const name of shared) owner.delete(name);
  return owner;
}

/**
 * @param {import("typescript").Statement} statement
 */
function moduleSpecifierOf(statement) {
  if (
    (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
    statement.moduleSpecifier !== undefined &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    return statement.moduleSpecifier.text;
  }
  return undefined;
}

/**
 * @param {import("typescript").Statement} statement
 */
function namedElementsOf(statement) {
  if (
    ts.isImportDeclaration(statement) &&
    statement.importClause?.namedBindings !== undefined &&
    ts.isNamedImports(statement.importClause.namedBindings)
  ) {
    return statement.importClause.namedBindings.elements;
  }
  if (
    ts.isExportDeclaration(statement) &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
  ) {
    return statement.exportClause.elements;
  }
  return undefined;
}

/**
 * @param {string} text
 * @param {Map<string, string>} doors
 * @param {string} [label]
 */
/**
 * @param {import("typescript").Statement} statement
 */
function isTypeOnlyStatement(statement) {
  return (
    (ts.isImportDeclaration(statement) &&
      statement.importClause?.isTypeOnly === true) ||
    (ts.isExportDeclaration(statement) && statement.isTypeOnly)
  );
}

/**
 * @param {import("typescript").Statement} statement
 * @param {Map<string, string>} doors
 * @param {string} label
 */
function violationsIn(statement, doors, label) {
  if (
    moduleSpecifierOf(statement) !== "@adapttable/core" ||
    isTypeOnlyStatement(statement)
  ) {
    return [];
  }
  const elements = namedElementsOf(statement);
  if (elements === undefined) return [];
  return elements.flatMap((element) => {
    if (element.isTypeOnly) return [];
    const imported = (element.propertyName ?? element.name).text;
    const door = doors.get(imported);
    return door === undefined
      ? []
      : [`${label}: ${imported} belongs on @adapttable/core/${door}`];
  });
}

/**
 * @param {string} text
 * @param {Map<string, string>} doors
 * @param {string} [label]
 */
export function bindingCoreImportViolations(text, doors, label = "source") {
  const source = ts.createSourceFile(
    label,
    text,
    ts.ScriptTarget.Latest,
    true
  );
  return source.statements.flatMap((statement) =>
    violationsIn(statement, doors, label)
  );
}

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "coverage") {
      continue;
    }
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

export function checkBindingCoreImports({
  root = ROOT,
  doors = focusedValueDoors(join(root, "packages/shared/core/src")),
} = {}) {
  /** @type {string[]} */
  const violations = [];
  for (const binding of BINDINGS) {
    for (const file of walk(join(root, binding), [])) {
      violations.push(
        ...bindingCoreImportViolations(
          readFileSync(file, "utf8"),
          doors,
          file.slice(root.length + 1)
        )
      );
    }
  }
  return violations;
}

function main() {
  const violations = checkBindingCoreImports();
  if (violations.length > 0) {
    console.error(
      `binding core imports: ${violations.length} focused value(s) still on the root\n`
    );
    for (const violation of violations) console.error(`  ${violation}`);
    process.exit(1);
  }
  console.log("binding core imports: focused values use their doors");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
