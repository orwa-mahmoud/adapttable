# mui-datatables alternative — maintained, MUI v6+, React 19

[mui-datatables](https://github.com/gregnb/mui-datatables) served a generation
of Material UI apps well — but it has had **no releases or commits since
January 2023** (last version 4.3.0). Its peer range stops at
`@mui/material ^5`, so **MUI v6 and v7 apps can't install it cleanly**, React
19 is unsupported, and ~624 open issues sit unaddressed. If your app is stuck
on MUI v5 because of your table, this page is the way out.

`@adapttable/mui` renders real Material UI components — supported across
**MUI v5 through v9** — so migrating unfreezes your MUI upgrade path while
keeping the Material look. This page maps the API across and shows a
before/after.

## Why move

All verifiable as of mid-2026:

- **Unmaintained**: no releases or commits since January 2023; hundreds of
  open issues and PRs without a response.
- **Version lock**: peer dependencies require `@mui/material ^5.11` — npm
  refuses clean installs on MUI v6/v7, and React 19 is outside the peer range.
  Your table shouldn't decide your framework versions.
- **Weight**: ~102 kB gzipped with 18 runtime dependencies (it bundles
  drag-and-drop, print, and CSV machinery whether you use them or not).
  AdaptTable core + the MUI adapter is ~45 kB min+gzip, tree-shaken.
- **No bundled types**: TypeScript definitions live in community
  `@types/mui-datatables` and can drift. AdaptTable is TypeScript-first.

## What you gain

Beyond the unfreeze: URL-synced shareable state (filters, search, sort, page
in the query string — reload-safe), one data contract for client **and**
server data instead of the `onTableChange` action switch, chips for active
filters, an automatic mobile card layout (no `responsive` mode quirks), saved
views, and opt-in virtualization. See the [feature
overview](./getting-started.md).

## Install

```bash
pnpm add @adapttable/core @adapttable/mui @mui/material
```

Works with your existing MUI theme — and lets you upgrade `@mui/material`
whenever you want.

## Prop mapping

`<MUIDataTable>` → `<DataTable>`:

| mui-datatables                                        | `@adapttable/mui`                                     | Notes                                                                |
| ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- |
| `data` (objects)                                      | `data`                                                | Array-of-objects only; no array-of-arrays mode.                      |
| `data` (arrays)                                       | convert to objects                                    | One `map()` at the boundary — see Gotchas.                           |
| `columns` (`name`, `label`, `options`)                | `columns` (`key`, `header`, …)                        | Field-by-field below.                                                |
| `options.serverSide` + `count` + `onTableChange`      | `data` + `total` + `onQueryChange`                    | One consolidated query object replaces the action-string switch.     |
| `options.page` / `rowsPerPage` / `rowsPerPageOptions` | automatic                                             | Built-in pager; page size control included.                          |
| `options.sortOrder` / `onColumnSortChange`            | per-column `sortable` (+ `multiSort`)                 | AdaptTable owns and applies sort state.                              |
| `options.filterType` / `onFilterChange`               | column `filter` shorthand + table `filters`           | Kit-native widgets + removable chips, derived for you.               |
| `options.search` / `searchText` / `onSearchChange`    | built-in search (`searchPlaceholder`, `hideSearch`)   | Debounced and URL-synced.                                            |
| `options.selectableRows` + `onRowSelectionChange`     | `bulkActions`, or `selectedIds` / `onSelectionChange` | Providing `bulkActions` enables selection + the bulk bar.            |
| `options.expandableRows` + `renderExpandableRow`      | `renderRowDetail`                                     | `(row) => ReactNode` — no separate flag, no colSpan markup.          |
| `options.viewColumns` / `draggableColumns`            | `enableColumnMenu`                                    | Show/hide, reorder, and pin in one menu.                             |
| `options.resizableColumns`                            | `resizableColumns`                                    | Drag + keyboard resize.                                              |
| `options.responsive` (`'vertical'`, …)                | automatic mobile cards                                | Cards render below the breakpoint — no mode to configure.            |
| `options.download` / `print`                          | `rowsToCsv` / `downloadCsv` helpers                   | CSV as a headless helper you wire to your own button; print via CSS. |
| `options.textLabels`                                  | `labels`                                              | Same idea; English defaults fill missing keys.                       |
| `options.storageKey`                                  | `savedViews` / URL state                              | Views are named, shareable snapshots instead of one implicit save.   |

Column options → `ColumnDef`:

| mui-datatables                                    | `@adapttable/mui`                       | Notes                                                                  |
| ------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `name`                                            | `key`                                   | Dot paths reach nested values without `enableNestedDataAccess`.        |
| `label`                                           | `header`                                | Auto-derived from `key` when omitted.                                  |
| `options.customBodyRender(value, tableMeta)`      | `Cell` (component) or `accessor: (row)` | You get the **row object**, not index bookkeeping.                     |
| `options.customBodyRenderLite(dataIndex)`         | `Cell`                                  | Row memoization is built in — no "lite" variant needed.                |
| `options.display` / `viewColumns`                 | `enableColumnMenu` (+ `columnLayout`)   | User-facing visibility lives in the Columns menu.                      |
| `options.filter` / `filterType` / `filterOptions` | `filter` shorthand                      | `"text"`, `"select"`, `"multiSelect"`, `"numberRange"`, `"dateRange"`. |
| `options.sort` / `sortCompare`                    | `sortable` / `sortValue`                | `sortValue` extracts the comparable primitive.                         |
| `options.setCellProps` / `setCellHeaderProps`     | `align`, `width`, `className` hooks     | Common cases are first-class props.                                    |

## Server-side data: retire the action switch

mui-datatables server mode means `serverSide: true`, a `count`, and an
`onTableChange(action, tableState)` callback where you `switch` over action
strings — `'changePage'`, `'sort'`, `'search'`, `'filterChange'`,
`'changeRowsPerPage'` — re-fetching in each case (the library throws if
`onTableChange` is missing). AdaptTable replaces the whole dispatch with one
callback receiving one consolidated query:

```tsx
<DataTable
  data={rows}
  total={total}
  loading={loading}
  onQueryChange={async (query, { signal }) => {
    // query: { page, limit, search, sortBy, sortDir, filters } — one shape,
    // fired once per real change (mount included), previous fetch aborted.
    const res = await fetch(`/api/people?${toParams(query)}`, { signal });
    const body = await res.json();
    setRows(body.items);
    setTotal(body.total);
  }}
  columns={columns}
  rowKey={(r) => r.id}
/>
```

## Before / after

**Before** — mui-datatables:

```tsx
import MUIDataTable from "mui-datatables";

function PeopleTable({ people }) {
  return (
    <MUIDataTable
      title="People"
      data={people}
      columns={[
        { name: "name", label: "Name" },
        { name: "role", label: "Role" },
        {
          name: "status",
          label: "Status",
          options: {
            filter: true,
            customBodyRender: (value) => <StatusChip value={value} />,
          },
        },
      ]}
      options={{
        filterType: "dropdown",
        selectableRows: "multiple",
        responsive: "vertical",
      }}
    />
  );
}
```

**After** — `@adapttable/mui` (typed, URL-synced, MUI v5–v9):

```tsx
import { type CellProps, DataTable } from "@adapttable/mui";

function StatusCell({ row }: CellProps<Person>) {
  return <StatusChip value={row.status} />;
}

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      bulkActions={bulkActions}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        {
          key: "status",
          Cell: StatusCell,
          filter: { type: "select", options: "auto" },
        },
      ]}
    />
  );
}
```

## Gotchas

- **Array-of-arrays data isn't supported.** If your `data` is
  `[["Ada", "Engineer"], …]`, map it to objects once at the boundary:
  `rows.map(([name, role], i) => ({ id: String(i), name, role }))` — and use a
  real id when you have one.
- **`rowKey` is required.** mui-datatables keys rows by index internally;
  AdaptTable wants a stable id.
- **`customBodyRender` receives a value; `Cell` receives the row.** Rewrites
  usually get simpler — no `tableMeta.rowData[…]` index lookups.
- **Filters become declarative.** A `filterType: "dropdown"` column becomes
  `filter: { type: "select", options: "auto" }`; ranges become
  `"numberRange"` / `"dateRange"` with operator widgets and chips included.
- **No built-in print/CSV buttons.** CSV is a headless helper
  (`rowsToCsv` / `downloadCsv`) you attach to your own toolbar button via the
  `toolbar` slot; print is your app's concern.
- **`textLabels` → `labels`**, and locale presets (incl. RTL languages) come
  from [`@adapttable/i18n`](./i18n-rtl.md).

## Where next

- [Getting started](./getting-started.md) · [Data tiers](./data-tiers.md) ·
  [Filtering](./filtering.md) · [Column management](./column-management.md).
- Also migrating the grid elsewhere in your app? See
  [Migrate from MUI X DataGrid](./migrate-from-mui-x-datagrid.md).
- [Comparison](./comparison.md) — where each library fits.
