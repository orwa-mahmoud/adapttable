#!/usr/bin/env node
/**
 * Verify v3 split-map destinations exist in built packages.
 *
 * Structural subpaths must have moved off core onto react. Representative
 * moved symbols must be nameable from their proposed destinations.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { readPackageJson } from "./module-graph.mjs";
import { packageDir } from "./packages.mjs";
import { exportedNames } from "./packed-names.mjs";

const REMOVED_CORE_SUBPATHS = ["adapter", "features", "sparkline"];
const REQUIRED_REACT_SUBPATHS = ["adapter", "features", "sparkline"];

/** `[importPath, exportName]` — must exist after the core/React split. */
const REPRESENTATIVE_DESTINATIONS = [
  ["@adapttable/react", "useDataTable"],
  ["@adapttable/react", "ColumnDef"],
  ["@adapttable/react", "useQuerySource"],
  ["@adapttable/react/adapter", "useDataTableShell"],
  ["@adapttable/react/features", "TableFeature"],
  ["@adapttable/react/sparkline", "SparklineColumnSpec"],
  ["@adapttable/core", "TableSource"],
  ["@adapttable/core", "createTableEngine"],
  ["@adapttable/core/pivot", "pivot"],
];

function pkgDir(name) {
  const short = name.replace("@adapttable/", "");
  if (["react", "core", "server", "ai"].includes(short)) {
    return packageDir(short);
  }
  return packageDir(`adapter-${short}`);
}

function subpathFile(pkgName, subpath) {
  const key = subpath === "." ? "index" : subpath.replace(/^\.\//, "");
  const base = pkgDir(pkgName);
  const manifest = readPackageJson(base);
  const exportKey = subpath === "." ? "." : `./${key}`;
  const entry = manifest.exports?.[exportKey];
  if (!entry) return null;
  const types =
    typeof entry === "string"
      ? entry.replace(/\.js$/, ".d.ts")
      : (entry.import?.types ?? entry.require?.types);
  if (!types) return null;
  return join(base, types.replace(/^\.\//, ""));
}

function parseImport(spec) {
  const scoped = spec.startsWith("@");
  const parts = spec.split("/");
  const name = parts.slice(0, scoped ? 2 : 1).join("/");
  const rest = parts.slice(scoped ? 2 : 1).join("/");
  return { name, subpath: rest ? `./${rest}` : "." };
}

const coreManifest = readPackageJson(packageDir("core"));
const reactManifest = readPackageJson(packageDir("react"));
const errors = [];

for (const sub of REMOVED_CORE_SUBPATHS) {
  if (coreManifest.exports?.[`./${sub}`]) {
    errors.push(`@adapttable/core still exports ./${sub}`);
  }
}
for (const sub of REQUIRED_REACT_SUBPATHS) {
  if (!reactManifest.exports?.[`./${sub}`]) {
    errors.push(`@adapttable/react missing ./${sub}`);
  } else {
    const dts = subpathFile("@adapttable/react", `./${sub}`);
    if (!dts || !existsSync(dts)) {
      errors.push(`@adapttable/react/${sub} has no built declaration`);
    }
  }
}

for (const [importPath, exportName] of REPRESENTATIVE_DESTINATIONS) {
  const { name, subpath } = parseImport(importPath);
  const dts = subpathFile(name, subpath);
  if (!dts || !existsSync(dts)) {
    errors.push(`${exportName} → ${importPath} (no declaration file)`);
    continue;
  }
  if (!exportedNames(readFileSync(dts, "utf8")).has(exportName)) {
    errors.push(`${exportName} missing from ${importPath}`);
  }
}

if (errors.length > 0) {
  console.error(`✗ split-map destinations:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

console.log(
  `✓ split-map destinations — ${REMOVED_CORE_SUBPATHS.length} core subpaths removed, ` +
    `${REQUIRED_REACT_SUBPATHS.length} react subpaths present, ` +
    `${REPRESENTATIVE_DESTINATIONS.length} moved symbol(s) verified`
);
