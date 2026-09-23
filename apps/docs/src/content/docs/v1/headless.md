---
title: "Headless React table — useDataTable getters (v1)"
description: "Build your own table markup on AdaptTable's engine: useDataTable
  returns table, row and cell prop-getters plus sort, search, paging and
  selection state."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"Headless
      React table — useDataTable
      getters","item":"https://orwa-mahmoud.github.io/adapttable/v1/headless/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/headless.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/headless.png
slug: v1/headless
---

`useDataTable` from `@adapttable/core` is the engine every adapter's
`<DataTable>` renders from. It takes a `TableSource` plus your columns and
returns derived state and accessible prop-getters, so you render any markup
— a plain `<table>`, a CSS grid, or your design system's primitives — while
search, sorting, pagination, selection, filter chips and URL sync stay
handled.

## Example

```tsx
import {
  type BulkAction,
  type ColumnDef,
  getPath,
  humanizeKey,
  useDataTable,
  useFrontendData,
} from "@adapttable/core";

interface Person {
  id: string;
  name: string;
  role: string;
  salary: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace", role: "Engineer", salary: 98000 },
  { id: "2", name: "Alan Turing", role: "Founder", salary: 112000 },
  { id: "3", name: "Grace Hopper", role: "Admiral", salary: 105000 },
];

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "role" }, // header derives from the key
  {
    key: "salary",
    header: "Salary",
    sortable: true,
    align: "end",
    accessor: (r) => r.salary.toLocaleString(),
    sortValue: (r) => r.salary, // sort by the number, not the formatted text
  },
];

const bulkActions: BulkAction[] = [
  { key: "export", label: "Export", onClick: (ids) => console.log(ids) },
];

function cellContent(
  row: Person,
  rowIndex: number,
  column: ColumnDef<Person>,
) {
  if (column.Cell) return <column.Cell row={row} rowIndex={rowIndex} />;
  if (column.accessor) return column.accessor(row);
  const value = getPath(row, column.key);
  return value == null ? "" : String(value);
}

export function PeopleTable() {
  // Any TableSource works here: useFrontendData, useServerData, useBackendData.
  const source = useFrontendData({
    data: PEOPLE,
    columns,
    paginationMode: "paged",
  });

  const table = useDataTable({
    source,
    columns,
    rowKey: (r) => r.id,
    tableLabel: "People",
    bulkActions,
  });
  const { selection, pagination } = table;

  return (
    <div>
      <input {...table.getSearchInputProps()} />

      {selection && selection.selectedCount > 0 && (
        <div>
          {selection.selectedCount} selected
          {bulkActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() =>
                void action.onClick([...selection.selectedIds], {
                  allMatching: selection.allMatching,
                  total: source.total,
                })
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <table {...table.getTableProps()}>
        <thead>
          <tr {...table.getHeaderRowProps()}>
            {selection && (
              <th>
                <input
                  type="checkbox"
                  aria-label={table.labels.selectAll}
                  checked={selection.headerState === "all"}
                  ref={(el) => {
                    if (el) el.indeterminate = selection.headerState === "some";
                  }}
                  onChange={selection.toggleAll}
                />
              </th>
            )}
            {table.columns.map((column) => {
              const label = column.header ?? humanizeKey(column.key);
              return (
                <th key={column.key} {...table.getHeaderCellProps(column)}>
                  {column.sortable ? (
                    <button {...table.getSortButtonProps(column)}>
                      {label}
                      {table.sortBy === column.key &&
                        (table.sortDir === "asc" ? " ▲" : " ▼")}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => {
            // getRowProps includes `key`; pass it explicitly, not via spread.
            const { key, ...rowProps } = table.getRowProps(row, index);
            return (
              <tr key={String(key)} {...rowProps}>
                {selection && (
                  <td>
                    <input
                      type="checkbox"
                      aria-label={table.labels.selectRow}
                      checked={selection.isSelected(row.id)}
                      onChange={() => selection.toggle(row.id)}
                    />
                  </td>
                )}
                {table.columns.map((column) => (
                  <td key={column.key} {...table.getCellProps(column)}>
                    {cellContent(row, index, column)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {table.isEmpty && <p>No results.</p>}

      <nav aria-label="Pagination">
        <button
          type="button"
          disabled={pagination.safePage <= 1}
          onClick={() => source.setPage(pagination.safePage - 1)}
        >
          {table.labels.previousPage}
        </button>
        <span>
          {pagination.fromIndex}–{pagination.toIndex} of {source.total}
        </span>
        <button
          type="button"
          disabled={pagination.safePage >= pagination.totalPages}
          onClick={() => source.setPage(pagination.safePage + 1)}
        >
          {table.labels.nextPage}
        </button>
      </nav>
    </div>
  );
}
```

## How it works

* **The source owns the data and the state.** `useFrontendData` filters,
  sorts and slices an in-memory array; `useServerData` holds the query state
  and emits one `TableQuery` to your `onQueryChange` handler; `useBackendData`
  wraps a TanStack `useInfiniteQuery` hook. All three return the same
  `TableSource`, and all three keep page, page size, search, sort and the
  extra-filter bag in the URL by default (`enabled: false` keeps it in memory
  instead). See [data tiers](/adapttable/v1/data-tiers/).
