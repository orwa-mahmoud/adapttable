#!/usr/bin/env node
/**
 * Regenerate `llms-full.txt` by concatenating the markdown docs, so the
 * LLM-facing "all docs in one file" can never drift from `docs/`.
 *
 * Runs automatically inside the docs build (apps/docs/sync-docs.mjs) and
 * standalone via `node scripts/build-llms-full.mjs`.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HEADER = `# AdaptTable — full documentation

> AdaptTable v3 documentation: a framework-neutral data engine in @adapttable/core, headless React bindings in @adapttable/react, and native table adapters for Mantine, MUI, Chakra UI, Ant Design, Radix Themes, Base UI, shadcn/ui and unstyled Tailwind. Individually imported features include filtering, grouping, pivot tables, formulas, editing, virtualization and export. Responsive mobile cards, URL state, i18n/RTL and optional provider-neutral AI sessions. MIT licensed; applications own data and persistence.

Start with getting-started and concepts for package ownership, then features for opt-in composition. Use the v2-to-v3 migration guide when upgrading; historical migration examples describe their named versions, not current import paths. Vue and Angular bindings are not shipped. This file is generated from the canonical guides; the linked index is at https://orwa-mahmoud.github.io/adapttable/llms.txt.

`;

/** Docs in reading order. Each file's own H1 is kept as the section break. */
export const DOCS = [
  "getting-started.md",
  "concepts.md",
  "features.md",
  "data-tiers.md",
  "columns.md",
  "column-groups.md",
  "sparkline.md",
  "sorting.md",
  "filtering.md",
  "filter-tree.md",
  "pagination.md",
  "selection.md",
  "row-expansion.md",
  "cell-editing.md",
  "row-reordering.md",
  "row-pinning.md",
  "pinned-summary-rows.md",
  "row-spanning.md",
  "full-width-rows.md",
  "row-styling.md",
  "cell-navigation.md",
  "row-grouping.md",
  "pivot.md",
  "formulas.md",
  "tree-data.md",
  "column-management.md",
  "saved-views.md",
  "virtualization.md",
  "mobile.md",
  "url-state.md",
  "exporting.md",
  "export-pdf.md",
  "ssr-rsc.md",
  "server-queries.md",
  "agent-capabilities.md",
  "ai.md",
  "ai-integrations.md",
  "ai-http.md",
  "customization.md",
  "i18n-rtl.md",
  "accessibility.md",
  "realtime.md",
  "api.md",
  "faq.md",
  "limitations.md",
  "comparison.md",
  "migrate-from-mantine-datatable.md",
  "migrate-from-mui-x-datagrid.md",
  "migrate-from-tanstack-table.md",
  "migrate-from-mui-datatables.md",
  "migrate-from-material-table.md",
  "migrate-from-ag-grid.md",
  "migrate-from-v2.md",
  "migrate-from-v1.md",
  "versioning.md",
];

/**
 * Docs pages that exist on disk but are missing from {@link DOCS}.
 *
 * The reading order is the third registration a guide needs, after its
 * title and description. A warning here is how a page shipped in the
 * sidebar and `llms.txt` while staying out of `llms-full.txt`.
 */
export function unlistedDocs(docsDir) {
  const listed = new Set(DOCS);
  return readdirSync(docsDir)
    .filter((file) => file.endsWith(".md") && !listed.has(file))
    .sort();
}

/** Rebuild `<repoRoot>/llms-full.txt` from `<repoRoot>/docs`. */
export function buildLlmsFull(repoRoot) {
  const docsDir = join(repoRoot, "docs");
  const unlisted = unlistedDocs(docsDir);
  if (unlisted.length > 0) {
    throw new Error(
      `docs missing from the DOCS reading order — add them: ${unlisted.join(", ")}`
    );
  }
  const sections = DOCS.map((name) =>
    readFileSync(join(docsDir, name), "utf8").trim()
  );
  writeFileSync(
    join(repoRoot, "llms-full.txt"),
    `${HEADER}\n---\n\n${sections.join("\n\n---\n\n")}\n`
  );
  return DOCS.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const count = buildLlmsFull(process.cwd());
  console.log(`llms-full.txt rebuilt from ${count} docs.`);
}
