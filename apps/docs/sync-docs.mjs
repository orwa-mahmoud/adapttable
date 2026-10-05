/**
 * Copy the repo's canonical docs/*.md into Starlight's content collection,
 * injecting the frontmatter Starlight requires. The repo docs stay the
 * single source of truth; this runs before every dev/build.
 */
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

import { buildLlmsFull } from "../../scripts/build-llms-full.mjs";
import { docLinkTarget, docsFiles } from "../../scripts/docs-files.mjs";
import {
  docsReferenceRoute,
  docsRoute,
  docsSlug,
  siteUrl,
} from "../../scripts/site.mjs";

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
  "vue/actions.md": "Vue actions and exports",
  "vue/column-menu.md": "Vue column menu",
  "vue/navigation.md": "Vue navigation, find and status",
  "vue/specialized.md": "Vue specialized data views",
  "vue/summary-row.md": "Vue summaries and footers",
  "vue/getting-started.md": "Get started with experimental Vue tables",
  "vue/api.md": "Experimental Vue table API reference",
  "vue/assistant.md": "Vue assistant and approvals",
  "vue/features.md": "Vue filters, editing and feature composition",
  "angular/angular-cdk.md": "Angular CDK tables",
  "angular/aria.md": "Angular Aria tables",
  "angular/material.md": "Angular Material tables",
  "angular/ng-bootstrap.md": "ng-bootstrap Angular tables",
  "angular/ngx-bootstrap.md": "ngx-bootstrap Angular tables",
  "angular/spartan.md": "Spartan Angular tables",
  "angular/taiga-ui.md": "Taiga UI Angular tables",
  "angular/getting-started.md": "Get started with Angular tables",
  "angular/features.md": "Angular table features and presets",
  "angular/data-tiers.md": "Angular table data — client and server",
  "angular/headless.md": "Headless Angular tables with signals",
  "angular/custom-table-source.md": "Angular custom table sources",
  "angular/building-an-adapter.md": "Build an Angular table adapter",
  "angular/columns.md": "Angular columns and cell templates",
  "angular/column-groups.md": "Angular collapsible column groups",
  "angular/sparkline.md": "Angular sparkline columns",
  "angular/sorting.md": "Angular table sorting and multi-sort",
  "angular/search.md": "Angular table search and find",
  "angular/filtering.md": "Angular filters, operators and chips",
  "angular/filter-tree.md": "Angular AND/OR filter groups",
  "angular/header-filters.md": "Angular per-column header filters",
  "angular/custom-filter-types.md": "Angular custom filter types",
  "angular/pagination.md": "Angular table pagination: client and server",
  "angular/selection.md": "Angular row selection and bulk actions",
  "angular/row-actions.md": "Angular row actions and mutations",
  "angular/row-expansion.md": "Angular expandable detail rows",
  "angular/nested-tables.md": "Angular nested tables",
  "angular/cell-editing.md": "Editable Angular table cells and batch editing",
  "angular/row-reordering.md": "Angular row reordering",
  "angular/row-pinning.md": "Angular pinned rows",
  "angular/pinned-summary-rows.md": "Angular pinned summary and total rows",
  "angular/row-spanning.md": "Angular row and column spanning",
  "angular/full-width-rows.md": "Angular full-width and separator rows",
  "angular/row-styling.md": "Angular row styles and heights",
  "angular/cell-navigation.md": "Angular grid navigation and ranges",
  "angular/row-grouping.md": "Angular row grouping and subtotals",
  "angular/aggregation.md": "Angular table aggregation",
  "angular/pivot.md": "Angular pivot tables and measures",
  "angular/formulas.md": "Angular formula columns",
  "angular/tree-data.md": "Angular tree tables and lazy children",
  "angular/column-management.md": "Angular column menus, pinning and resize",
  "angular/saved-views.md": "Angular saved views and layouts",
  "angular/virtualization.md": "Angular table and card virtualization",
  "angular/mobile.md": "Angular responsive mobile cards",
  "angular/url-state.md": "Angular URL state and Router integration",
  "angular/exporting.md": "Angular browser and server exports",
  "angular/export-xlsx.md": "Angular Excel exports with typed cells",
  "angular/export-pdf.md": "Angular PDF export and print",
  "angular/ssr-rsc.md": "Angular SSR and hydration",
  "angular/agent-capabilities.md": "Angular table AI assistant",
  "angular/ai-voice.md": "Angular assistant voice input",
  "angular/customization.md": "Angular table templates and slots",
  "angular/toolbar-and-view-controls.md": "Angular toolbar and view controls",
  "angular/command-palette.md": "Angular command palette and context menus",
  "angular/i18n-rtl.md": "Angular table locales and RTL",
  "angular/accessibility.md": "Accessible Angular tables and grids",
  "angular/realtime.md": "Angular realtime table updates",
  "getting-started.md": "Get started — a React table for your UI kit",
  "concepts.md": "Headless engine, React and Angular bindings",
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
  "row-actions.md": "React table row actions — add, copy, delete",
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
  "ai-integrations.md": "Table AI integration — OpenAI, MCP, JSON",
  "ai-http.md": "Table AI backend — HTTP and local example",
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
  "vue/actions.md":
    "Compose Vue bulk actions, command palettes, context menus, panels, CSV exports, optional writers and print controls with host-owned actions.",
  "vue/column-menu.md":
    "Manage Vue table column visibility, order, pinning, sizing and names with controlled layouts, native controls and typed adapter slots.",
  "vue/navigation.md":
    "Add Vue cell navigation, clipboard and fill actions, find-in-table, column selection and status controls with scoped models and native slots.",
  "vue/specialized.md":
    "Compose Vue virtual windows, host-owned row reordering, grouping and pivot controls, formulas, row streams and accessible sparklines.",
  "vue/summary-row.md":
    "Render Vue page totals and custom footers with reactive summary values, aligned desktop cells, mobile cards and shared adapter models.",
  "vue/assistant.md":
    "Connect Vue agents and conversations with native controls, explicit approval and host-controlled state.",
  "vue/getting-started.md":
    "Build an experimental Vue table with native controls, reactive sources, optional features, controlled state and SSR lifecycle rules.",
  "vue/features.md":
    "Compose native Vue filters, cell and batch editing, grouped and tree rows, row presentation and view controls with host-owned data and scoped state.",
  "vue/api.md":
    "Reference for the implemented Vue 3.5 sources, renderers, native table, structural Chrome, scoped features and model channels. Experimental workspace API.",
  "angular/angular-cdk.md":
    "Use the Angular CDK table adapter with CDK overlays, focus handling, native controls and composable features.",
  "angular/aria.md":
    "Use the Angular Aria table adapter with accessible behavior primitives, native controls and composable features.",
  "angular/material.md":
    "Build Angular tables with the Material adapter, native controls, scoped themes and composable features.",
  "angular/ng-bootstrap.md":
    "Use the ng-bootstrap table adapter with native Bootstrap overlays, scoped styles and composable Angular features.",
  "angular/ngx-bootstrap.md":
    "Use the ngx-bootstrap table adapter with native dropdowns and modals, scoped themes and composable Angular features.",
  "angular/spartan.md":
    "Build Angular tables with the Spartan adapter, Brain behavior primitives, package-owned Helm controls and scoped styles.",
  "angular/taiga-ui.md":
    "Use the Taiga UI table adapter with its scoped root, native controls and overlays, and composable Angular features.",
  "angular/getting-started.md":
    "Install an Angular table with native HTML or NG-ZORRO controls. Follow npm setup, CLI scaffolding and a standalone component example with signal-backed rows.",
  "angular/features.md":
    "Compose Angular table features through kit subpaths and standardPreset. Add only the required controls and keep data ownership in your application.",
  "angular/data-tiers.md":
    "Connect Angular tables to in-memory data, server paging or query-library signals with injectTableData, injectServerData and injectQuerySource.",
  "angular/headless.md":
    "Render a headless Angular table with injectDataTable, signal readers and attribute helpers. Use your own templates while retaining the table engine.",
  "angular/custom-table-source.md":
    "Consume a custom TableSource in Angular through signals. Supply required state and setters, declare capabilities and manage subscriptions with fromStore.",
  "angular/building-an-adapter.md":
    "Build an Angular UI-kit adapter with structural Chrome and required slots. Keep visible controls kit-native and preserve the public parts contract.",
  "angular/columns.md":
    "Define Angular ColumnDef columns with plain headers, value accessors and TemplateRef or component renderers. Bind cell contexts with AdaptCellTemplate.",
  "angular/column-groups.md":
    "Group Angular table columns under spanning headers and add collapse controls. Configure kept columns and preserve the grouping model in your kit.",
  "angular/sparkline.md":
    "Render Angular sparkline cells through the optional binding entry. Configure bar, line and area charts with explicit values and export behavior.",
  "angular/sorting.md":
    "Sort Angular tables by one or multiple columns. Configure value comparison, server queries and accessible sort headers with optional URL persistence.",
  "angular/search.md":
    "Add Angular table search with debounce and host query callbacks. Configure row text and distinguish dataset search from the find-in-table feature.",
  "angular/filtering.md":
    "Compose Angular filters using kit-native fields, operators and removable chips. Connect declarative definitions to client predicates and server queries.",
  "angular/filter-tree.md":
    "Build nested AND/OR filter groups in Angular. Use the kit's filter tree controls with the shared model, validation and URL serialization.",
  "angular/header-filters.md":
    "Place Angular column filters in header funnels through the header-filters entry. Share filter definitions, chips and state with the full filter panel.",
  "angular/custom-filter-types.md":
    "Register custom Angular filter types with operators, matching rules and required widget slots. Keep the shared filter model separate from kit controls.",
  "angular/pagination.md":
    "Add client-side or server-side pagination to an Angular table. Configure page size, total counts, loading states and cursor-based infinite scrolling.",
  "angular/selection.md":
    "Select Angular table rows and run bulk actions with kit-native checkboxes. Handle selectionChange, selected IDs and host-owned confirmation callbacks.",
  "angular/row-actions.md":
    "Add Angular row menus, custom action renderers and add, duplicate or delete callbacks. The host performs each mutation and supplies the resulting rows.",
  "angular/row-expansion.md":
    "Expand Angular table rows into detail templates with accessible toggles. Configure expansion state and render row-specific content through kit slots.",
  "angular/nested-tables.md":
    "Render nested Angular tables inside detail rows. Provide child columns and data, configure defaults and retain independent table state for each child.",
  "angular/cell-editing.md":
    "Make Angular table cells editable with validation and save callbacks. Follow inline and batch editing examples with error handling, keyboard support and undo.",
  "angular/row-reordering.md":
    "Reorder Angular rows through drag handles or keyboard and mobile actions. Apply host callbacks, move policies and tree or group constraints.",
  "angular/row-pinning.md":
    "Pin Angular rows above or below the main body with explicit ID lists. Handle pin changes in the host and persist supported state to the URL.",
  "angular/pinned-summary-rows.md":
    "Add pinned summary rows to Angular tables outside the ordinary row model. Display totals without including them in selection, filtering or paging.",
  "angular/row-spanning.md":
    "Span Angular table cells across rows or columns. Derive cell spans from neutral helpers and omit covered cells while preserving valid table structure.",
  "angular/full-width-rows.md":
    "Insert full-width content and separator rows into Angular tables. Position host-provided slots by row ID and account for mobile card rendering.",
  "angular/row-styling.md":
    "Set conditional Angular row styles and heights from host callbacks. Apply appearance consistently to desktop rows and responsive mobile cards.",
  "angular/cell-navigation.md":
    "Navigate Angular grids by keyboard, select cell ranges and connect clipboard or fill operations. Preserve focus and screen-reader feedback.",
  "angular/row-grouping.md":
    "Group Angular table rows with kit-native grouping panels. Configure nested keys, group expansion, subtotals and server grouping capabilities.",
  "angular/aggregation.md":
    "Compute Angular table summaries and group aggregates. Configure operations, aggregatable columns and host-provided server totals.",
  "angular/pivot.md":
    "Build Angular pivot tables with row and column axes, measures and totals. Follow client-side and server-side recipes with loading, errors and URL state.",
  "angular/formulas.md":
    "Add Angular formula columns through the binding's formula entry. Build computed columns and synchronize formulas with the URL without evaluating code.",
  "angular/tree-data.md":
    "Display hierarchical Angular data with tree expansion and lazy children. Configure row identity, loading and accessible desktop or mobile controls.",
  "angular/column-management.md":
    "Manage Angular column visibility, order, pinning and size with kit-native menus. Persist layouts and handle columnLayoutChange in the host.",
  "angular/saved-views.md":
    "Save and restore named Angular table views using the kit's saved-views controls. Configure storage, URL state and explicit controller options.",
  "angular/virtualization.md":
    "Window Angular table rows, columns and mobile cards with optional virtualization. Configure sizing and overscan while maintaining table behavior.",
  "angular/mobile.md":
    "Render Angular table data as responsive mobile cards. Preserve field templates, selection and editing when supplying a custom card body.",
  "angular/url-state.md":
    "Synchronize Angular table state with browser History or Angular Router. Namespace table keys and handle request URLs during server rendering.",
  "angular/exporting.md":
    "Export Angular table data through optional kit controls. Configure browser downloads, host server jobs, progress, cancellation and accessible status.",
  "angular/export-xlsx.md":
    "Export Angular tables to Excel with the shared XLSX writer. Preserve typed values, column widths and grouping while keeping the writer optional.",
  "angular/export-pdf.md":
    "Connect Angular table exports to the shared PDF writer and print helpers. Configure output and load export controls only when needed.",
  "angular/ssr-rsc.md":
    "Server-render and hydrate Angular tables with platform-safe bindings. Supply request state explicitly and keep browser-only work behind platform guards.",
  "angular/agent-capabilities.md":
    "Connect Angular tables to provider-neutral AI through tableAgent and injectTableAssistant. Render native kit controls and govern host-owned operations.",
  "angular/ai-voice.md":
    "Dictate into an Angular table assistant draft with injectSpeechInput. Configure speech providers and controls while keeping message submission explicit.",
  "angular/customization.md":
    "Customize Angular tables with templates, renderer components, classNames and required slots. Keep context values and mobile rendering intact.",
  "angular/toolbar-and-view-controls.md":
    "Compose Angular toolbar controls for density, fullscreen, print, export and undo. Add a status bar or side panel through optional kit features.",
  "angular/command-palette.md":
    "Add Angular command palettes, context menus and shortcuts with kit-native controls. Register actions and support keyboard and touch entry points.",
  "angular/i18n-rtl.md":
    "Localize Angular tables with shared locale bundles and direction inputs. Configure translated labels and RTL-aware table and feature layouts.",
  "angular/accessibility.md":
    "Build accessible Angular tables with keyboard focus, labels and announcements. Account for grid navigation, mobile cards and kit-native controls.",
  "angular/realtime.md":
    "Apply realtime row patches to host-owned Angular signals. Preserve patch provenance and use changed-cell feedback without giving the table persistence.",
  "getting-started.md":
    "Install AdaptTable for Mantine, MUI, Chakra, Ant, Radix, Base UI or shadcn — one CLI command, or a StackBlitz starter with no install.",
  "concepts.md":
    "Understand AdaptTable's neutral core, React and Angular bindings, TableSource contract and native UI adapters. Keep data and persistence in your application.",
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
  "row-actions.md":
    "Row actions for React data tables — your own per-row buttons or a 3-dot menu, plus add, duplicate and delete rows through host handlers, in every UI kit.",
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
    "AdaptTable API reference for the neutral engine, React and Angular bindings, native kits, filters, sources, optional features and provider-neutral AI.",
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
        item: siteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: siteUrl(docsRoute(slug)),
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

