/**
 * Copy the repo's canonical docs/*.md into Starlight's content collection,
 * injecting the frontmatter Starlight requires. The repo docs stay the
 * single source of truth; this runs before every dev/build.
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLlmsFull } from "../../scripts/build-llms-full.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const source = join(here, "../../docs");
const target = join(here, "src/content/docs");

/**
 * Each page's `<title>`, keyed by its markdown file.
 *
 * A page with no entry here falls back to its own filename, so `filter-tree.md`
 * ships as "filter-tree | AdaptTable" — a title that describes nothing and wins
 * no search. `scripts/check-doc-surface.mjs` imports this map and fails when a
 * `docs/*.md` page is missing from it, the same way it holds the sidebar and
 * `docs/` to each other.
 */
export const TITLES = {
  "getting-started.md": "Get started — a React table for your UI kit",
  "concepts.md": "Headless table engine and React binding",
  "features.md": "React table features — composable plugins",
  "columns.md": "React table columns — ColumnDef & custom cells",
  "column-groups.md": "React table column groups — collapsible headers",
  "sparkline.md": "React table sparkline columns — bar, line, area",
  "exporting.md": "React table export — browser files, server jobs",
  "export-pdf.md": "React table PDF export and print layout",
  "sorting.md": "React table sorting — multi-column, URL-synced",
  "filtering.md": "React table filtering — chips & URL-synced",
  "filter-tree.md": "React table advanced filters — AND/OR groups",
  "pagination.md": "React table pagination — paged, infinite, auto",
  "selection.md": "React table row selection & bulk actions",
  "row-expansion.md": "React table expandable rows — detail panels",
  "cell-editing.md": "React table editing — validation, batch, undo",
  "row-reordering.md": "React table row reordering — groups and trees",
  "row-pinning.md": "React table row pinning — sticky top and bottom",
  "pinned-summary-rows.md": "React table pinned summary and total rows",
  "row-spanning.md": "React table row and column spanning",
  "full-width-rows.md": "React table full-width and separator rows",
  "row-styling.md": "React table row styling and heights",
  "cell-navigation.md": "React data grid navigation, ranges and copy",
  "row-grouping.md": "React table row grouping with subtotals",
  "pivot.md": "React pivot table — rows, columns and measures",
  "formulas.md": "React table formulas — computed columns",
  "server-queries.md": "React table server queries — parse and validate",
  "agent-capabilities.md": "React table AI assistant — widgets, custom UI",
  "ai.md": "AI table API — sessions, approval and execution",
  "ai-integrations.md": "React table AI integration — OpenAI, MCP, JSON",
  "ai-http.md": "React table AI backend — HTTP and local example",
  "tree-data.md": "React table tree data — hierarchical rows",
  "column-management.md": "React table column management — pin, resize",
  "saved-views.md": "React table saved views, shareable by URL",
  "virtualization.md": "React table virtualization — rows, columns",
  "mobile.md": "Responsive React table — mobile card layout",
  "data-tiers.md": "React table data — client, server, one API",
  "customization.md": "React table customization — slots and menus",
  "url-state.md": "React table URL state — filters, sort, page",
  "ssr-rsc.md": "React table SSR & server components — Next.js",
  "i18n-rtl.md": "React table i18n & RTL — Arabic, Hebrew",
  "accessibility.md": "Accessible React data grid — keyboard, contrast",
  "realtime.md": "Realtime React data table — live row updates",
  "api.md": "AdaptTable API reference — every export",
  "faq.md": "FAQ — the free MUI X & ag-Grid alternative",
  "limitations.md": "Limitations — what AdaptTable does not do",
  "comparison.md": "React table comparison — AG Grid, TanStack, MUI",
  "migrate-from-v2.md": "AdaptTable v2 to v3 migration guide",
  "migrate-from-v1.md": "Migrate from AdaptTable v1 to v2 — every rename",
  "migrate-from-mantine-datatable.md":
    "Migrate from mantine-datatable — more built-in",
  "migrate-from-mui-x-datagrid.md": "Migrate from MUI X DataGrid to AdaptTable",
  "migrate-from-tanstack-table.md":
    "Migrate from TanStack Table — headless, UI kits",
  "migrate-from-mui-datatables.md":
    "Migrate from mui-datatables — maintained, v6+",
  "migrate-from-material-table.md":
    "Migrate from material-table — React table guide",
  "migrate-from-ag-grid.md": "Migrate from AG Grid — your UI kit, MIT",
  "versioning.md": "AdaptTable versioning & stability policy",
  "search.md": "React table search — debounced & URL-synced",
  "header-filters.md": "React table header filters — per-column funnels",
  "custom-filter-types.md": "React table custom filter types & operators",
  "nested-tables.md": "React nested tables — master/detail rows",
  "aggregation.md": "React table aggregation — totals and averages",
  "export-xlsx.md": "React table Excel export — XLSX, typed cells",
  "toolbar-and-view-controls.md": "React table toolbar — density, fullscreen",
  "command-palette.md": "React table command palette and context menu",
  "headless.md": "Headless React table with useDataTable",
  "custom-table-source.md": "React table custom data source — TableSource",
  "building-an-adapter.md": "React table adapter for any UI kit",
  "ai-voice.md": "React table voice input — dictate to the AI",
};

