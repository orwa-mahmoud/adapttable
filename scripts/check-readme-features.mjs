#!/usr/bin/env node
/**
 * The root README and every adapter README must advertise every feature the
 * library ships.
 *
 * This exists because it failed in the worst way: cell editing, row grouping,
 * CSV export, column management, virtualization, saved views and row expansion
 * all shipped, and none of them reached a single adapter README. The lists were
 * written around 1.0 and silently froze, so npm showed a table library that
 * apparently could not edit a cell or export a row — for months, across eleven
 * published packages, while the docs site said otherwise.
 *
 * Nothing detects that. Tests pass, types check, the site builds. Only a reader
 * on npm sees it, and they leave instead of filing a bug. So the gate checks it.
 *
 * Adding a docs page for a new feature therefore fails this check until every
 * adapter README mentions it. That is the point: shipping a feature includes
 * telling people it exists.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Feature docs pages → the pattern that proves a README mentions them.
 * Keyed by the `docs/<slug>.md` page so a new feature page joins the contract
 * automatically; add its matcher here in the same commit.
 */
const FEATURES = {
  "cell-editing": /cell edit/i,
  features: /feature composition/i,
  "cell-navigation": /keyboard navigation|cell navigation/i,
  "column-groups": /column group/i,
  "column-management": /column management/i,
  filtering: /filtering/i,
  "filter-tree": /AND\/OR filter tree|filter tree/i,
  "i18n-rtl": /\bRTL\b/i,
  pagination: /paginat/i,
  "row-expansion": /row expansion/i,
  "row-grouping": /grouping/i,
  pivot: /pivot/i,
  "row-reordering": /row reorder/i,
  "row-pinning": /row pinn/i,
  "row-spanning": /row (and column )?spann|cell spann/i,
  "full-width-rows": /full-width|separator row|extraRows/i,
  "row-styling": /rowStyle|rowHeight|row styl/i,
  "export-pdf": /pdf export|print layout|pdfWriter/i,
  formulas: /formula engine|spreadsheet formula/i,
  sparkline: /sparkline/i,
  "saved-views": /saved view/i,
  "tree-data": /tree data|hierarchical rows/i,
  selection: /selection/i,
  sorting: /sorting/i,
  virtualization: /virtuali/i,
  mobile: /mobile card/i,
  "ssr-rsc": /server component/i,
  // Not its own page — documented under customization.
  "csv-export": /csv/i,
};

function isPrivatePackage(dir) {
  const pkgJson = JSON.parse(
    readFileSync(join(root, "packages", dir, "package.json"), "utf8")
  );
  return pkgJson.private === true;
}

// Adapters and core all ship the full feature set, so all of them must list
// it. `cli` and `i18n` cover different ground (scaffolding, locales) but still
// need a Features section — a package page with none tells a reader nothing.
// Unpublished (`private: true`) adapters are still in-progress and must not
// need a marketing README.
const adapters = readdirSync(join(root, "packages")).filter(
  (d) => (d.startsWith("adapter-") || d === "core") && !isPrivatePackage(d)
);
const needSectionOnly = ["cli", "i18n"];

const problems = [];

// Any feature docs page missing from the contract above is a silent gap.
const documented = readdirSync(join(root, "docs"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));
const IGNORED = new Set([
  "api",
  "columns",
  "comparison",
  "concepts",
  "customization",
  "data-tiers",
  "faq",
  "getting-started",
  // Its own package (`@adapttable/server`), not something an adapter ships —
  // every adapter README claiming it would be a promise none of them keep.
  "server-queries",
  "url-state",
  // Whole-table quality, not an opt-in feature — lives under Beyond the table.
  "accessibility",
  "realtime",
  "versioning",
]);
for (const page of documented) {
  if (page.startsWith("migrate-") || IGNORED.has(page)) continue;
  if (!(page in FEATURES)) {
    problems.push(
      `docs/${page}.md is a feature page with no entry in FEATURES — ` +
        `add its matcher to scripts/check-readme-features.mjs, then make sure ` +
        `every adapter README mentions it.`
    );
  }
}

// The root README is the first page anyone reads — GitHub, the npm org, every
// search result — and it froze the same way the adapter lists did: pivot,
// formulas, tree data, PDF export, keyboard navigation and SSR all shipped
// with a docs page and none of them reached the feature table. It is held to
// the same contract as the packages it advertises.
const readmes = [
  "README.md",
  ...adapters.map((a) => `packages/${a}/README.md`),
];

for (const relative of readmes) {
  const readme = readFileSync(join(root, relative), "utf8");
  const section = /^## Features\n([\s\S]*?)(?=^## )/m.exec(readme);

  if (!section) {
    problems.push(`${relative} has no "## Features" section.`);
    continue;
  }

  const missing = Object.entries(FEATURES)
    .filter(([, pattern]) => !pattern.test(section[1]))
    .map(([name]) => name);

  if (missing.length > 0) {
    problems.push(`${relative} does not mention: ${missing.join(", ")}`);
  }
}

for (const pkg of needSectionOnly) {
  const readme = readFileSync(join(root, "packages", pkg, "README.md"), "utf8");
  if (!/^## Features\n/m.test(readme)) {
    problems.push(`packages/${pkg}/README.md has no "## Features" section.`);
  }
}

if (problems.length > 0) {
  console.error("README feature parity check failed:\n");
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error(
    `\n${problems.length} problem(s). A feature nobody can find on npm ` +
      `is a feature that does not exist.`
  );
  process.exit(1);
}

console.log(
  `README feature parity: ${readmes.length} READMEs × ` +
    `${Object.keys(FEATURES).length} features, all present.`
);