/** Rewrite links from a canonical source path before assigning its site route. */
export function rewriteDocLinks(markdown, file) {
  return markdown.replace(
    /(\]\()([^\s)]+)([^)]*\))/g,
    (_link, open, href, close) => {
      const doc = docLinkTarget(file, href);
      if (doc) {
        const framework = /^(angular|vue)\//.exec(file)?.[1];
        const explicitFramework = /^(react|angular|vue)\//.test(doc.file);
        const route =
          framework && !explicitFramework
            ? docsReferenceRoute(doc.file, framework)
            : docsRoute(doc.file);
        const suffix = route.includes("?unavailable=") ? "" : doc.suffix;
        return `${open}${route}${suffix}${close}`;
      }
      if (href.startsWith("../")) {
        const repositoryPath = posix.normalize(
          posix.join("docs", posix.dirname(file), href)
        );
        return `${open}https://github.com/orwa-mahmoud/adapttable/blob/main/${repositoryPath}${close}`;
      }
      return `${open}${href}${close}`;
    }
  );
}

function syncDocs() {
  mkdirSync(target, { recursive: true });
  const files = docsFiles(source);
  for (const file of files) {
    const raw = readFileSync(join(source, file), "utf8");
    // Drop the H1 (Starlight renders the frontmatter title) and rewrite
    // repo-relative links into their site equivalents: doc-to-doc .md links
    // become the linked page's route in its section (anchors preserved),
    // repo files point at GitHub.
    const body = rewriteDocLinks(raw.replace(/^# .*\n/, ""), file);
    const title = TITLES[file] ?? file.replace(/\.md$/, "");
    const description = DESCRIPTIONS[file];
    const slug = file.replace(/\.md$/, "");

    // Structured data: a BreadcrumbList on every page, plus FAQPage on the FAQ
    // so its Q&As are eligible for Google rich results.
    const jsonLd = [breadcrumbList(title, slug)];
    if (file === "faq.md") jsonLd.push(faqPage(parseFaq(raw)));

    // Per-page social-share card (generated under public/og/<slug>.png).
    const ogImage = siteUrl(`/og/${slug}.png`);
    const head = [
      ...jsonLd.map(ldScript),
      metaEntry("property", "og:image", ogImage),
      metaEntry("name", "twitter:image", ogImage),
    ];

    const fm = [`title: ${JSON.stringify(title)}`];
    if (description) fm.push(`description: ${JSON.stringify(description)}`);
    const frontmatter = `---\n${fm.join("\n")}\n${headBlock(head)}---\n\n`;
    // A page served in a framework section is written below it; a copy left
    // at the collection root by an earlier layout would publish it twice.
    const id = docsSlug(slug);
    if (id !== slug) rmSync(join(target, file), { force: true });
    const out = join(target, `${id}.md`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${frontmatter}${body}`);
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
  const unlinked = files.filter(
    (file) => !llmsIndex.includes(siteUrl(docsRoute(file.replace(/\.md$/, ""))))
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