* **`useDataTable` derives, it does not fetch.** It resolves the visible
  columns for the layout, debounces the search input, derives pagination
  figures and filter chips, owns selection, and builds prop-getters. Every
  write goes back through the source's setters.
* **Prop-getters merge your overrides.** Each getter takes an optional props
  object: `onX` event handlers are composed so both run, `className` strings
  are concatenated, `style` objects are merged, and any other key replaces
  the getter's value — `getTableProps({ role: undefined })` drops the role.
* **Sorting.** `getSortButtonProps(column).onClick` advances the column
  through ascending → descending → cleared (`toggleSort(key)` does the same).
  With `multiSort`, a shift-click adds the column to a multi-sort chain
  instead (`source.toggleSortLevel`), and header cells and sort buttons carry
  a 1-based `data-sort-index` for each chained column. Header cells get
  `aria-sort` (`"none"` on inactive sortable columns, omitted on unsortable
  ones).
* **Search.** `getSearchInputProps()` returns a controlled `type="search"`
  input. Typing updates `searchValue` immediately and commits the trimmed
  term to `source.setSearch` after `searchDebounceMs`; an external change
  (back button, deep link, clear-all) flows back into the input.
* **Pagination.** `pagination` holds `totalPages`, `safePage` (the page
  clamped into range), and the 1-based `fromIndex`/`toIndex` of the current
  slice (both `0` when empty). Move with `source.setPage(n)` and
  `source.setLimit(n)`; the latter resets to page 1. For infinite mode, read
  `source.hasNextPage` / `source.isFetchingNextPage` and call
  `source.fetchNextPage()`.
* **Selection.** Selection is on only when `bulkActions` is non-empty;
  otherwise `selection` is `null` and rows carry no `aria-selected`. Ids come
  from `selectionGetId`, falling back to `rowKey`. The selection survives
  page, sort and page-size changes and clears when the search term, the
  extra-filter values or `groupBy` change. Pass `selectedIds` +
  `onSelectedIdsChange` to control it.
* **Filter chips.** Keys listed in `filterLabels` become removable chips in
  `filterChips` (removing one clears that key via `source.setExtra`), and
  `activeFilterCount` is their count. Write filter values with
  `source.setExtra` / `source.setExtras`; clear them with
  `source.clearExtras()`, or everything with `source.clearAll()`.
* **Layout.** `isMobile` switches the column set: desktop drops
  `hideOnDesktop` columns; mobile drops `hideOnMobile` columns but always
  keeps the first `mobileIdentityColumns` desktop-visible columns.
  `sortByOptions` lists `{ value, label }` for sortable columns with a string
  `header` (or `mobileLabel`), for a sort select where headers are not
  clickable.
* In development, duplicate column keys log a warning.

## Options

`useDataTable(options)`:

| Option                | Type                                  | Default                        | Description                                                                      |
| --------------------- | ------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| `source`              | `TableSource<TRow>`                   | —                              | Data + state from `useFrontendData`, `useServerData`, `useBackendData`, or yours. |
| `columns`             | `ColumnDef<TRow>[]`                   | —                              | Column definitions.                                                              |
| `rowKey`              | `(row: TRow) => string`               | —                              | Stable row key; also the selection id unless `selectionGetId` is set.           |
| `tableLabel`          | `string`                              | `labels.table` (`"Data table"`) | `aria-label` for the table element.                                              |
| `labels`              | `TableLabels`                         | English defaults               | Pre-translated label overrides.                                                  |
| `dir`                 | `"ltr" \| "rtl"`                      | `"ltr"`                        | Text direction, applied by `getTableProps`.                                      |
| `isMobile`            | `boolean`                             | `false`                        | Selects the mobile column set.                                                   |
| `mobileIdentityColumns` | `number`                            | `3`                            | Leading desktop-visible columns always kept on mobile.                           |
| `searchDebounceMs`    | `number`                              | `300`                          | Delay before the search input commits to the source.                             |
| `bulkActions`         | `BulkAction[]`                        | —                              | A non-empty list turns selection on.                                             |
| `selectionGetId`      | `(row: TRow) => string`               | `rowKey`                       | Selection id extractor.                                                          |
| `selectedIds`         | `readonly string[]`                   | —                              | Controlled selection.                                                            |
| `onSelectedIdsChange` | `(selectedIds: string[]) => void`     | —                              | Change channel for the controlled selection.                                     |
| `filterLabels`        | `Record<string, ChipLabelResolver>`   | `{}`                           | Per-key chip label resolvers (`(value: string) => string`).                      |
| `multiSort`           | `boolean`                             | `false`                        | Shift-click on a sort button adds a multi-sort level.                            |

## API

### Returned state

