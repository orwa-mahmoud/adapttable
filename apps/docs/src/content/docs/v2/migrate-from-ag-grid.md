---
title: "Migrate from AG Grid — CRUD tables, your UI kit, MIT (v2)"
description: When to stay on AG Grid, and when not to. Pivoting, tree data,
  range selection and Excel export are MIT here; AG Grid keeps the integrated
  spreadsheet surface.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"Migrate
      from AG Grid — CRUD tables, your UI kit,
      MIT","item":"https://orwa-mahmoud.github.io/adapttable/v2/migrate-from-ag-grid/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/migrate-from-ag-grid.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/migrate-from-ag-grid.png
slug: v2/migrate-from-ag-grid
---

▶ **See it before you install:** [the live demo](https://orwa-mahmoud.github.io/adapttable/demo/) — flip between Mantine, MUI, Chakra, Ant Design, Radix, Base UI, shadcn and Tailwind on the same data.

[AG Grid](https://www.ag-grid.com/) is the best spreadsheet-grade grid in the
React ecosystem — and this page starts by telling you when **not** to migrate.

The honest line is not a feature list. Pivoting, tree data, cell-range
selection, the fill handle, clipboard range operations and Excel export all
ship in AdaptTable, under MIT, where AG Grid puts them in its paid Enterprise
tier — $999/developer when we checked in August 2026. What AG Grid has that
AdaptTable does not is **integration**: one spreadsheet surface, tool panels
already assembled, and a decade of behaviour at the edges of it. In AdaptTable
those are parts you compose — a pivot engine and its panel, a range model, a
side-panel frame you fill.

So stay on AG Grid when the grid IS the product: an analytics surface where
users pivot, drill and drag fields around all day, or a workflow that leans on
Excel-style editing at scale. That week is not worth spending, and the licence
buys something real.

This page is for the other — much larger — group: teams running **ordinary
CRUD tables** on AG Grid Community, paying for spreadsheet power they don't use
in two currencies: **churn** (a new AG Grid major about every 6 months — v32.2
rewrote the selection API, v33 made module registration and the Theming API
mandatory, v36 overhauled the DOM and CSS class names), and **look** (AG Grid
renders its own theme; AdaptTable renders *your* UI kit's real components).

## When to stay on AG Grid

* The grid is the product — an analytics surface users pivot and drill all day
* Excel-style cell editing at scale
* Assembled tool panels: AdaptTable's `sidePanel` is a frame with tabs that you
  fill (the pivot, saved-views and filter-tree panels ship; arranging them is
  yours)
* Drag-a-column-to-group: AdaptTable groups from `groupBy` — your code or the
  URL, no drag gesture

If you rely on those and the Enterprise licence is worth it to you, that is the
right tool. Migrate the CRUD tables, keep the analytics grid — they can run side
by side.

## What you gain (for CRUD tables)

* **Native look per kit** — MUI tables look like MUI, Mantine like Mantine.
  No Quartz theme to restyle, no CSS class renames on major upgrades.
* **Declarative instead of imperative** — no `gridRef.current.api.*` calls;
  selection, filters, sort, and page are props and URL state.
* **URL-synced shareable state** built in — AG Grid exposes grid state through
  its API and leaves persistence to you.
* **Free master/detail** — `renderRowDetail` does what AG Grid gates behind
  Enterprise master/detail (for detail panels, not nested grids).
* **A real filter UI for free** — AG Grid's set filter, multi filter, and
  filter tool panel are Enterprise; AdaptTable's select/multi-select/range
  filters with chips are MIT.
* **Everything is MIT** — no watermark risk when a developer touches the
  wrong feature flag.

## Install

```bash
# pick the adapter for your UI kit
pnpm add @adapttable/core @adapttable/mui @mui/material
```

No module registration, no theme objects, no CSS imports — the adapter
renders through the kit provider your app already has.

## Prop mapping

Grid-level (`<AgGridReact>` → `<DataTable>`):

| AG Grid                                            | AdaptTable                                            | Notes                                                             |
| -------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `rowData`                                          | `data`                                                | —                                                                 |
| `columnDefs`                                       | `columns`                                             | `ColDef` mapping below.                                           |
| `defaultColDef`                                    | (not needed)                                          | Column defaults are explicit per column.                          |
| `pagination` + `paginationPageSize`                | automatic                                             | Paged on desktop, infinite on mobile; page-size control built in. |
| `rowSelection={{ mode: "multiRow" }}`              | `bulkActions`, or `selectedIds` / `onSelectionChange` | Checkboxes render when selection is on.                           |
| `api.getSelectedRows()`                            | `onSelectionChange` state                             | Selection is React state, not an API call.                        |
| `rowModelType: "infinite"`                         | `onQueryChange` (+ infinite mode)                     | One consolidated query; superseded fetches abort via `signal`.    |
| `api.exportDataAsCsv()`                            | `exportCsv` / `rowsToCsv` + `downloadCsv`             | Built-in toolbar button or headless helpers.                      |
| `theme={themeQuartz}`                              | your kit's provider/theme                             | The table inherits the design system, incl. dark mode.            |
| `<AgGridProvider modules={[AllCommunityModule]}>`  | (nothing)                                             | No module registry.                                               |
| `onGridReady` / `gridRef.current.api`              | (nothing)                                             | Declarative props replace the imperative API.                     |
| column tool panel (Enterprise side bar)            | `enableColumnMenu`                                    | Show/hide, reorder, pin — free.                                   |
| `getDetailPanelContent`-style master/detail (Ent.) | `renderRowDetail`                                     | `(row) => ReactNode`, free.                                       |

`ColDef` → `ColumnDef`:

| AG Grid                             | AdaptTable                                                      | Notes                                               |
| ----------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `field`                             | `key`                                                           | Dot paths supported.                                |
| `headerName`                        | `header`                                                        | Auto-derived from `key` when omitted.               |
| `valueGetter` / `valueFormatter`    | `accessor: (row) => …`                                          | One function, receives the row.                     |
| `cellRenderer`                      | `Cell`                                                          | Component receiving `{ row, rowIndex }`.            |
| `sortable` (default true)           | `sortable` (default false)                                      | Opt-in instead of opt-out.                          |
| `comparator`                        | `sortValue`                                                     | Extract a comparable primitive.                     |
| `filter: "agTextColumnFilter"` etc. | `filter: "text"` / `"select"` / `"numberRange"` / `"dateRange"` | Widgets + chips derived from the declaration.       |
| `flex` / `width` / `minWidth`       | `flex` / `width` / `minWidth` / `maxWidth`                      | `flex` shares apply under table-level `fitColumns`. |
| `pinned: "left" \| "right"`         | pinning via Columns menu / `columnLayout`                       | Logical sides — RTL-correct.                        |
| `hide`                              | `enableColumnMenu` + `columnLayout`                             | User-facing visibility lives in the menu.           |
| `resizable` (default true)          | `resizableColumns` (table-level)                                | —                                                   |
| `editable`                          | `editable` + `editor` + table `onCellEdit`                      | Opt-in; no editor until `onCellEdit` is set.        |

## Before / after

**Before** — AG Grid Community (v36 setup):

```tsx
import { AgGridReact } from "ag-grid-react";
import {
  AgGridProvider,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
import { useRef } from "react";

function PeopleGrid({ rows }: { rows: Person[] }) {
  const gridRef = useRef<AgGridReact>(null);
  return (
    <AgGridProvider modules={[AllCommunityModule]}>
      <AgGridReact
        ref={gridRef}
        theme={themeQuartz}
        rowData={rows}
        pagination
        rowSelection={{ mode: "multiRow" }}
        columnDefs={[
          { field: "name", sortable: true },
          { field: "role" },
          { field: "status", filter: "agTextColumnFilter" },
          { field: "salary", valueFormatter: (p) => fmt(p.value) },
        ]}
      />
    </AgGridProvider>
  );
}
```

**After** — AdaptTable (here with the MUI adapter; swap the import for your kit):

```tsx
import { DataTable } from "@adapttable/mui";

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      bulkActions={bulkActions}
      enableColumnMenu
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status", filter: { type: "select", options: "auto" } },
        {
          key: "salary",
          align: "end",
          accessor: (r) => fmt(r.salary),
          sortValue: (r) => r.salary,
          filter: "numberRange",
        },
      ]}
    />
  );
}
```

No provider wrapper, no modules, no theme object, no ref — and the rendered
table is your design system's, not a themed grid.

## Gotchas

* **The analytics features are parts, not a mode.** [Pivoting](/adapttable/v2/pivot/) is
  an engine plus its own panel; [nested grouping](/adapttable/v2/row-grouping/) is a list
  of keys in `groupBy`; [tree data](/adapttable/v2/tree-data/) is `getChildren` or
  `getParentId`; range selection, the fill handle and clipboard operations all
  need `cellNavigation` armed (see
  [Cell navigation](/adapttable/v2/cell-navigation/)). Each works — none is the single
  spreadsheet surface AG Grid hands you, so budget assembly time rather than a
  prop rename.
* **Cell editing is opt-in.** Map AG Grid `editable` columns to
  `ColumnDef.editable` + table `onCellEdit` (see
  [Inline cell editing](/adapttable/v2/cell-editing/)). `rowEditing` + `onRowEdit` edits a whole row
  inline as one patch. For a multi-field edit dialog, `rowActions` + your own
  form is still the answer — that part AdaptTable deliberately leaves to you.
* **The imperative API disappears.** Anywhere you called
  `api.getSelectedRows()`, `api.setFilterModel()`, or `api.sizeColumnsToFit()`,
  you now read props/state (`onSelectionChange`, URL-synced filters, column
  `width`s). This is usually the bulk of the rewrite — and the part that
  stops breaking on majors.
* **Sorting is opt-in.** AG Grid columns sort by default; AdaptTable columns
  need `sortable: true`.
* **Export is a writer, not three features.** `exportCsv` gives you the toolbar
  button; the format is whatever writer you hand it — `csvWriter`,
  `xlsxWriter` from `@adapttable/core/xlsx` for a real spreadsheet, or
  `pdfWriter` from `@adapttable/core/pdf`. Excel export is AG Grid Enterprise;
  here it is one import. (Its context menu is Enterprise anyway.)
* **Row virtualization is opt-in** (`virtualize`) rather than always-on —
  enable it for genuinely large lists; a benchmark lives in the
  [virtualization docs](/adapttable/v2/virtualization/).

## Where next

* [Getting started](/adapttable/v2/getting-started/) · [Data tiers](/adapttable/v2/data-tiers/) ·
  [Filtering](/adapttable/v2/filtering/) · [Column management](/adapttable/v2/column-management/).
* [Comparison](/adapttable/v2/comparison/) — the honest feature table, including where
  AG Grid wins.
