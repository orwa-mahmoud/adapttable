#!/usr/bin/env node
/**
 * The engine/binding line — source modules and shipped neutral graphs.
 *
 * Source-listed engine modules must not import React directly. Shipped neutral
 * entrypoints are walked transitively through dist so a coupling through a local
 * re-export cannot hide behind `../types`.
 *
 *   node scripts/check-framework-boundary.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPkgDirByName,
  hasClientDirective,
  resolvePublishedEntry,
  walkGraph,
} from "./module-graph.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "scripts", "feature-classification.json");

const { frameworkBoundary } = JSON.parse(readFileSync(MANIFEST, "utf8"));
const {
  engineModules,
  forbiddenImports,
  neutralEntrypoints = [],
  forbiddenReach = [
    "react",
    "react-dom",
    "react-compiler-runtime",
    "@adapttable/react",
  ],
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
const reachMatchers = buildMatchers([
  ...forbiddenReach,
  "react/*",
  "react-dom/*",
  "@tanstack/react-*",
]);

function isForbidden(spec, matchers) {
  return matchers.some((matches) => matches(spec));
}

/** Every `from "…"` and `import("…")` specifier in one file. */
function specifiersOf(source) {
  const out = [];
  const re = /(?:from|import)[\s(]*["']([^"']+)["']/g;
  for (const match of source.matchAll(re)) out.push(match[1]);
  return out;
}

/** React type references inside a neutral declaration file. */
function declarationViolations(file) {
  const text = readFileSync(file, "utf8");
  const hits = [];
  if (/from\s+["']react["']/.test(text)) hits.push('imports "react"');
  if (/from\s+["']react-dom["']/.test(text)) hits.push('imports "react-dom"');
  if (/import\s*\(\s*["']react["']\s*\)/.test(text))
    hits.push('import("react")');
  if (/React(?:Node|Element|Component)/.test(text))
    hits.push("React.* type name");
  return hits;
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
    if (hasClientDirective(file)) {
      violations.push(`${label} reaches client module ${relative(ROOT, file)}`);
    }
    if (file.endsWith(".d.ts")) {
      for (const hit of declarationViolations(file)) {
        violations.push(`${label}: ${relative(ROOT, file)} ${hit}`);
      }
    }
  }
  return violations;
}

function checkSourceEngineModules() {
  const missing = [];
  const violations = [];
  for (const relativePath of engineModules) {
    const file = join(ROOT, "packages", relativePath);
    if (!existsSync(file)) {
      missing.push(relativePath);
      continue;
    }
    const banned = specifiersOf(readFileSync(file, "utf8")).filter((spec) =>
      isForbidden(spec, forbiddenMatchers)
    );
    if (banned.length > 0) {
      violations.push({ relative: relativePath, banned: [...new Set(banned)] });
    }
  }
  return { missing, violations };
}

function checkNeutralEntrypoints() {
  const pkgDirByName = buildPkgDirByName();
  const violations = [];
  for (const { pkg, subpaths } of neutralEntrypoints) {
    const pkgName = `@adapttable/${pkg}`;
    for (const subpath of subpaths) {
      const resolved = resolvePublishedEntry(pkgName, subpath, pkgDirByName);
      const label = `${pkgName}${subpath === "." ? "" : subpath.replace(/^\.\//, "/")}`;
      if (resolved.missing) {
        violations.push(`missing neutral entry ${label}`);
        continue;
      }
      let runtime = resolved.file;
      if (runtime.endsWith(".d.ts")) {
        runtime = runtime.replace(/\.d\.ts$/, ".js");
      } else if (runtime.endsWith(".d.cts")) {
        runtime = runtime.replace(/\.d\.cts$/, ".cjs");
      }
      if (!existsSync(runtime)) {
        violations.push(`missing neutral runtime for ${label}`);
        continue;
      }
      violations.push(
        ...checkTransitiveGraph({
          entryFiles: [runtime],
          pkgDirByName,
          label,
        })
      );
      const types = resolved.file.endsWith(".d.ts")
        ? resolved.file
        : runtime.replace(/\.(js|cjs|mjs)$/, ".d.ts");
      if (existsSync(types)) {
        for (const hit of declarationViolations(types)) {
          violations.push(`${label}: ${relative(ROOT, types)} ${hit}`);
        }
      }
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
        `  Move the React use into a binding module, or drop this module from ` +
        `frameworkBoundary.engineModules with the reason in the commit.`
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
