/**
 * The documentation sidebar, in one place.
 *
 * `astro.config.mjs` hands this to Starlight and `scripts/check-doc-surface.mjs`
 * reads it to prove the nav and `docs/` agree in both directions: every page has
 * a way in, and every entry points at a file that exists. Both read this array,
 * so the check can never drift from what the site renders.
 */
export const sidebar = [
  {
    label: "Start",
    items: [
      { label: "Getting started", slug: "getting-started" },
      { label: "Concepts", slug: "concepts" },
      { label: "Data tiers", slug: "data-tiers" },
    ],
  },
  {
    label: "Features",
    items: [
      { label: "Feature composition", slug: "features" },
      { label: "Columns", slug: "columns" },
      { label: "Column groups", slug: "column-groups" },
      { label: "Sparkline columns", slug: "sparkline" },
      { label: "PDF export and print", slug: "export-pdf" },
      { label: "Sorting", slug: "sorting" },
      { label: "Filtering", slug: "filtering" },
      { label: "Advanced AND/OR filters", slug: "filter-tree" },
      { label: "Pagination", slug: "pagination" },
      { label: "Selection & bulk actions", slug: "selection" },
      { label: "Row expansion", slug: "row-expansion" },
      { label: "Inline cell editing", slug: "cell-editing" },
      { label: "Keyboard & cell navigation", slug: "cell-navigation" },
      { label: "Row reordering", slug: "row-reordering" },
      { label: "Row pinning", slug: "row-pinning" },
      { label: "Row and column spanning", slug: "row-spanning" },
      { label: "Full-width and separator rows", slug: "full-width-rows" },
      { label: "Row styling and heights", slug: "row-styling" },
      { label: "Row grouping", slug: "row-grouping" },
      { label: "Pivot tables", slug: "pivot" },
      { label: "Formulas", slug: "formulas" },
      { label: "Server queries", slug: "server-queries" },
      { label: "Tree data", slug: "tree-data" },
      { label: "Column management", slug: "column-management" },
      { label: "Saved views", slug: "saved-views" },
      { label: "Virtualization", slug: "virtualization" },
      { label: "Mobile cards", slug: "mobile" },
    ],
  },
  {
    label: "Beyond the table",
    items: [
      { label: "URL state", slug: "url-state" },
      { label: "SSR & RSC", slug: "ssr-rsc" },
      { label: "Customization", slug: "customization" },
      { label: "i18n & RTL", slug: "i18n-rtl" },
      { label: "Accessibility", slug: "accessibility" },
      { label: "Realtime", slug: "realtime" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "API reference", slug: "api" },
      { label: "FAQ", slug: "faq" },
      { label: "Comparison", slug: "comparison" },
      { label: "Versioning & stability", slug: "versioning" },
    ],
  },
  {
    label: "Migrating",
    items: [
      {
        label: "From AdaptTable v1",
        slug: "migrate-from-v1",
      },
      {
        label: "From mantine-datatable",
        slug: "migrate-from-mantine-datatable",
      },
      {
        label: "From MUI X DataGrid",
        slug: "migrate-from-mui-x-datagrid",
      },
      {
        label: "From TanStack Table",
        slug: "migrate-from-tanstack-table",
      },
      {
        label: "From mui-datatables",
        slug: "migrate-from-mui-datatables",
      },
      {
        label: "From material-table",
        slug: "migrate-from-material-table",
      },
      {
        label: "From ag-Grid",
        slug: "migrate-from-ag-grid",
      },
    ],
  },
];

/** Every slug the sidebar links, flattened across groups. */
export function sidebarSlugs() {
  return sidebar.flatMap((group) => group.items.map((item) => item.slug));
}
