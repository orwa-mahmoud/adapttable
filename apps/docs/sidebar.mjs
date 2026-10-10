/**
 * The documentation sidebar, in one place.
 *
 * `astro.config.mjs` hands this to Starlight and `scripts/check-doc-surface.mjs`
 * reads it to prove the nav and `docs/` agree in both directions: every page has
 * a way in, and every entry points at a file that exists. Both read this array,
 * so the check can never drift from what the site renders.
 */
import { ANGULAR_DOCS } from "../../scripts/angular-docs.mjs";

const primarySidebar = [
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
      { label: "Browser and server exports", slug: "exporting" },
      { label: "Excel (XLSX) export", slug: "export-xlsx" },
      { label: "PDF export and print", slug: "export-pdf" },
      { label: "Sorting", slug: "sorting" },
      { label: "Search", slug: "search" },
      { label: "Filtering", slug: "filtering" },
      { label: "Advanced AND/OR filters", slug: "filter-tree" },
      { label: "Header filters", slug: "header-filters" },
      { label: "Custom filter types", slug: "custom-filter-types" },
      { label: "Pagination", slug: "pagination" },
      { label: "Selection & bulk actions", slug: "selection" },
      { label: "Row actions", slug: "row-actions" },
      { label: "Row expansion", slug: "row-expansion" },
      { label: "Nested tables", slug: "nested-tables" },
      { label: "Inline cell editing", slug: "cell-editing" },
      { label: "Keyboard & cell navigation", slug: "cell-navigation" },
      { label: "Row reordering", slug: "row-reordering" },
      { label: "Row pinning", slug: "row-pinning" },
      { label: "Pinned summary rows", slug: "pinned-summary-rows" },
      { label: "Row and column spanning", slug: "row-spanning" },
      { label: "Full-width and separator rows", slug: "full-width-rows" },
      { label: "Row styling and heights", slug: "row-styling" },
      { label: "Row grouping", slug: "row-grouping" },
      { label: "Aggregation", slug: "aggregation" },
      { label: "Pivot tables", slug: "pivot" },
      { label: "Formulas", slug: "formulas" },
      { label: "Server queries", slug: "server-queries" },
      { label: "Tree data", slug: "tree-data" },
      { label: "Column management", slug: "column-management" },
      { label: "Saved views", slug: "saved-views" },
      { label: "Toolbar & view controls", slug: "toolbar-and-view-controls" },
      { label: "Command palette & menus", slug: "command-palette" },
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
      { label: "Headless rendering", slug: "headless" },
      { label: "Custom data source", slug: "custom-table-source" },
      { label: "Build an adapter", slug: "building-an-adapter" },
      { label: "i18n & RTL", slug: "i18n-rtl" },
      { label: "Accessibility", slug: "accessibility" },
      { label: "Realtime", slug: "realtime" },
      { label: "Adaptive capabilities", slug: "agent-capabilities" },
      { label: "@adapttable/ai", slug: "ai" },
      { label: "Agent integrations", slug: "ai-integrations" },
      { label: "Connect a backend", slug: "ai-http" },
      { label: "Voice input", slug: "ai-voice" },
    ],
  },
  {
    label: "Reference",
    items: [
      { label: "API reference", slug: "api" },
      { label: "FAQ", slug: "faq" },
      { label: "Limitations and boundaries", slug: "limitations" },
      { label: "Comparison", slug: "comparison" },
      { label: "Versioning & stability", slug: "versioning" },
    ],
  },
  {
    label: "Migrating",
    items: [
      {
        label: "From AdaptTable v2",
        slug: "migrate-from-v2",
      },
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

const angularSources = new Set(ANGULAR_DOCS);

export const sidebar = [
  {
    label: "Vue (experimental)",
    items: [
      { label: "Get started with Vue", slug: "vue/getting-started" },
      {
        label: "UI kits",
        items: [
          { label: "Element Plus", slug: "vue/element-plus" },
          { label: "Naive UI", slug: "vue/naive-ui" },
          { label: "Nuxt UI", slug: "vue/nuxt-ui" },
          { label: "Quasar", slug: "vue/quasar" },
          { label: "Reka UI", slug: "vue/reka-ui" },
          { label: "shadcn-vue", slug: "vue/shadcn-vue" },
          { label: "Vuetify", slug: "vue/vuetify" },
        ],
      },
      { label: "Vue feature composition", slug: "vue/features" },
      { label: "Vue actions and exports", slug: "vue/actions" },
      { label: "Vue column menu", slug: "vue/column-menu" },
      { label: "Vue navigation, find and status", slug: "vue/navigation" },
      { label: "Vue specialized data views", slug: "vue/specialized" },
      { label: "Vue summaries and footers", slug: "vue/summary-row" },
      { label: "Vue API reference", slug: "vue/api" },
      { label: "Vue assistant and approvals", slug: "vue/assistant" },
    ],
  },
  ...primarySidebar,
  {
    label: "Angular",
    items: [
      { label: "Migrate to Angular 0.5", slug: "angular/migrating-to-0-5" },
      {
        label: "UI kits",
        items: [
          { label: "Angular Material", slug: "angular/material" },
          { label: "ng-bootstrap", slug: "angular/ng-bootstrap" },
          { label: "Spartan", slug: "angular/spartan" },
          { label: "Taiga UI", slug: "angular/taiga-ui" },
          { label: "Angular CDK", slug: "angular/angular-cdk" },
          { label: "ngx-bootstrap", slug: "angular/ngx-bootstrap" },
          { label: "Angular Aria", slug: "angular/aria" },
        ],
      },
      ...primarySidebar
        .map((group) => ({
          label: group.label,
          items: group.items
            .filter((item) => angularSources.has(`angular/${item.slug}.md`))
            .map((item) => ({
              ...item,
              label: item.slug === "ssr-rsc" ? "SSR & hydration" : item.label,
              slug: `angular/${item.slug}`,
            })),
        }))
        .filter((group) => group.items.length > 0),
    ],
  },
];

/** @typedef {{ label: string, slug: string }} SidebarPage */
/** @typedef {{ label: string, items: readonly SidebarItem[] }} SidebarGroup */
/** @typedef {SidebarPage | SidebarGroup} SidebarItem */

/**
 * Every leaf with its nearest group, at any nesting depth.
 * @param {readonly SidebarItem[]} [items]
 * @param {string} [group]
 * @returns {(SidebarPage & { group: string })[]}
 */
export function sidebarPages(items = sidebar, group = "") {
  return items.flatMap((item) =>
    "items" in item
      ? sidebarPages(item.items, item.label)
      : [{ ...item, group }]
  );
}

/**
 * Every canonical source slug the sidebar links, flattened recursively.
 * @param {readonly SidebarItem[]} [items]
 * @returns {string[]}
 */
export function sidebarSlugs(items = sidebar) {
  return sidebarPages(items).map((item) => item.slug);
}
