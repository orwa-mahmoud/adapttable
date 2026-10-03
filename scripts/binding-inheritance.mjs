/** Follow actual named binding base classes for the structural contract guards. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import ts from "typescript";

import { bindingDir, packageNameAt } from "./kits.mjs";

function parse(file) {
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
}

function relativeSource(file, specifier) {
  const path = join(dirname(file), specifier);
  return [path + ".ts", join(path, "index.ts")].find(existsSync);
}

function exportedClass(node, name) {
  return (
    ts.isClassDeclaration(node) &&
    node.name?.text === name &&
    node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  );
}

function resolveExport(node, file, name, visited) {
  if (
    !ts.isExportDeclaration(node) ||
    !node.moduleSpecifier ||
    !ts.isStringLiteral(node.moduleSpecifier)
  )
    return undefined;
  const target = relativeSource(file, node.moduleSpecifier.text);
  if (!target) return undefined;
  if (!node.exportClause) return exportedSource(target, name, visited);
  if (!ts.isNamedExports(node.exportClause)) return undefined;
  const exported = node.exportClause.elements.find(
    (element) => element.name.text === name
  );
  return exported
    ? exportedSource(
        target,
        exported.propertyName?.text ?? exported.name.text,
        visited
      )
    : undefined;
}

/** Resolve only a symbol that the binding actually exports from its main entry. */
function exportedSource(file, name, visited = new Set()) {
  const key = file + ":" + name;
  if (!existsSync(file) || visited.has(key)) return undefined;
  visited.add(key);
  for (const node of parse(file).statements) {
    if (exportedClass(node, name)) return file;
    const found = resolveExport(node, file, name, visited);
    if (found) return found;
  }
  return undefined;
}

function bindingImports(source, packageName) {
  const imports = new Map();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.moduleSpecifier.text !== packageName
    )
      continue;
    const named = node.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const element of named.elements) {
      imports.set(
        element.name.text,
        element.propertyName?.text ?? element.name.text
      );
    }
  }
  return imports;
}

function baseNames(node) {
  const clauses = (node.heritageClauses ?? []).filter(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
  );
  return clauses
    .flatMap((clause) => clause.types)
    .map((type) => type.expression)
    .filter(ts.isIdentifier)
    .map((identifier) => identifier.text);
}

/** An unused import is insufficient: only a class's extends clause follows its base. */
export function inheritedBindingSources(file, framework, root) {
  if (!file.endsWith(".ts")) return [];
  const binding = bindingDir(framework, root);
  const source = parse(file);
  const imports = bindingImports(source, packageNameAt(binding));
  const names = source.statements
    .filter(ts.isClassDeclaration)
    .flatMap(baseNames);
  const files = new Set();
  for (const name of names) {
    const exported = imports.get(name);
    if (!exported) continue;
    const base = exportedSource(join(binding, "src/index.ts"), exported);
    if (base) files.add(base);
  }
  return [...files].map((base) => ({
    file: base,
    source: readFileSync(base, "utf8"),
  }));
}