// Per-page meta descriptions — the SERP snippet + og:description Starlight
// emits from `description`. Keyword-rich and unique per page so search and
// answer engines have something better than a generic site default.
export const DESCRIPTIONS = {
  "getting-started.md":
    "Install AdaptTable for Mantine, MUI, Chakra, Ant, Radix, Base UI or shadcn — one CLI command, or a StackBlitz starter with no install.",
  "concepts.md":
    "Understand AdaptTable's framework-neutral core, React binding, TableSource contract and native UI adapters. Keep data ownership and optional features separate.",
  "features.md":
    "Add React table features individually or use a preset. Compose filters, editing, grouping and custom plugins without importing unused feature implementations.",
  "columns.md":
    "Define React table columns once with ColumnDef — accessors, sorting, per-column filters, alignment, pinning and custom cells — same API across every UI kit.",
  "column-groups.md":
    "Collapsible column groups for React tables — spanning headers that fold to an arrow stub, a kept child, or a cell you draw, on every UI kit adapter.",
  "sparkline.md":
    "Add bar, line and area sparklines to React table cells with optional column helpers. Render inline SVG charts without adding charts to the base table import.",
  "exporting.md":
    "Export React tables in the browser or on the server: exact-view queries, progress, cancellation, retry and accessible downloads for CSV, XLSX and PDF.",
  "export-pdf.md":
    "React table PDF export and print layout from @adapttable/core/pdf: pdfWriter() on the export button, printTable for the browser dialog, loaded on demand.",
  "sorting.md":
    "React table sorting with single or multi-column sort, custom comparators, server-side sortBy and accessible aria-sort headers — URL-synced when you want it.",
  "filtering.md":
    "Declare a filter once and AdaptTable derives the kit-native widget, the URL param, the removable chip and the row predicate.",
  "pagination.md":
    "Numbered pages on desktop, infinite scroll on mobile, or force either. Server-side paging and shareable URL state included.",
  "selection.md":
    "Row selection and bulk actions for React CRUD tables — select a page or every match across pages, with an injectable confirm dialog and kit-native checkboxes.",
  "row-expansion.md":
    "Expandable rows for React data tables — per-row detail panels with accessible toggles and keyboard support, on the same API across every UI kit adapter.",
  "cell-editing.md":
    "Build editable React tables with text, number, select and date editors, validation, batch save and undo. Your app owns persistence; adapters use native inputs.",
  "row-reordering.md":
    "Drag-and-drop row reordering for React data tables: sibling, cross-group and tree moves, confirm policy, keyboard menus, mobile controls and RTL.",
  "row-pinning.md":
    "Row pinning for React data tables — sticky top and bottom rows outside the virtual window, { top, bottom } id lists, URL-synced, mobile actions only.",
  "pinned-summary-rows.md":
    "Pin total and summary rows above or below a React data table, outside sort, filter, grouping, pagination and selection, on grouped and tree tables too.",
  "row-spanning.md":
    "Row and column spanning for React data tables — getCellSpan and column.colSpan/rowSpan emit one cell list per row so covered cells never render twice.",
  "full-width-rows.md":
    "Full-width and separator rows for React data tables — extraRows splices host-injected slots into the body by beforeRowId. Mobile cards keep the same slots.",
  "row-styling.md":
    "Conditional row styling and heights for React data tables — rowStyle and rowHeight on desktop rows and mobile cards, with a variable-height virtualizer.",
  "cell-navigation.md":
    "Navigate a React data grid by keyboard, select cell ranges and copy or paste values. Learn ARIA grid behavior, virtual row indices and screen-reader feedback.",
  "row-grouping.md":
    "Nested React table row grouping: group by one key or several, drag headers into a grouping panel, per-group aggregates, expand/collapse, client or server.",
  "column-management.md":
    "Let users rename, show, hide, reorder, pin and resize columns with native kit controls, persisted to the URL, Saved Views or localStorage.",
  "saved-views.md":
    "Save filters, sort and column layout as named React table views users can restore and share by URL — built into AdaptTable across every adapter.",
  "virtualization.md":
    "Virtualize rows, columns and mobile cards in large React tables. Configure overscan, row sizes and scrolling without rendering the entire dataset at once.",
  "mobile.md":
    "A React table that becomes a card list on phones automatically — same filters, search, selection and URL state. Tunable per column, no second layout to build.",
  "data-tiers.md":
    "One React table API for in-memory rows and server-paginated APIs. Swap client data for a fetch function without rewriting the UI — TableSource is the contract.",
  "customization.md":
    "Customize React tables with slots, classNames, renderers and prop-getters, plus context menus, command palettes and shortcuts in your UI kit's theme.",
  "url-state.md":
    "Want shareable React table links? Search, filters, sort and page sync to the URL (History, Next.js, react-router). Refresh-safe and SSR-friendly.",
  "ssr-rsc.md":
    "Render AdaptTable on the server: where the client boundary goes in the Next.js App Router, DOM-free SSR, hydration without mismatches, and Suspense.",
  "i18n-rtl.md":
    "React table with first-class RTL/Arabic: locale presets, per-locale column paths, logical pinning and mirrored layout — not just translated strings.",
  "accessibility.md":
    "Build accessible React tables with keyboard navigation, labelled controls and screen-reader feedback. Includes high-contrast and forced-colors behavior.",
  "realtime.md":
    "Update React table rows from WebSocket or SSE events with useRowPatchStream or applyRowPatches, preserving filtering, sorting, grouping and aggregates.",
  "api.md":
    "Complete AdaptTable API reference — DataTable props, ColumnDef, filters, source builders, prop-getters and the headless useDataTable hook for React.",
  "faq.md":
    "AdaptTable FAQ: free MIT alternative to MUI X DataGrid and ag-Grid, URL state, RTL/Arabic, client+server data, bundle size, and when to stay on TanStack.",
  "limitations.md":
    "What AdaptTable does not do: data ownership, formula grammar, reorder policy, virtualization, export caps, bundle size and SSR, each traced to a test.",
  "comparison.md":
    "AdaptTable against TanStack Table, ag-Grid and MUI X DataGrid, scoped to what each ships built-in: licence, size, URL state, fit.",
  "migrate-from-mantine-datatable.md":
    "@adapttable/mantine renders the same Mantine primitives, so the look barely changes — what changes is how much you wire by hand.",
  "migrate-from-mui-x-datagrid.md":
    "Map MUI X DataGrid columns, selection, editing and server data to AdaptTable. Review feature differences and migration examples for an MIT-licensed MUI table.",
  "migrate-from-tanstack-table.md":
    "TanStack Table renders nothing — no toolbar, filter inputs, pagination or URL sync. AdaptTable keeps the headless model, ships the UI.",
  "migrate-from-mui-datatables.md":
    "Move from mui-datatables to AdaptTable: map columns, filter options, selection and onTableChange to a native MUI React table with URL state.",
  "migrate-from-material-table.md":
    "Migrate material-table columns, remote queries, row actions and filters to AdaptTable. See concrete mappings and differences before changing your React table.",
  "migrate-from-ag-grid.md":
    "When to stay on AG Grid, and when not to. Pivoting, tree data, range selection and Excel export are MIT here; AG Grid keeps the integrated spreadsheet surface.",
  "versioning.md":
    "Semantic versioning in practice: the committed-stable public API surface, how deprecations are handled, per-package releases.",
  "filter-tree.md":
    "Build nested AND/OR filter groups on a React data table — grouped conditions in the Filters popover, rendered by every kit's own controls.",
  "pivot.md":
    "Turn a React data table into a pivot table — row and column dimensions with aggregated measures, in Mantine, MUI, Chakra, Ant and more.",
  "formulas.md":
    "Add spreadsheet-style computed columns to React tables with IF, ROUND, POWER and SQRT. Learn references, recalculation and explicit formula errors.",
  "server-queries.md":
    "Parse and validate AdaptTable's URL state on the server — typed queries for filtering, sorting and paging your backend can trust.",
  "agent-capabilities.md":
    "Add a native React table assistant or build your own UI with useTableAssistant. Discover active capabilities, connect a transport and govern reads and writes.",
  "ai.md":
    "Use @adapttable/ai sessions and tableAgent to validate table actions, require approval, stage edits and reject stale commands. Provider-neutral API reference.",
  "ai-integrations.md":
    "Map a live AdaptTable session onto JSON function tools, OpenAI strict tools and MCP tools/resources — no hosted service or model SDK.",
  "ai-http.md":
    "Connect a live AdaptTable to your backend: optional HTTP bridge, the request/response protocol, and a runnable OpenAI/Anthropic/Gemini/DeepSeek example.",
  "tree-data.md":
    "Render hierarchical rows in a React data table — compose tree({ getChildren }) for expandable data with keyboard access and announcements.",
  "migrate-from-v2.md":
    "Upgrade AdaptTable v2 to v3: move React hooks to @adapttable/react, replace enabling props with feature imports and check package compatibility.",
  "migrate-from-v1.md":
    "Migrate AdaptTable v1 to v2 — every rename and behavior change in one checklist, applied the same way across all eight adapters.",
  "search.md":
    "React table search with a debounced, URL-synced box: custom getSearchText, server-side q queries, mobile cards, and how search differs from find.",
  "header-filters.md":
    "Add per-column funnel filters to React table headers with headerFilters(): the same fields, chips and f_ URL params as the Filters panel. Desktop only.",
  "custom-filter-types.md":
    "Register custom React table filter types with filterTypes(): your own widget, operators, predicate, chips and URL state, sent as-is to server queries.",
  "nested-tables.md":
    "Put a full React DataTable inside an expanded row: nestedTable() gives each row its own columns, sorting and paging, plus a rowDetail fallback.",
  "aggregation.md":
    "Footer totals, group subtotals and reader-chosen Sum, Average, Min, Max or Count for a React table: aggregate(), aggregatable columns, server aggregates.",
  "export-xlsx.md":
    "Export a React table to Excel with xlsxWriter: typed numbers, dates and booleans, grouped outline levels, column widths and Node builds. No dependency.",
  "toolbar-and-view-controls.md":
    "Add a React table toolbar with density, fullscreen, print, undo/redo and export buttons, a status bar, feature notices and a docked side panel, all opt-in.",
  "command-palette.md":
    "A Cmd/Ctrl+K command palette and right-click context menus for React tables: built-in and custom commands, header and cell menus, keyboard and touch.",
  "headless.md":
    "Build a headless React table with useDataTable: prop-getters for ARIA, sorting and search over any TableSource, plus mobile cards and virtualization.",
  "custom-table-source.md":
    "Build a custom TableSource for a React data table: every required field and setter, optional members, capabilities and a complete WebSocket example.",
  "building-an-adapter.md":
    "Write an AdaptTable adapter for your React UI kit on @adapttable/react/adapter: the shell, Chrome + required slots, feature helpers, parts, packaging.",
  "ai-voice.md":
    "Add voice input to a React table assistant: useSpeechInput dictates into the draft through the Web Speech API or a recorded clip, with language memory.",
};

