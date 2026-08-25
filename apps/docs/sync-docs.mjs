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
  "concepts.md": "AdaptTable concepts — headless core & source",
  "features.md": "Feature composition — features={[rowReorder(fn)]}",
  "columns.md": "React table columns — ColumnDef & custom cells",
  "column-groups.md":
    "React table column groups — spanning headers, collapsible",
  "sparkline.md": "React table sparkline columns — bar, line, area",
  "export-pdf.md": "React table PDF export and print layout",
  "sorting.md": "React table sorting — multi-column, URL-synced",
  "filtering.md": "React table filtering — chips & URL-synced",
  "filter-tree.md": "React table advanced filters — nested AND/OR groups",
  "pagination.md": "React table pagination — paged, infinite, auto",
  "selection.md": "React table row selection & bulk actions",
  "row-expansion.md": "React table expandable rows — detail panels",
  "cell-editing.md": "React table inline cell editing — onCellEdit",
  "row-reordering.md": "React table row reordering — drag handle",
  "row-pinning.md": "React table row pinning — sticky top and bottom",
  "row-spanning.md": "React table row and column spanning",
  "full-width-rows.md": "React table full-width and separator rows",
  "row-styling.md": "React table row styling and heights",
  "cell-navigation.md": "React table keyboard navigation — ARIA grid",
  "row-grouping.md": "React table row grouping with subtotals",
  "pivot.md": "React pivot table — rows, columns and measures",
  "formulas.md": "React table formulas — spreadsheet computed columns",
  "server-queries.md": "React table server queries — parse and validate",
  "tree-data.md": "React table tree data — hierarchical rows",
  "column-management.md": "React table column management — pin, resize",
  "saved-views.md": "React table saved views, shareable by URL",
  "virtualization.md": "React table virtualization — 50k rows, 24 nodes",
  "mobile.md": "Responsive React table — mobile card layout",
  "data-tiers.md": "React table data — client, server, one API",
  "customization.md": "Customize AdaptTable — classNames & slots",
  "url-state.md": "React table URL state — filters, sort, page",
  "ssr-rsc.md": "React table SSR & server components — Next.js",
  "i18n-rtl.md": "React table i18n & RTL — Arabic, Hebrew",
  "accessibility.md": "Accessible React data table — keyboard, screen readers",
  "realtime.md": "Realtime React data table — live row updates",
  "api.md": "AdaptTable API reference — every export",
  "faq.md": "FAQ — the free MUI X & ag-Grid alternative",
  "comparison.md": "React table comparison — AG Grid, TanStack, MUI",
  "migrate-from-v1.md": "Migrate from AdaptTable v1 to v2 — every rename",
  "migrate-from-mantine-datatable.md":
    "Migrate from mantine-datatable — more built-in",
  "migrate-from-mui-x-datagrid.md":
    "Migrate from MUI X DataGrid — Pro free (MIT)",
  "migrate-from-tanstack-table.md":
    "Migrate from TanStack Table — headless, UI kits",
  "migrate-from-mui-datatables.md":
    "Migrate from mui-datatables — maintained, v6+",
  "migrate-from-material-table.md": "Migrate from material-table — maintained",
  "migrate-from-ag-grid.md": "Migrate from AG Grid — 300 kB lighter, MIT",
  "versioning.md": "AdaptTable versioning & stability policy",
};

