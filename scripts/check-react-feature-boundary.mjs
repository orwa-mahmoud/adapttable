#!/usr/bin/env node
/**
 * The React binding's base table names no feature.
 *
 * The base table is what a kit draws with no feature composed: the
 * composition, the desktop table, the cards, the toolbar, the pager and the
 * table hooks. Its modules may use the composition machinery that lives in
 * `src/features/` (the providers, the feature host, slot and state keys, the
 * live-stage walk and the gates) but no feature's own module: a feature
 * reaches the table through what it composes, never through an import the
 * base makes.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { REPO_ROOT } from "./packages.mjs";

/**
 * Where the base table starts, relative to the binding's `src/`: what a kit
 * draws a table with before any feature is composed.
 */
export const BASE_ROOTS = [
  "kit/desktopTable.tsx",
  "kit/mobileCards.tsx",
  "kit/pager.tsx",
  "kit/rootRegion.tsx",
  "kit/tableComposition.tsx",
  "kit/toolbar.tsx",
  "useDataTable/useDataTable.ts",
  "useDataTableShell.tsx",
  "useTableChrome.ts",
];

/** Folders that hold features' own modules. */
const FEATURE_DIRS = ["features/", "adapterFeatures/"];

/** Composition machinery in those folders that the base may use. */
export const MACHINERY = new Set([
  "adapterFeatures/featureRoot.tsx",
  "features/chromeBodyGate.tsx",
  "features/chromeExtrasGate.tsx",
  "features/featureHost.ts",
  "features/featureHostContext.tsx",
  "features/featureState.tsx",
  "features/liveStage.ts",
  "features/providers.tsx",
  "features/shellLiveGate.tsx",
  "features/shellLiveStubs.ts",
  "features/slotKeys.ts",
  "features/tableFeature.ts",
]);

/** A state key module: one shared key a feature publishes and the base reads. */
const STATE_KEY = /^features\/\w+Key\.ts$/;

const CODE = /\.tsx?$/;
const TEST = /\.test\.tsx?$|\.test-utils\.tsx?$/;

function moduleFile(base) {
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/**
 * The relative modules a file loads at run time: type-only imports and
 * exports carry no code, so they are left out; dynamic imports count.
 */
export function runtimeImports(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const out = [];
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const typeOnly =
        clause?.isTypeOnly === true ||
        (clause !== undefined &&
          clause.name === undefined &&
          named !== undefined &&
          ts.isNamedImports(named) &&
          named.elements.length > 0 &&
          named.elements.every((element) => element.isTypeOnly));
      if (!typeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
        out.push(node.moduleSpecifier.text);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (
        !node.isTypeOnly &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        out.push(node.moduleSpecifier.text);
      }
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      out.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

function rootFiles(src) {
  const out = [];
  const walk = (path) => {
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path)) walk(join(path, entry));
    } else if (CODE.test(path) && !TEST.test(path)) {
      out.push(path);
    }
  };
  for (const root of BASE_ROOTS) {
    const path = join(src, root);
    if (existsSync(path)) walk(path);
  }
  return out;
}

/** Each module the base reaches, mapped to the module that first imported it. */
function reachedFrom(src) {
  const via = new Map();
  const pending = rootFiles(src);
  for (const file of pending) via.set(file, null);
  while (pending.length > 0) {
    const file = pending.pop();
    for (const fileName of runtimeImports(file, readFileSync(file, "utf8"))) {
      if (!fileName.startsWith(".")) continue;
      const target = moduleFile(join(dirname(file), fileName));
      if (target === undefined || via.has(target)) continue;
      via.set(target, file);
      pending.push(target);
    }
  }
  return via;
}

/** Whether a module, relative to `src/`, is a feature's own. */
function isFeatureModule(path) {
  return (
    FEATURE_DIRS.some((dir) => path.startsWith(dir)) &&
    !MACHINERY.has(path) &&
    !STATE_KEY.test(path)
  );
}

/** The import chain from a base root to `file`. */
function chainTo(src, via, file) {
  const chain = [];
  for (let at = file; at !== null; at = via.get(at) ?? null) {
    chain.unshift(relative(src, at));
  }
  return chain.join(" → ");
}

/**
 * Every feature module the base table reaches, with the chain that reaches it.
 *
 * @param {string} src - The binding's `src/` folder.
 * @returns {string[]} One line per violation.
 */
export function featureBoundaryProblems(src) {
  const via = reachedFrom(src);
  return [...via.keys()]
    .filter((file) => isFeatureModule(relative(src, file)))
    .map((file) => chainTo(src, via, file))
    .sort((left, right) => left.localeCompare(right));
}

function main() {
  const src = join(REPO_ROOT, "packages", "react", "react", "src");
  const problems = featureBoundaryProblems(src);
  if (problems.length > 0) {
    console.error(
      "✗ react feature boundary — the base table imports a feature:"
    );
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    "✓ react feature boundary — the base table reaches no feature's own module"
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
