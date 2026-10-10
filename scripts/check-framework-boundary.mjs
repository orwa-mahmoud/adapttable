#!/usr/bin/env node
/**
 * The engine/binding line — source modules and shipped neutral graphs.
 *
 * Source-listed engine modules must not import a framework directly. Shipped neutral
 * entrypoints are walked transitively through dist so a coupling through a local
 * re-export cannot hide behind `../types`.
 *
 *   node scripts/check-framework-boundary.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import {
  buildPkgDirByName,
  conditionTargets,
  hasClientDirective,
  importsOf,
  readPackageJson,
  walkGraph,
} from "./module-graph.mjs";
import {
  packageDir,
  REPO_ROOT as ROOT,
  resolvePackagePath,
} from "./packages.mjs";

const MANIFEST = join(ROOT, "scripts", "feature-classification.json");

const { frameworkBoundary } = JSON.parse(readFileSync(MANIFEST, "utf8"));
const {
  engineModules,
  forbiddenImports,
  neutralEntrypoints = [],
  forbiddenReach = [],
} = frameworkBoundary;

/** A trailing `*` is a prefix; the rest are exact. */
function buildMatchers(patterns) {
  return patterns.map((pattern) =>
    pattern.endsWith("*")
      ? (spec) => spec.startsWith(pattern.slice(0, -1))
      : (spec) => spec === pattern
  );
}

const forbiddenMatchers = buildMatchers(forbiddenImports);
const reachMatchers = buildMatchers([...forbiddenImports, ...forbiddenReach]);

function isForbidden(spec, matchers) {
  return matchers.some((matches) => matches(spec));
}

/** Inspect type syntax, not framework names in documentation or literal data. */
function declarationViolations(file) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const hits = new Set();
  function visit(node) {
    if (
      ts.isIdentifier(node) &&
      /^React(?:Node|Element|Component)/.test(node.text)
    ) {
      hits.add("React.* type name");
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      const spec = node.argument.literal.text;
      if (isForbidden(spec, reachMatchers)) hits.add(`import("${spec}")`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return [...hits];
}

function fileViolations(file, label) {
  const violations = importsOf(file)
    .filter((spec) => isForbidden(spec, reachMatchers))
    .map(
      (spec) => `${label}: ${relative(ROOT, file)} imports forbidden ${spec}`
    );
  if (hasClientDirective(file)) {
    violations.push(`${label} reaches client module ${relative(ROOT, file)}`);
  }
  if (/\.d\.(?:ts|mts|cts)$/.test(file)) {
    violations.push(
      ...declarationViolations(file).map(
        (hit) => `${label}: ${relative(ROOT, file)} ${hit}`
      )
    );
  }
  return violations;
}

/**
 * Walk one or more entry files and collect boundary violations.
 *
 * @param {object} options
 * @param {string[]} options.entryFiles
 * @param {Map<string, string>} options.pkgDirByName
 * @param {string} options.label
 */
export function checkTransitiveGraph({ entryFiles, pkgDirByName, label }) {
  const violations = [];
  const { files, externals, unresolved } = walkGraph(entryFiles, pkgDirByName);

  for (const spec of externals) {
    if (isForbidden(spec, reachMatchers)) {
      violations.push(`${label} reaches forbidden external ${spec}`);
    }
  }
  for (const spec of unresolved) {
    violations.push(`${label} has unresolved import ${spec}`);
  }
  for (const file of files) {
    violations.push(...fileViolations(file, label));
  }
  return violations;
}

export function checkSourceEngineModules({
  modules = engineModules,
  root = ROOT,
} = {}) {
  const missing = [];
  const violations = [];
  for (const relativePath of modules) {
    const file = resolvePackagePath(relativePath, root);
    if (!existsSync(file)) {
      missing.push(relativePath);
      continue;
    }
    const banned = importsOf(file).filter((spec) =>
      isForbidden(spec, forbiddenMatchers)
    );
    if (banned.length > 0) {
      violations.push({ relative: relativePath, banned: [...new Set(banned)] });
    }
  }
  return { missing, violations };
}

/** Every declared runtime and type condition of a published neutral entry. */
export function checkNeutralEntry(pkgName, subpath, pkgDirByName) {
  const label = `${pkgName}${subpath === "." ? "" : subpath.replace(/^\.\//, "/")}`;
  const dir = pkgDirByName.get(pkgName);
  if (!dir) return [`missing neutral entry ${label}`];
  const key = subpath === "." ? "." : `./${subpath.replace(/^\.\//, "")}`;
  const targets = [...conditionTargets(readPackageJson(dir).exports?.[key])];
  if (targets.length === 0) return [`missing neutral entry ${label}`];
  const violations = [];
  const entryFiles = [];
  for (const target of targets) {
    const file = join(dir, target);
    if (existsSync(file)) entryFiles.push(file);
    else violations.push(`missing neutral target ${label}: ${target}`);
  }
  return [
    ...violations,
    ...checkTransitiveGraph({ entryFiles, pkgDirByName, label }),
  ];
}

function checkNeutralEntrypoints() {
  const pkgDirByName = buildPkgDirByName();
  const violations = [];
  for (const { pkg, subpaths } of neutralEntrypoints) {
    for (const subpath of subpaths) {
      violations.push(
        ...checkNeutralEntry(`@adapttable/${pkg}`, subpath, pkgDirByName)
      );
    }
  }
  return violations;
}

export function runFrameworkBoundaryCheck() {
  const { missing, violations: sourceViolations } = checkSourceEngineModules();
  const transitiveViolations = checkNeutralEntrypoints();
  return { missing, sourceViolations, transitiveViolations };
}

function main() {
  const coreRuntime = join(packageDir("core"), "dist", "index.js");
  if (!existsSync(coreRuntime)) {
    console.error(
      "✗ not built, so the framework boundary is unproven.\n" +
        "Run `pnpm build` first — this check walks the shipped graphs."
    );
    process.exit(1);
  }

  const { missing, sourceViolations, transitiveViolations } =
    runFrameworkBoundaryCheck();
  const total =
    sourceViolations.length + missing.length + transitiveViolations.length;

  if (total === 0) {
    console.log(
      `✓ framework boundary — ${engineModules.length} engine modules, ` +
        `${neutralEntrypoints.reduce((n, e) => n + e.subpaths.length, 0)} neutral entrypoint(s), no framework reach`
    );
    process.exit(0);
  }

  for (const { relative: rel, banned } of sourceViolations) {
    console.error(
      `✗ ${rel} is engine but imports ${banned.join(", ")}\n` +
        `  Move the framework use into a binding module; keep engine code in ` +
        `frameworkBoundary.engineModules framework-neutral.`
    );
  }
  for (const rel of missing) {
    console.error(
      `✗ ${rel} is listed as engine but no longer exists\n` +
        `  Update frameworkBoundary.engineModules in the change that moved it.`
    );
  }
  for (const message of transitiveViolations) {
    console.error(`✗ ${message}`);
  }
  console.error(
    `\n${sourceViolations.length} source violation(s), ${missing.length} stale entr(ies), ` +
      `${transitiveViolations.length} transitive violation(s).`
  );
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