const SITE = "https://orwa-mahmoud.github.io/adapttable";

// Flatten an answer's markdown to plain text for FAQPage structured data.
function mdToText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__|[*_])([^*_]+)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse the FAQ's `## Question` sections into question/answer pairs.
function parseFaq(raw) {
  return raw
    .split(/\n## /)
    .slice(1)
    .map((part) => {
      const nl = part.indexOf("\n");
      return { q: part.slice(0, nl).trim(), a: mdToText(part.slice(nl + 1)) };
    })
    .filter(({ q, a }) => q && a);
}

function faqPage(pairs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

function breadcrumbList(title, slug) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "AdaptTable",
        item: `${SITE}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: `${SITE}/${slug}/`,
      },
    ],
  };
}

// Serialize Starlight frontmatter `head` entries. JSON-LD content is
// stringified twice: once to the LD string, once to a YAML-safe scalar.
function ldScript(obj) {
  return `  - tag: script\n    attrs:\n      type: application/ld+json\n    content: ${JSON.stringify(JSON.stringify(obj))}`;
}
function metaEntry(key, name, content) {
  return `  - tag: meta\n    attrs:\n      ${key}: ${JSON.stringify(name)}\n      content: ${JSON.stringify(content)}`;
}
function headBlock(entries) {
  if (!entries.length) return "";
  return `head:\n${entries.join("\n")}\n`;
}

function syncDocs() {
  mkdirSync(target, { recursive: true });
  for (const file of readdirSync(source)) {
    if (!file.endsWith(".md")) continue;
    const raw = readFileSync(join(source, file), "utf8");
    // Drop the H1 (Starlight renders the frontmatter title) and rewrite
    // repo-relative links into their site equivalents: doc-to-doc .md links
    // become page routes (anchors preserved), repo files point at GitHub.
    const body = raw
      .replace(/^# .*\n/, "")
      .replace(
        /\((?:\.\/)?([a-z0-9-]+)\.md(#[a-z0-9-]+)?\)/g,
        "(/adapttable/$1/$2)"
      )
      .replace(
        /\(\.\.\/([^)]+)\)/g,
        "(https://github.com/orwa-mahmoud/adapttable/blob/main/$1)"
      );
    const title = TITLES[file] ?? file.replace(/\.md$/, "");
    const description = DESCRIPTIONS[file];
    const slug = file.replace(/\.md$/, "");

    // Structured data: a BreadcrumbList on every page, plus FAQPage on the FAQ
    // so its Q&As are eligible for Google rich results.
    const jsonLd = [breadcrumbList(title, slug)];
    if (file === "faq.md") jsonLd.push(faqPage(parseFaq(raw)));

    // Per-page social-share card (generated under public/og/<slug>.png).
    const ogImage = `${SITE}/og/${slug}.png`;
    const head = [
      ...jsonLd.map(ldScript),
      metaEntry("property", "og:image", ogImage),
      metaEntry("name", "twitter:image", ogImage),
    ];

    const fm = [`title: ${JSON.stringify(title)}`];
    if (description) fm.push(`description: ${JSON.stringify(description)}`);
    const frontmatter = `---\n${fm.join("\n")}\n${headBlock(head)}---\n\n`;
    writeFileSync(join(target, file), `${frontmatter}${body}`);
  }
  // LLM-search surface (llmstxt.org): /llms.txt is the index, /llms-full.txt
  // the whole documentation in one file. Tools like Perplexity/ChatGPT
  // search fetch these from the site root, so they ship with every deploy.
  // llms-full.txt is regenerated from docs/ right here so it can never go
  // stale; llms.txt is the hand-written root index, copied verbatim.
  const pub = join(here, "public");
  mkdirSync(pub, { recursive: true });
  buildLlmsFull(repoRoot);
  copyFileSync(join(repoRoot, "llms-full.txt"), join(pub, "llms-full.txt"));
  const llmsIndex = readFileSync(join(repoRoot, "llms.txt"), "utf8");
  const unlinked = readdirSync(source).filter(
    (file) =>
      file.endsWith(".md") &&
      !llmsIndex.includes(`/adapttable/${file.replace(/\.md$/, "")}/`)
  );
  if (unlinked.length > 0) {
    console.warn(
      `sync-docs: llms.txt has no link for: ${unlinked.join(", ")} — add them to the root llms.txt Docs list`
    );
  }
  copyFileSync(join(repoRoot, "llms.txt"), join(pub, "llms.txt"));
  console.log("docs synced into Starlight");
}

// The docs build runs this as a script; the doc-surface gate imports it for
// TITLES alone, and importing must not write into the content collection.
if (process.argv[1] === fileURLToPath(import.meta.url)) syncDocs();
