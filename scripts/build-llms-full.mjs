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

> Headless, UI-agnostic React data table with ready adapters for Mantine, MUI, Chakra, Ant Design, Radix, Base UI, shadcn/ui, and unstyled Tailwind. Unified client/server data via TableSource, URL-synced state, column management (show/hide, reorder, pin left/right, resize, density), responsive mobile cards, optional row/card virtualization, provider-native filter popovers/drawers with chips, numeric/date/status filters, i18n + RTL (logical pinning — works in Arabic/Hebrew), dark mode. MIT.

`;

/** Docs in reading order. Each file's own H1 is kept as the section break. */
const DOCS = [
  "getting-started.md",
  "concepts.md",
  "data-tiers.md",
  "columns.md",
  "sorting.md",
  "filtering.md",
  "pagination.md",
  "selection.md",
  "row-expansion.md",
  "column-management.md",
  "saved-views.md",
  "virtualization.md",
  "url-state.md",
  "customization.md",
  "i18n-rtl.md",
  "api.md",
  "faq.md",
  "comparison.md",
  "migrate-from-mantine-datatable.md",
  "migrate-from-mui-x-datagrid.md",
  "migrate-from-tanstack-table.md",
  "migrate-from-mui-datatables.md",
  "migrate-from-material-table.md",
  "migrate-from-ag-grid.md",
  "versioning.md",
];

/** Rebuild `<repoRoot>/llms-full.txt` from `<repoRoot>/docs`. */
export function buildLlmsFull(repoRoot) {
  const docsDir = join(repoRoot, "docs");
  const listed = new Set(DOCS);
  const unlisted = readdirSync(docsDir).filter(
    (file) => file.endsWith(".md") && !listed.has(file)
  );
  if (unlisted.length > 0) {
    console.warn(
      `build-llms-full: docs missing from the DOCS reading order — add them: ${unlisted.join(", ")}`
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
