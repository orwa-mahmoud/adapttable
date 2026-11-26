#!/usr/bin/env node
/**
 * Removed paths stay removed.
 *
 * The major deleted the compatibility forwards. A kit `/features` barrel, a
 * Vue `/export-csv` entry, an `@deprecated` tag, or a public name from that
 * inventory is a path the major already closed. Names that moved to another
 * entry are not on this list: they are still published, from their new home.
 *
 *   node scripts/check-removed-paths.mjs
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { REPO_ROOT } from "./packages.mjs";

/** Bindings keep `/features`. A kit does not publish a second barrel. */
const FEATURES_HOME = new Set([
  "@adapttable/react",
  "@adapttable/vue",
  "@adapttable/angular",
]);

/**
 * Public names the major deleted. Each one is absent from the API reports;
 * a report that names it again is the path coming back.
 */
export const REMOVED_NAMES = [
  "CELL_NAV_LIVE",
  "DataModeProps",
  "EXPORT_LIVE",
  "FIND_LIVE",
  "FULLSCREEN_LIVE",
  "SELECTION_STATS_LIVE",
  "SHELL_LIVE_STAGE_ORDER",
  "ShellLiveStageId",
  "ToolbarChromeProps",
  "defaultPendingRows",
  "groupRowSlotKey",
  "groupingAggregateColumn",
  "groupingAggregationDefault",
  "hasActionToolbar",
  "mobileIdentityColumns",
  "moveToTopLevel",
  "noticeReorderNested",
  "pendingProposals",
  "assistantReceipt",
  "rowMoveOptions",
  "sameRows",
  "sortRows",
  "sortRowsMulti",
  "splitFilterValues",
  "standardPreset",
  "toolbarExtrasProps",
];

const SOURCE = /\.(?:ts|tsx|vue)$/;

function walk(dir, files) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "coverage" ||
      entry.name === ".sfc-types" ||
      entry.name === ".turbo"
    ) {
      continue;
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else files.push(path);
  }
}

function packageExports(pkg) {
  const exports = pkg.exports;
  if (
    exports == null ||
    typeof exports !== "object" ||
    Array.isArray(exports)
  ) {
    return [];
  }
  return Object.keys(exports);
}

const REMOVED_PATTERNS = REMOVED_NAMES.map((name) => [
  name,
  new RegExp(`\\b${name}\\b`),
]);

function entryProblems(root) {
  const problems = [];
  const files = [];
  walk(join(root, "packages"), files);
  for (const file of files) {
    if (!file.endsWith("package.json")) continue;
    const pkg = JSON.parse(readFileSync(file, "utf8"));
    const keys = packageExports(pkg);
    const who = pkg.name ?? relative(root, file);
    if (keys.includes("./features") && !FEATURES_HOME.has(pkg.name)) {
      problems.push(
        `${who} publishes ./features; a kit factory is imported from its own subpath`
      );
    }
    if (keys.includes("./export-csv")) {
      problems.push(
        `${who} publishes ./export-csv; exportCsv lives on ./export`
      );
    }
  }
  return problems;
}

function deprecatedProblems(root) {
  const problems = [];
  const files = [];
  walk(join(root, "packages"), files);
  for (const file of files) {
    if (!SOURCE.test(file)) continue;
    if (!/@deprecated\b/.test(readFileSync(file, "utf8"))) continue;
    problems.push(
      `${relative(root, file)} carries @deprecated; the major removed that path`
    );
  }
  return problems;
}

function reportProblems(root) {
  const problems = [];
  const reports = [];
  walk(join(root, "etc"), reports);
  for (const file of reports) {
    if (!file.endsWith(".api.md")) continue;
    const text = readFileSync(file, "utf8");
    for (const [name, pattern] of REMOVED_PATTERNS) {
      if (!pattern.test(text)) continue;
      problems.push(
        `${relative(root, file)} still publishes removed name ${name}`
      );
    }
  }
  return problems;
}

/**
 * @param {string} [root]
 * @returns {string[]} Problems, empty when every removed path is still gone.
 */
export function removedPathProblems(root = REPO_ROOT) {
  return [
    ...entryProblems(root),
    ...deprecatedProblems(root),
    ...reportProblems(root),
  ];
}

function main() {
  const problems = removedPathProblems();
  if (problems.length === 0) {
    console.log(
      `✓ removed paths — ${REMOVED_NAMES.length} deleted names, no kit /features barrel, no @deprecated`
    );
    return;
  }
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(`\n${problems.length} removed path(s) came back.`);
  process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
