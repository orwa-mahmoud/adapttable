# ag-Grid alternative for CRUD — 300 kB lighter, MIT

▶ **See it before you install:** [the live demo](https://orwa-mahmoud.github.io/adapttable/demo/) — flip between Mantine, MUI, Chakra, Ant Design, Radix, Base UI, shadcn and Tailwind on the same data.

[AG Grid](https://www.ag-grid.com/) is the best spreadsheet-grade grid in the
React ecosystem — and this page starts by telling you when **not** to migrate.
If your app uses pivoting, tree data, cell/range selection, or Excel
export, keep AG Grid (those are its Enterprise tier, from
$999/developer, and they're genuinely good). AdaptTable doesn't do analytics
grids, and pretending otherwise would waste your week.

This page is for the other — much larger — group: teams running **ordinary
CRUD tables** on AG Grid Community, paying for spreadsheet power they don't
use in three currencies: **bundle size** (the full Community setup is ~346 kB
min+gzip of grid code vs ~45 kB for AdaptTable core + an adapter), **churn**
(a new AG Grid major about every 6 months — v32.2 rewrote the selection API,
v33 made module registration and the Theming API mandatory, v36 overhauled
the DOM and CSS class names), and **look** (AG Grid renders its own theme;
AdaptTable renders _your_ UI kit's real components).

## When to stay on AG Grid

- Pivoting / aggregation dashboards (single-level [row grouping](./row-grouping.md)
  with per-group aggregates IS built in — deep multi-level grouping is not)
- Tree data, cell/range selection + fill handle, clipboard-heavy workflows
- Excel export (not just CSV), tool panels / side bar
- Excel-style cell editing at scale

All Enterprise features — if you rely on them and they're worth $999/dev to
you, that's the right tool. Migrate the CRUD tables, keep the analytics grid.

## What you gain (for CRUD tables)

- **~300 kB lighter** grid code (min+gzip, everything-registered Community
  vs AdaptTable core + one adapter; AG Grid can shrink with module
  cherry-picking, but that's work you maintain).
- **Native look per kit** — MUI tables look like MUI, Mantine like Mantine.
  No Quartz theme to restyle, no CSS class renames on major upgrades.
- **Declarative instead of imperative** — no `gridRef.current.api.*` calls;
  selection, filters, sort, and page are props and URL state.
- **URL-synced shareable state** built in — AG Grid exposes grid state through
  its API and leaves persistence to you.
- **Free master/detail** — `renderRowDetail` does what AG Grid gates behind
  Enterprise master/detail (for detail panels, not nested grids).
- **A real filter UI for free** — AG Grid's set filter, multi filter, and
  filter tool panel are Enterprise; AdaptTable's select/multi-select/range
  filters with chips are MIT.
- **Everything is MIT** — no watermark risk when a developer touches the
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

| AG Grid                             | AdaptTable                                                      | Notes                                         |
| ----------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| `field`                             | `key`                                                           | Dot paths supported.                          |
| `headerName`                        | `header`                                                        | Auto-derived from `key` when omitted.         |
| `valueGetter` / `valueFormatter`    | `accessor: (row) => …`                                          | One function, receives the row.               |
| `cellRenderer`                      | `Cell`                                                          | Component receiving `{ row, rowIndex }`.      |
| `sortable` (default true)           | `sortable` (default false)                                      | Opt-in instead of opt-out.                    |
| `comparator`                        | `sortValue`                                                     | Extract a comparable primitive.               |
| `filter: "agTextColumnFilter"` etc. | `filter: "text"` / `"select"` / `"numberRange"` / `"dateRange"` | Widgets + chips derived from the declaration. |
| `flex` / `width` / `minWidth`       | `width`                                                         | —                                             |
| `pinned: "left" \| "right"`         | pinning via Columns menu / `columnLayout`                       | Logical sides — RTL-correct.                  |
| `hide`                              | `enableColumnMenu` + `columnLayout`                             | User-facing visibility lives in the menu.     |
| `resizable` (default true)          | `resizableColumns` (table-level)                                | —                                             |
| `editable`                          | `editable` + `editor` + table `onCellEdit`                      | Opt-in; no editor until `onCellEdit` is set.  |

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

- **Don't migrate the analytics grids.** Pivoting, multi-level grouping,
  tree data, range selection, clipboard, Excel export have no AdaptTable
  equivalent — that's deliberate scope, not a roadmap gap. (Single-level
  row grouping with aggregates DID ship — see
  [Row grouping](./row-grouping.md).)
- **Cell editing is opt-in, not spreadsheet-grade.** Map AG Grid `editable`
  columns to `ColumnDef.editable` + table `onCellEdit` (see
  [Inline cell editing](./cell-editing.md)). Full Excel-style fill-handle /
  clipboard editing stays out of scope — use `rowActions` + your own form
  when you need a multi-field edit dialog.
- **The imperative API disappears.** Anywhere you called
  `api.getSelectedRows()`, `api.setFilterModel()`, or `api.sizeColumnsToFit()`,
  you now read props/state (`onSelectionChange`, URL-synced filters, column
  `width`s). This is usually the bulk of the rewrite — and the part that
  stops breaking on majors.
- **Sorting is opt-in.** AG Grid columns sort by default; AdaptTable columns
  need `sortable: true`.
- **CSV export is built-in.** Pass `exportCsv` for a toolbar button, or wire
  `rowsToCsv` / `downloadCsv` to a custom `toolbar` control. (AG Grid's context
  menu is Enterprise anyway.)
- **Row virtualization is opt-in** (`virtualize`) rather than always-on —
  enable it for genuinely large lists; a benchmark lives in the
  [virtualization docs](./virtualization.md).

## Where next

- [Getting started](./getting-started.md) · [Data tiers](./data-tiers.md) ·
  [Filtering](./filtering.md) · [Column management](./column-management.md).
- [Comparison](./comparison.md) — the honest feature table, including where
  AG Grid wins.
