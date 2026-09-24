---
title: "Migrate from MUI X DataGrid — Pro free (MIT) (v2)"
description: MUI X v6→v8 renamed disableSelectionOnClick and rewrote
  valueGetter. Every breaking change mapped to a stable API — plus Pro features
  free under MIT.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Migrate
      from MUI X DataGrid — Pro free
      (MIT)","item":"https://adapttable.orwamahmoud.com/v2/react/migrate-from-mui-x-datagrid/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/migrate-from-mui-x-datagrid.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/migrate-from-mui-x-datagrid.png
slug: v2/react/migrate-from-mui-x-datagrid
---

▶ **See it before you install:** [the live demo running on real Material UI](https://adapttable.orwamahmoud.com/react/demo/?kit=mui) — same components you already use, nothing to set up.

[MUI X DataGrid](https://mui.com/x/react-data-grid/) is an excellent grid if
you are all-in on Material UI. The catch is its licensing: many everyday table
features live in the paid **Pro** and **Premium** tiers. `@adapttable/mui`
renders real MUI components — so it looks like Material UI — while giving you a
lot of that paid surface **free under MIT**, plus shareable URL state and an
automatic mobile layout the DataGrid doesn't ship at any tier.

This page maps `<DataGrid>` to `<DataTable>` and shows a before/after.

## What you gain (free, MIT)

Features that are **paid** in MUI X but built into `@adapttable/mui`:

* **Column pinning** (Pro) → AdaptTable column layout / Columns menu.
* **Row virtualization** (Pro in v8) → `virtualize`. Community `<DataGrid>` also
  caps pages at 100 rows; AdaptTable has no such cap.
* **Multi-column sort** (Pro) → `multiSort`.
* **Multiple simultaneous filters** (Pro) → declarative `filters`, always
  multi-condition.
* **Column resizing** (Pro) → `resizableColumns`.
* **Master-detail / detail panel** (Pro) → `renderRowDetail`.
* **Multiple row selection** (Pro) → `bulkActions` / `selectedIds`.
* **Footer summary rows** → `summaryRow` (MUI's statistical aggregation is
  Premium; AdaptTable's `aggregate({ salary: "sum" }, { columns })` builds the
  footer from `sum` / `avg` / `count` / `min` / `max` or your own function).

Plus things DataGrid has no built-in answer for at any tier:

* **URL-synced, shareable state** — see [URL state](/v2/react/url-state/).
* **An automatic responsive card layout** on mobile (DataGrid's List view is
  Pro and manual).
* **One API for seven UI kits** — the same code renders in Mantine, Chakra, Ant
  Design, Radix, Base UI, and shadcn/ui too.

> Tiers above reflect MUI X **v8** (2025), verified against MUI's licensing
> docs. MUI may move features between tiers — check their
> [licensing page](https://mui.com/x/introduction/licensing/) before relying on
> a specific boundary.

## Install

```bash
pnpm add @adapttable/core @adapttable/mui @mui/material
```

Works with the default theme; wrap in `<ThemeProvider>` to customize, exactly as
DataGrid does.

## Prop mapping

`<DataGrid>` → `<DataTable>`:

| MUI X DataGrid                                       | `@adapttable/mui`                                     | Notes                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `rows`                                               | `data`                                                | Frontend tier. Server tier: `data` (page) + `total` + `onQueryChange`. |
| `columns`                                            | `columns`                                             | `GridColDef` → `ColumnDef`, mapped below.                              |
| `getRowId`                                           | `rowKey`                                              | **Required** — `(row) => string`.                                      |
| `sortModel` / `onSortModelChange`                    | `sortable` per column (+ `multiSort`)                 | AdaptTable owns and applies sort state.                                |
| `sortingMode: "server"`                              | `onQueryChange` (or `source`)                         | The consolidated query carries `sortBy`/`sortDir`.                     |
| `filterModel` / `onFilterModelChange`                | column `filter` shorthand + table `filters`           | Widgets, chips, and URL params are derived for you.                    |
| `paginationModel` / `onPaginationModelChange`        | automatic (frontend) or `total` + `onQueryChange`     | No 100-row community cap.                                              |
| `checkboxSelection` + `rowSelectionModel`            | `bulkActions`, or `selectedIds` / `onSelectionChange` | Multi-row selection is free; no `{ type, ids }` model to manage.       |
| `getDetailPanelContent` (Pro)                        | `renderRowDetail`                                     | `(row) => ReactNode`.                                                  |
| `loading`                                            | `loading`                                             | —                                                                      |
| `slots.noRowsOverlay` / `loadingOverlay`             | `slots.empty` / `slots.skeleton`                      | —                                                                      |
| `initialState` / `apiRef.exportState()` (state only) | `urlSync` + `urlKey` (+ `savedViews`)                 | State lives in the URL, shareable and reload-safe.                     |
| `pinnedColumns` (Pro) / `columnVisibilityModel`      | `enableColumnMenu` / `columnLayout`                   | Show/hide, reorder, pin in one menu.                                   |

`GridColDef` → `ColumnDef`:

| MUI X DataGrid                         | `@adapttable/mui`                     | Notes                                                         |
| -------------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| `field`                                | `key`                                 | Also the value path (dot paths supported).                    |
| `headerName`                           | `header`                              | Auto-derived from `key` when omitted.                         |
| `width` / `flex`                       | `width` / `flex`                      | `flex` shares apply under table-level `fitColumns`.           |
| `valueGetter: (value, row) => …`       | `accessor: (row) => …`                | AdaptTable reads the row directly — no v7/v8 signature churn. |
| `valueFormatter` / `renderCell`        | `accessor` / `Cell`                   | `Cell` is a component receiving `{ row, rowIndex }`.          |
| `type: "singleSelect"`, `valueOptions` | `filter: { type: "select", options }` | Turns the column into a native select filter.                 |
| `sortable`                             | `sortable`                            | Add `sortValue` for formatted/JSX cells.                      |
| `align` / `headerAlign`                | `align`                               | Use logical `"start"`/`"center"`/`"end"`.                     |

## Before / after

**Before** — MUI X, reaching for `<DataGridPro>` to pin and resize columns:

```tsx
import { DataGridPro } from "@mui/x-data-grid-pro"; // paid tier

function PeopleGrid({ rows }: { rows: Person[] }) {
  return (
    <DataGridPro
      rows={rows}
      getRowId={(r) => r.id}
      checkboxSelection
      columns={[
        { field: "name", headerName: "Name", sortable: true },
        { field: "role", headerName: "Role" },
        {
          field: "status",
          headerName: "Status",
          type: "singleSelect",
          valueOptions: ["active", "retired"],
        },
      ]}
      initialState={{ pinnedColumns: { left: ["name"] } }}
    />
  );
}
```

**After** — `@adapttable/mui`, all MIT, with a status filter + chip and URL state
for free:

```tsx
import { DataTable } from "@adapttable/mui";

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      enableColumnMenu // show/hide, reorder, pin — no Pro licence
      resizableColumns
      bulkActions={[/* … turns on multi-row selection */]}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status", filter: { type: "select", options: "auto" } },
      ]}
    />
  );
}
```

## Escaping the version churn (v6 → v7 → v8 breaking changes)

A big reason teams migrate is that each DataGrid major rewrites your code.
If one of these breaking changes brought you here, the right column is what
the same thing looks like in AdaptTable:

| DataGrid breaking change                                                                                                            | In AdaptTable                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **`valueGetter` signature** rewritten in v7: `(params) => …` became `(value, row, column, apiRef) => …` (same for `valueFormatter`) | `accessor: (row) => …` — one argument, the row, stable API                     |
| **`disableSelectionOnClick` renamed** to `disableRowSelectionOnClick` (v6)                                                          | selection never binds to row clicks; `onRowClick` is a separate, explicit prop |
| **`rowSelectionModel` reshaped** in v8: a plain id array became `{ type: "include" \| "exclude", ids: Set }`                        | `onSelectionChange` hands you a plain `string[]` — no model object             |
| **Row virtualization moved to Pro** in v8 (Community pages cap at 100 rows)                                                         | `virtualize` — free, MIT, no page cap                                          |
| **Multi-column sorting / multi-filters** gated behind Pro                                                                           | `multiSort` and multi-condition `filters` — free                               |
| **Column resizing** gated behind Pro                                                                                                | `resizableColumns` — free                                                      |

One declarative API, semver-stable, and the features that keep moving behind
the paywall are simply included.

## Gotchas

* **`rowKey` is required** — the equivalent of `getRowId`, but with no `id`
  default.
* **No `sortModel`/`filterModel`/`paginationModel` objects.** Sorting is a
  per-column `sortable` flag; filtering is declarative `filter` shorthands;
  pagination is automatic. For a server API, emit one query via
  [`onQueryChange`](/v2/data-tiers/) instead of three `*Mode="server"` props.
* **`valueGetter` becomes `accessor`.** AdaptTable passes the row, so the v7/v8
  `(value, row, column, apiRef)` signature change doesn't apply — and a JSX cell
  uses `Cell` (a `{ row, rowIndex }` component).
* **Selection is a plain id list.** No v8 `{ type: "include" | "exclude", ids:
  Set }` model — `onSelectionChange` hands you `string[]`.
* **Row expansion replaces master-detail.** `renderRowDetail` is the free
  equivalent of the Pro `getDetailPanelContent`.
* **`summaryRow` is a footer over the current page.** Compute the cells
  yourself or build them with `aggregate` (`sum`, `avg`, `count`, `min`, `max`,
  or your own function); the same builder feeds per-group `groupAggregates`.

## Where next

* [Getting started](/v2/react/getting-started/) · [Data tiers](/v2/data-tiers/) ·
  [Filtering](/v2/react/filtering/) · [Column management](/v2/react/column-management/).
* [Virtualization](/v2/react/virtualization/) — window large lists, free.
* [Comparison](/v2/react/comparison/) — where each library fits.