| Field               | Type                                  | Description                                                           |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------- |
| `rows`              | `readonly TRow[]`                     | The rows of the current page or slice (`source.rows`).                |
| `isEmpty`           | `boolean`                             | No rows and the source is not loading.                                |
| `columns`           | `ColumnDef<TRow>[]`                   | Columns visible for the current layout.                               |
| `isMobile`          | `boolean`                             | The `isMobile` option, echoed.                                        |
| `sortByOptions`     | `SortByOption[]`                      | `{ value, label }` for each labelled sortable column.                 |
| `labels`            | `Required<TableLabels>`               | English defaults merged with `labels`.                                |
| `dir`               | `"ltr" \| "rtl"`                      | The resolved direction.                                               |
| `pagination`        | `PaginationInfo`                      | `{ totalPages, safePage, fromIndex, toIndex }`.                       |
| `sortBy`            | `string \| undefined`                 | Active sort column key.                                               |
| `sortDir`           | `"asc" \| "desc" \| undefined`        | Active sort direction.                                                |
| `toggleSort`        | `(key: string) => void`               | Advance the sort cycle for a column.                                  |
| `searchValue`       | `string`                              | The live search input value.                                          |
| `setSearchValue`    | `(next: string) => void`              | Update the live value (commits after the debounce).                  |
| `selection`         | `SelectionState \| null`              | Selection state and actions; `null` without `bulkActions`.            |
| `filterChips`       | `ActiveFilterChip[]`                  | `{ key, label, onRemove }` for each active `filterLabels` key.        |
| `activeFilterCount` | `number`                              | `filterChips.length`.                                                 |
| `source`            | `TableSource<TRow>`                   | The source, for setters, `total`, `isLoading`, `error`, `fetchNextPage`, `refetch`. |

`SelectionState`: `selectedIds` (`ReadonlySet<string>`), `selectedCount`,
`headerState` (`"all" | "some" | "none"` over the visible rows),
`isSelected(id)`, `toggle(id)`, `toggleAll()` (select every visible row, or
deselect them when all are selected), `toggleGroupLeaves(ids)`, `clear()`,
`visibleIds`, `allMatching`, and `selectAllMatching()` (marks the selection
as every matching row across pages; pass `allMatching` to your bulk action).

### Prop-getters

| Getter                               | Returns                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `getTableProps(props?)`              | `role: "table"`, `dir`, `aria-label`.                                                                             |
| `getHeaderRowProps(props?)`          | `role: "row"`.                                                                                                    |
| `getHeaderCellProps(column, props?)` | `role: "columnheader"`, `aria-sort`, `data-sort-index`, `style: { textAlign, width }`.                            |
| `getSortButtonProps(column, props?)` | `type: "button"`, `disabled` (unsortable columns), `onClick`, `data-sort-index`, `aria-label` (`"Sort by: <header>"`). |
| `getRowProps(row, index, props?)`    | `role: "row"`, `data-index`, `key` (from `rowKey`), `aria-selected` when selection is on.                          |
| `getCellProps(column, props?)`       | `role: "cell"`, `style: { textAlign, width }`.                                                                    |
| `getSearchInputProps(props?)`        | `type: "search"`, `role: "searchbox"`, `value`, `placeholder` (`"Search…"`), `aria-label` (`"Search"`), `onChange`. |

`textAlign` maps the column's `align` to `"start"`, `"center"` or `"end"`
(default `"start"`); `width` is the column's `width`.

### Sources

| Hook                       | Use it for                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `useFrontendData(options)` | Rows in memory: `data`, optional `columns` (for `sortValue`), `getSearchText`, `getSortValue`, `filterFn`, `paginationMode` (default `"auto"`: infinite on mobile). |
| `useServerData(options)`   | A paginated API without a query library: `rows`, `total`, `loading`, `error`, `onQueryChange(query, { signal })`. Always paged. |
| `useBackendData(options)`  | TanStack Query: `usePaginatedQuery`, `selectPage`, `baseParams`, `sanitizeParams`, `paginationMode`.           |

All three also accept `adapter`, `enabled`, `defaults`, `numberExtraKeys`,
`arrayExtraKeys` and `urlKey` for URL state.

## Notes

* `useDataTable` renders nothing on its own: loading and error UI come from
  `source.isLoading`, `source.isFetching` and `source.error`.
* `useFrontendData` with the default `paginationMode: "auto"` switches to
  infinite mode on mobile (a media query), where `rows` grows as
  `fetchNextPage()` runs. Pass `"paged"` or `"infinite"` to pin it.
* For infinite scroll without a button, `useInfiniteScroll` provides the
  sentinel; for long lists, `useTableVirtualization` windows the rows. Both
  are exported from `@adapttable/core`.
* Two tables on one page need distinct `urlKey`s on their sources; a
  development warning fires when two share a namespace.

Related: [concepts](/adapttable/v1/concepts/) · [data tiers](/adapttable/v1/data-tiers/) ·
[customization](/adapttable/v1/customization/) · [sorting](/adapttable/v1/sorting/) ·
[pagination](/adapttable/v1/pagination/) · [selection](/adapttable/v1/selection/) ·
[URL state](/adapttable/v1/url-state/) · [API reference](/adapttable/v1/api/)
