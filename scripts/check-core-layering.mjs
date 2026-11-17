#!/usr/bin/env node
/**
 * Core → framework binding → kits and AI bindings.
 *
 * A package above a binding (one that depends on `@adapttable/react`,
 * `@adapttable/vue` or `@adapttable/angular`) neither lists
 * `@adapttable/core` in any dependency field nor imports it from any file,
 * tests and test helpers included. It reaches core through its binding.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { listPackages, REPO_ROOT } from "./packages.mjs";

const BINDINGS = [
  "@adapttable/react",
  "@adapttable/vue",
  "@adapttable/angular",
];
const CORE = "@adapttable/core";
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];
const SKIPPED_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
  ".sfc-types",
]);
const CODE_FILE = /\.(?:[cm]?[jt]sx?|vue)$/;

/** Whether a module specifier names core or one of its subpaths. */
function isCore(specifier) {
  return specifier === CORE || specifier.startsWith(`${CORE}/`);
}

/** The script blocks of a Vue SFC, or the whole file for script sources. */
function scriptsOf(file, text) {
  if (!file.endsWith(".vue")) return [text];
  return [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(
    (match) => match[1] ?? ""
  );
}

/** Every module specifier a source imports, re-exports, requires or loads. */
export function importedSpecifiers(file, text) {
  const specifiers = [];
  for (const script of scriptsOf(file, text)) {
    const source = ts.createSourceFile(
      file,
      script,
      ts.ScriptTarget.Latest,
      false,
      file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );
    const visit = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specifiers.push(node.moduleSpecifier.text);
      } else if (
        ts.isCallExpression(node) &&
        node.arguments.length > 0 &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        specifiers.push(node.arguments[0].text);
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      ) {
        specifiers.push(node.argument.literal.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return specifiers;
}

function codeFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) codeFiles(join(dir, entry.name), out);
    } else if (CODE_FILE.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function manifestOf(dir) {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

/** Every dependency name a manifest declares, with its field. */
function declaredDependencies(manifest) {
  return DEPENDENCY_FIELDS.flatMap((field) =>
    Object.keys(manifest[field] ?? {}).map((name) => ({ field, name }))
  );
}

/** Each file of `dir` that imports core, with what it imports. */
function coreImportsIn(root, dir, label) {
  return codeFiles(dir).flatMap((file) =>
    importedSpecifiers(file, readFileSync(file, "utf8"))
      .filter(isCore)
      .map(
        (specifier) => `${label}: ${relative(root, file)} imports ${specifier}`
      )
  );
}

/**
 * Every place a package above a binding reaches core directly.
 *
 * @param {string} root - The repository root.
 * @returns {string[]} One line per dependency field or import, empty when clean.
 */
export function coreLayeringProblems(root = REPO_ROOT) {
  return listPackages(root).flatMap(({ dir }) => {
    const manifest = manifestOf(dir);
    const declared = declaredDependencies(manifest);
    const aboveBinding =
      !BINDINGS.includes(manifest.name) &&
      declared.some(({ name }) => BINDINGS.includes(name));
    if (!aboveBinding) return [];
    return [
      ...declared
        .filter(({ name }) => name === CORE)
        .map(({ field }) => `${manifest.name}: lists ${CORE} in ${field}`),
      ...coreImportsIn(root, dir, manifest.name),
    ];
  });
}

function main() {
  const problems = coreLayeringProblems();
  if (problems.length > 0) {
    console.error(
      `\n✗ core layering: ${problems.length} place(s) above a binding reach core directly:\n`
    );
    for (const problem of problems) console.error(`  ${problem}`);
    console.error(
      "\n  Import the name from the framework binding (add the re-export there when it is missing) and drop the core dependency."
    );
    process.exit(1);
  }
  console.log(
    "✓ core layering — every kit and AI binding reaches core only through its framework binding"
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