// Per-page meta descriptions — the SERP snippet + og:description Starlight
// emits from `description`. Keyword-rich and unique per page so search and
// answer engines have something better than a generic site default.
export const DESCRIPTIONS = {
  "getting-started.md":
    "Install AdaptTable for Mantine, MUI, Chakra, Ant, Radix, Base UI or shadcn — one CLI command, or a StackBlitz starter with no install.",
  "concepts.md":
    "One headless core, a TableSource data contract, and adapters that mount real Mantine, MUI, Chakra, Ant, Radix and shadcn components.",
  "features.md":
    "Compose AdaptTable features from kit subpath imports — features={[rowReorder(fn)]} — same runtime as the enabling props, which stay until v3.",
  "columns.md":
    "Define React table columns once with ColumnDef — accessors, sorting, per-column filters, alignment, pinning and custom cells — same API across every UI kit.",
  "column-groups.md":
    "Collapsible column groups for React tables — spanning headers that fold to an arrow stub, a kept child, or a cell you draw, on every UI kit adapter.",
  "sparkline.md":
    "Optional React table sparkline columns — bar, line and area as inline SVG from @adapttable/core/sparkline, so the base bundle never pays for charts.",
  "export-pdf.md":
    "Optional React table PDF export and print layout from @adapttable/core/pdf — pdfWriter on the export button, printTable for the browser dialog, so the base bundle never pays for a PDF writer.",
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
    "Inline cell editing for React CRUD tables — opt-in onCellEdit, text/number/select editors, keyboard commit/cancel, kit-native inputs across every adapter.",
  "row-reordering.md":
    "Row reordering for React data tables — opt-in onRowReorder, a drag handle with Space-lift keyboard, dataset-relative indices, mobile up/down. Grouping and trees refuse it.",
  "row-pinning.md":
    "Row pinning for React data tables — sticky top and bottom rows outside the virtual window, { top, bottom } id lists, URL-synced, mobile actions only.",
  "row-spanning.md":
    "Row and column spanning for React data tables — getCellSpan and column.colSpan/rowSpan emit one cell list per row so covered cells never render twice.",
  "full-width-rows.md":
    "Full-width and separator rows for React data tables — extraRows splices host-injected slots into the body by beforeRowId. Mobile cards keep the same slots.",
  "row-styling.md":
    "Conditional row styling and heights for React data tables — rowStyle and rowHeight on desktop rows and mobile cards, with a variable-height virtualizer.",
  "cell-navigation.md":
    "Arrow-key cell navigation for a React table: one tab stop, correct ARIA grid semantics, absolute row indices under virtualization, and spoken announcements.",
  "row-grouping.md":
    "Single-level React table row grouping — opt-in groupBy, per-group aggregates sharing the summaryRow mapper, expand/collapse, frontend tier only.",
  "column-management.md":
    "Let users show, hide, reorder, pin and resize columns — one prop per capability, persisted to the URL or localStorage.",
  "saved-views.md":
    "Save filters, sort and column layout as named React table views users can restore and share by URL — built into AdaptTable across every adapter.",
  "virtualization.md":
    "React table virtualization measured: 10,000 rows mount ~24 DOM nodes. Opt-in row and card windowing for large lists — free under MIT.",
  "mobile.md":
    "A React table that becomes a card list on phones automatically — same filters, search, selection and URL state. Tunable per column, no second layout to build.",
  "data-tiers.md":
    "One React table API for in-memory rows and server-paginated APIs. Swap client data for a fetch function without rewriting the UI — TableSource is the contract.",
  "customization.md":
    "Restyle parts with classNames, replace them with slots, tune the chrome with props, or theme through your kit provider. All opt-in.",
  "url-state.md":
    "Want shareable React table links? Search, filters, sort and page sync to the URL (History, Next.js, react-router). Refresh-safe and SSR-friendly.",
  "ssr-rsc.md":
    "Render AdaptTable on the server: where the client boundary goes in the Next.js App Router, DOM-free SSR, hydration without mismatches, and Suspense.",
  "i18n-rtl.md":
    "React table with first-class RTL/Arabic: locale presets, per-locale column paths, logical pinning and mirrored layout — not just translated strings.",
  "accessibility.md":
    "Accessible React data table: semantic markup, labelled controls and screen-reader announcements — on by default, no prop to turn on. Try it from the keyboard in the live demo.",
  "realtime.md":
    "Realtime React data table: patch rows as a websocket or poll delivers them with applyRowPatches, so sort, filters and selection survive. No realtime prop — you own the socket.",
  "api.md":
    "Complete AdaptTable API reference — DataTable props, ColumnDef, filters, source builders, prop-getters and the headless useDataTable hook for React.",
  "faq.md":
    "AdaptTable FAQ: free MIT alternative to MUI X DataGrid and ag-Grid, URL state, RTL/Arabic, client+server data, bundle size, and when to stay on TanStack.",
  "comparison.md":
    "AdaptTable against TanStack Table, ag-Grid and MUI X DataGrid, scoped to what each ships built-in: licence, size, URL state, fit.",
  "migrate-from-mantine-datatable.md":
    "@adapttable/mantine renders the same Mantine primitives, so the look barely changes — what changes is how much you wire by hand.",
  "migrate-from-mui-x-datagrid.md":
    "MUI X v6→v8 renamed disableSelectionOnClick and rewrote valueGetter. Every breaking change mapped to a stable API — plus Pro features free under MIT.",
  "migrate-from-tanstack-table.md":
    "TanStack Table renders nothing — no toolbar, filter inputs, pagination or URL sync. AdaptTable keeps the headless model, ships the UI.",
  "migrate-from-mui-datatables.md":
    "mui-datatables has had no releases since January 2023 and stops at MUI v5. @adapttable/mui is MUI v6+ and React 19 ready.",
  "migrate-from-material-table.md":
    "material-table has been dormant since 2020. @adapttable/mui maps its columns, remote data, actions and filters onto a live MUI table.",
  "migrate-from-ag-grid.md":
    "When to stay on AG Grid, and when not to. For CRUD tables AdaptTable is ~300 kB lighter and ships URL state and filter UI under MIT.",
  "versioning.md":
    "Semantic versioning in practice: the committed-stable public API surface, how deprecations are handled, per-package releases.",
  "filter-tree.md":
    "Build nested AND/OR filter groups on a React data table — grouped conditions in the Filters popover, rendered by every kit's own controls.",
  "pivot.md":
    "Turn a React data table into a pivot table — row and column dimensions with aggregated measures, in Mantine, MUI, Chakra, Ant and more.",
  "formulas.md":
    "Add spreadsheet-style formulas to a React table — computed columns typed at runtime, with functions, references and live recalculation.",
  "server-queries.md":
    "Parse and validate AdaptTable's URL state on the server — typed queries for filtering, sorting and paging your backend can trust.",
  "tree-data.md":
    "Render hierarchical rows in a React data table — pass getChildren for expandable tree data with keyboard access and announcements.",
  "migrate-from-v1.md":
    "Migrate AdaptTable v1 to v2 — every rename and behavior change in one checklist, applied the same way across all eight adapters.",
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
