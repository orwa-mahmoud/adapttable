# material-table alternative — modern MUI, still MIT

▶ **See it before you install:** [the live demo running on real Material UI](https://orwa-mahmoud.github.io/adapttable/demo/?kit=mui) — same components material-table wraps, nothing to set up.

[material-table](https://github.com/mbrn/material-table) was once the default
Material UI table. Today it's effectively dormant: the last release with
release notes shipped in **August 2020**, maintenance since has been sporadic
single-maintainer dependency bumps, and the issue tracker is cleared by a
stale-bot rather than by fixes. Roughly **78% of its ~47k weekly downloads
still run the 1.x line — which supports only Material-UI v4 and React
16/17** — and the official docs still show the v4 install. (Material React
Table's own docs describe the project as having "become abandoned.")

If your table is one of those stranded 1.x installs, `@adapttable/mui`
renders real Material UI components across **MUI v5 through v9** — migrating
unblocks your MUI and React upgrades at the same time.

## First, the honest part: what does NOT map

material-table is a table-plus-CRUD-suite. AdaptTable deliberately isn't.
If you depend on these, AdaptTable is the wrong target (Material React Table
is the closer fit):

- **Full row-edit CRUD suites** (`editable` as a material-table-style
  object with `onRowAdd` / `onRowUpdate`) — AdaptTable ships **opt-in
  inline cell editing** via `onCellEdit` + `ColumnDef.editable` (see
  [Inline cell editing](./cell-editing.md)), not material-table's row
  dialog engine. Multi-field forms still go through `rowActions` + your
  own UI, with the built-in `confirm` seam for destructive actions.
- **Drag-to-group aggregation** (`options.grouping`) — AdaptTable ships
  single-level [row grouping](./row-grouping.md) (`groupBy` + optional
  `groupAggregates`); there is no drag-a-column-to-group UI, so wire your
  own control to `groupBy` if you need that gesture.
- **Tree data** (`parentChildData`) — not supported.
- **PDF export button** — AdaptTable ships a headless CSV helper only.

What's left — sorted, filtered, searched, paginated, selectable CRUD list
tables with remote data — is the majority use case, and it maps cleanly.

## Why move (all verifiable)

- **The version trap**: 1.x peers on `@material-ui/core ^4` (a package
  discontinued years ago); the 2.x escape hatch exact-pins specific MUI
  versions and rides the deprecated `@mui/styles`. Weekly downloads have
  roughly halved since 2020–21.
- **It mutates your rows**: material-table injects a `tableData` property
  into your data objects — breaking frozen/Redux state (issues #666, #1979).
  AdaptTable never writes to your rows.
- **No virtualization**: nothing in its public API windows large datasets,
  and slow-large-table issues are long-standing. AdaptTable has opt-in
  row/card virtualization.
- **Fragile foundations**: header-drag grouping depends on the archived
  `react-beautiful-dnd`.
- Plus the AdaptTable batteries the old stack never had: URL-synced shareable
  state, filter chips, an automatic mobile card layout, saved views, i18n/RTL.

## Install

```bash
pnpm add @adapttable/core @adapttable/mui @mui/material
```

Same Material look, on a current MUI — and your rows stay untouched.

## Prop mapping

`<MaterialTable>` → `<DataTable>`:

| material-table                                       | `@adapttable/mui`                                     | Notes                                                                |
| ---------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `data` (array)                                       | `data`                                                | No `tableData` injection — your objects are never mutated.           |
| `data` (query function)                              | `onQueryChange` (or `source`)                         | Mapping below.                                                       |
| `columns`                                            | `columns`                                             | Field-by-field below.                                                |
| `title`                                              | `tableLabel` / your own heading                       | The toolbar is yours to compose (`toolbar` slot).                    |
| `actions` (row actions)                              | `rowActions`                                          | Icon buttons on desktop, card buttons on mobile; `confirm` built in. |
| `actions` (`isFreeAction: true`)                     | `toolbar` slot                                        | Free actions are just toolbar content.                               |
| `options.selection` + `onSelectionChange`            | `bulkActions`, or `selectedIds` / `onSelectionChange` | Selection turns on with `bulkActions`.                               |
| `detailPanel`                                        | `renderRowDetail`                                     | `(row) => ReactNode`.                                                |
| `options.paging` / `pageSize` / `pageSizeOptions`    | automatic                                             | Paged on desktop, infinite on mobile (`"auto"`).                     |
| `options.search` / `searchText` / `debounceInterval` | built-in search                                       | Debounced + URL-synced by default.                                   |
| `options.filtering`                                  | column `filter` shorthands + `filters`                | Real widgets + removable chips, not per-column text rows.            |
| `options.columnsButton`                              | `enableColumnMenu`                                    | Show/hide, reorder, pin.                                             |
| `options.columnResizable`                            | `resizableColumns`                                    | —                                                                    |
| `options.fixedColumns: { left, right }`              | column pinning via `columnLayout` / Columns menu      | Logical sides — RTL-correct.                                         |
| `options.padding: "dense"`                           | `density="compact"`                                   | —                                                                    |
| `options.exportButton`                               | `exportCsv` / `rowsToCsv` + `downloadCsv`             | Built-in CSV button or headless helper; PDF is out of scope.         |
| `options.maxBodyHeight`                              | `maxHeight`                                           | Enables the scroll box + sticky pinning.                             |
| `localization`                                       | `labels` (+ [`@adapttable/i18n`](./i18n-rtl.md))      | Flat label object; presets for 17 locales incl. RTL.                 |
| `isLoading`                                          | `loading`                                             | —                                                                    |

Column def → `ColumnDef`:

| material-table                     | `@adapttable/mui`                             | Notes                                                                           |
| ---------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `field`                            | `key`                                         | Dot paths supported.                                                            |
| `title`                            | `header`                                      | Auto-derived from `key` when omitted.                                           |
| `render(rowData)`                  | `Cell` / `accessor: (row) => …`               | Same idea, typed row.                                                           |
| `type: "numeric"`                  | `align: "end"` + `filter: "numberRange"`      | Type is behavior you declare, not an enum.                                      |
| `type: "date"` / `"datetime"`      | `accessor` formatting + `filter: "dateRange"` | Operator-first range widgets included.                                          |
| `lookup: { 1: "Active", … }`       | `filter: { type: "select", options }`         | Options are explicit `{ value, label }[]` (or `"auto"`).                        |
| `sorting` / `defaultSort`          | `sortable` + `defaults`                       | Default sort is `defaults={{ sortBy, sortDir }}` (URL state wins when present). |
| `customSort(a, b)`                 | `sortValue: (row) => primitive`               | Extract a comparable value instead of writing a comparator.                     |
| `customFilterAndSearch`            | `filter` + `getValue`                         | Predicate derives from the declaration.                                         |
| `hidden` / `hiddenByColumnsButton` | `enableColumnMenu` + `columnLayout`           | User-facing visibility lives in the menu.                                       |
| `cellStyle` / `headerStyle`        | `align`, `width`, `className`, `Cell`         | Style through your own components/classes.                                      |

## Remote data: the query function maps almost 1:1

material-table's remote mode —
`data={query => fetch(...).then(r => ({ data, page, totalCount }))}` — is the
same idea as AdaptTable's server tier, minus two quirks:

```tsx
<DataTable
  data={rows}
  total={total}
  loading={loading}
  onQueryChange={async (query, { signal }) => {
    // material-table: query.page, query.pageSize, query.search,
    //                query.orderBy (a whole Column OBJECT), query.orderDirection
    // AdaptTable:    query.page, query.limit, query.search,
    //                query.sortBy (the column KEY, a string), query.sortDir,
    //                query.filters
    const res = await fetch(`/api/people?${toParams(query)}`, { signal });
    const body = await res.json();
    setRows(body.items); // no { data, page, totalCount } envelope required
    setTotal(body.total);
  }}
  columns={columns}
  rowKey={(r) => r.id}
/>
```

The classic material-table stumbling block — `query.orderBy` being a full
column object you have to unwrap — goes away: `sortBy` is the column key,
which you chose to be API-stable.

## Before / after

**Before** — material-table (MUI v4 era):

```tsx
import MaterialTable from "material-table";

function PeopleTable({ people }) {
  return (
    <MaterialTable
      title="People"
      data={people}
      columns={[
        { title: "Name", field: "name" },
        { title: "Role", field: "role" },
        { title: "Status", field: "status", lookup: STATUS_LOOKUP },
        { title: "Salary", field: "salary", type: "currency" },
      ]}
      options={{ selection: true, filtering: true, columnsButton: true }}
      actions={[
        { icon: "edit", tooltip: "Edit", onClick: (e, row) => openEdit(row) },
      ]}
    />
  );
}
```

**After** — `@adapttable/mui` (typed, URL-synced, current MUI):

```tsx
import { DataTable } from "@adapttable/mui";

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      enableColumnMenu
      bulkActions={bulkActions}
      rowActions={[
        { key: "edit", label: "Edit", onClick: (row) => openEdit(row) },
      ]}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status", filter: { type: "select", options: STATUS_OPTIONS } },
        {
          key: "salary",
          align: "end",
          accessor: (r) => formatCurrency(r.salary),
          sortValue: (r) => r.salary,
          filter: "numberRange",
        },
      ]}
    />
  );
}
```

## Gotchas

- **Strip `tableData` if you persist rows.** Rows that passed through
  material-table carry its injected `tableData` property — harmless to
  AdaptTable, but don't let it leak into your API payloads.
- **`rowKey` is required.** material-table keyed rows via its injected ids;
  AdaptTable wants your stable id.
- **Editing is a workflow now, not a table mode.** Recreate `onRowUpdate` /
  `onRowDelete` as `rowActions` with your own form/dialog; destructive
  actions get the built-in `confirm` dialog seam.
- **`lookup` becomes explicit options.** `{ 1: "Active" }` →
  `[{ value: "1", label: "Active" }]` (values round-trip through the URL as
  strings).
- **`type` enums become declarations.** `"numeric"` → `align: "end"` (+
  `numberRange` filter); dates → an `accessor` that formats + `dateRange`
  filter; `"currency"` → your formatter, with `sortValue` keeping sort
  numeric.

## Where next

- [Getting started](./getting-started.md) · [Data tiers](./data-tiers.md) ·
  [Filtering](./filtering.md) · [Selection & bulk actions](./selection.md).
- Same app also uses DataGrid or mui-datatables? See
  [Migrate from MUI X DataGrid](./migrate-from-mui-x-datagrid.md) and
  [Migrate from mui-datatables](./migrate-from-mui-datatables.md).
- [Comparison](./comparison.md) — where each library fits.
