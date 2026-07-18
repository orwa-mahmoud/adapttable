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

const TITLES = {
  "getting-started.md":
    "Get started with AdaptTable — React table for your UI kit",
  "concepts.md": "AdaptTable concepts — headless core, TableSource, adapters",
  "columns.md": "React table columns — ColumnDef, sort, pin, custom cells",
  "sorting.md": "React table sorting — single, multi-column, server-side",
  "filtering.md": "React table filters — chips, operators, URL-synced state",
  "pagination.md":
    "React table pagination — paged, infinite scroll, auto by device",
  "selection.md": "React table row selection & bulk actions",
  "row-expansion.md": "React table expandable rows & detail panels",
  "column-management.md":
    "React table column management — show/hide, reorder, pin, resize",
  "saved-views.md": "React table saved views — shareable named layouts",
  "virtualization.md": "React table virtualization — 10k rows, ~24 DOM nodes",
  "data-tiers.md": "Client & server React table data — one TableSource API",
  "customization.md":
    "Customize AdaptTable — slots, classNames, headless prop-getters",
  "url-state.md": "React table URL state — shareable filters, sort, and page",
  "i18n-rtl.md": "React table i18n & RTL — Arabic, Hebrew, 10 locales",
  "api.md": "AdaptTable API reference — DataTable, columns, hooks",
  "faq.md": "AdaptTable FAQ — free MUI X / ag-Grid alternative, RTL, SSR",
  "comparison.md":
    "React data table comparison — AdaptTable vs ag-Grid, MUI X, TanStack",
  "migrate-from-mantine-datatable.md":
    "mantine-datatable alternative — same Mantine, more built-in",
  "migrate-from-mui-x-datagrid.md":
    "MUI X DataGrid alternative — Pro features, MIT, real MUI",
  "migrate-from-tanstack-table.md":
    "TanStack Table alternative — headless + ready UI kits",
  "migrate-from-mui-datatables.md":
    "mui-datatables alternative — maintained, MUI v6+, React 19",
  "migrate-from-material-table.md":
    "material-table alternative — modern MUI, still MIT",
  "migrate-from-ag-grid.md":
    "ag-Grid alternative for CRUD — lighter, native UI kits, MIT",
  "versioning.md": "AdaptTable versioning & stability policy",
};

// Per-page meta descriptions — the SERP snippet + og:description Starlight
// emits from `description`. Keyword-rich and unique per page so search and
// answer engines have something better than a generic site default.
const DESCRIPTIONS = {
  "getting-started.md":
    "Install AdaptTable for Mantine, MUI, Chakra, Ant, Radix, Base UI or shadcn — npx @adapttable/cli init, or open a StackBlitz starter and ship a full React data table in minutes.",
  "concepts.md":
    "How AdaptTable works: one headless core, a TableSource data contract, and adapters that mount real Mantine/MUI/Chakra/Ant/Radix/Base UI/shadcn components — not a re-skin.",
  "columns.md":
    "Define React table columns once with ColumnDef — accessors, sorting, per-column filters, alignment, pinning and custom cells — same API across every UI kit.",
  "sorting.md":
    "React table sorting with single or multi-column sort, custom comparators, server-side sortBy and accessible aria-sort headers — URL-synced when you want it.",
  "filtering.md":
    "Need real React table filters without wiring every widget? AdaptTable ships text, select, number and date-range operators with removable chips and URL-synced state — native per UI kit.",
  "pagination.md":
    "React table pagination that matches the device: numbered pages on desktop, infinite scroll on mobile (or force either). Server-side paging and shareable URL state included.",
  "selection.md":
    "Row selection and bulk actions for React CRUD tables — select a page or every match across pages, with an injectable confirm dialog and kit-native checkboxes.",
  "row-expansion.md":
    "Expandable rows for React data tables — per-row detail panels with accessible toggles and keyboard support, on the same API across every UI kit adapter.",
  "column-management.md":
    "Show/hide, reorder, pin and resize React table columns with a built-in Columns menu and URL-persisted layout — MIT, no Pro tier.",
  "saved-views.md":
    "Save filters, sort and column layout as named React table views users can restore and share by URL — built into AdaptTable across every adapter.",
  "virtualization.md":
    "React table virtualization measured: 10,000 rows mount ~24 DOM nodes. Opt-in row and card windowing for large lists — free under MIT.",
  "data-tiers.md":
    "One React table API for in-memory rows and server-paginated APIs. Swap client data for a fetch function without rewriting the UI — TableSource is the contract.",
  "customization.md":
    "Customize AdaptTable from props to fully headless: slots, classNames, data-* hooks, custom toolbars and TanStack-style prop-getters — no ejecting from the engine.",
  "url-state.md":
    "Want shareable React table links? Search, filters, sort and page sync to the URL (History, Next.js, react-router). Refresh-safe and SSR-friendly.",
  "i18n-rtl.md":
    "React table with first-class RTL/Arabic: locale presets, per-locale column paths, logical pinning and mirrored layout — not just translated strings.",
  "api.md":
    "Complete AdaptTable API reference — DataTable props, ColumnDef, filters, source builders, prop-getters and the headless useDataTable hook for React.",
  "faq.md":
    "AdaptTable FAQ: free MIT alternative to MUI X DataGrid and ag-Grid, URL state, RTL/Arabic, client+server data, bundle size, and when to stay on TanStack.",
  "comparison.md":
    "Choosing a React data table? Feature-by-feature AdaptTable vs ag-Grid, MUI X DataGrid and TanStack Table — native UI-kit adapters, a headless core and an MIT license.",
  "migrate-from-mantine-datatable.md":
    "Need more than mantine-datatable? @adapttable/mantine keeps real Mantine components and adds URL-synced state, filter chips, column management, saved views and virtualization. Prop-by-prop migration map.",
  "migrate-from-mui-x-datagrid.md":
    "Looking past MUI X Pro pricing? @adapttable/mui keeps real Material UI components and ships pinning, virtualization, multi-filter and more under MIT — plus URL-synced state. Migration map inside.",
  "migrate-from-tanstack-table.md":
    "Love TanStack's headless model but tired of rebuilding filters, toolbars, pagination and URL sync? AdaptTable keeps prop-getters and ships native adapters for eight React UI kits. Migration map inside.",
  "migrate-from-mui-datatables.md":
    "mui-datatables is unmaintained since Jan 2023 and stuck on MUI v5. @adapttable/mui maps columns and onTableChange to one query callback — MUI v6+ and React 19 ready. Migration guide inside.",
  "migrate-from-material-table.md":
    "material-table is MUI v4-era and dormant. @adapttable/mui maps columns, remote data, actions and filters to a maintained Material UI table — plus what genuinely doesn't map.",
  "migrate-from-ag-grid.md":
    "Shipping CRUD tables, not analytics grids? AdaptTable is ~300 kB lighter, renders your kit's real components, and includes URL state and filter UI under MIT — plus when to stay on AG Grid.",
  "versioning.md":
    "AdaptTable's versioning and stability policy — semantic versioning, the committed-stable public API surface, deprecation policy and independent per-package releases.",
};

const SITE = "https://orwa-mahmoud.github.io/adapttable";

// Flatten an answer's markdown to plain text for FAQPage structured data.
function mdToText(md) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
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
