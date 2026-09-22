# React table headless rendering — useDataTable

`useDataTable` from `@adapttable/react` is the table without markup. Give it
a `TableSource` and your columns; it returns the rows to draw, the sort,
search, pagination and selection state, and prop-getters that put the right
roles, ARIA attributes and handlers on elements you render yourself. Search,
sorting, paging and URL state work exactly as they do under a kit's
`<DataTable>`.

```tsx
import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
} from "@adapttable/react";

interface Person {
  id: string;
  name: string;
  team: string;
  salary: number;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
  {
    key: "salary",
    header: "Salary",
    align: "end",
    sortable: true,
    accessor: (row) => row.salary.toLocaleString(),
    sortValue: (row) => row.salary,
  },
];

export function PeopleTable({ people }: { people: Person[] }) {
  const source = useFrontendData({
    data: people,
    columns,
    paginationMode: "paged",
  });
  const table = useDataTable({ source, columns, rowKey: (row) => row.id });

  return (
    <div>
      <input {...table.getSearchInputProps()} />

      <table {...table.getTableProps()}>
        <thead>
          <tr {...table.getHeaderRowProps()}>
            {table.columns.map((column) => (
              <th key={column.key} {...table.getHeaderCellProps(column)}>
                {column.sortable ? (
                  <button {...table.getSortButtonProps(column)}>
                    {column.header}
                    {table.sortBy === column.key &&
                      (table.sortDir === "asc" ? " ▲" : " ▼")}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={table.getRowKey(row)} {...table.getRowProps(row, index)}>
              {table.columns.map((column) => (
                <td key={column.key} {...table.getCellProps(column)}>
                  {table.getCellContent(column, row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {table.isEmpty && <p>{table.labels.noData}</p>}

      <nav aria-label="Pagination">
        <button
          type="button"
          disabled={source.page <= 1}
          onClick={() => source.setPage(source.page - 1)}
        >
          Previous
        </button>
        <span>
          {table.pagination.fromIndex}–{table.pagination.toIndex} of{" "}
          {source.total}
        </span>
        <button
          type="button"
          disabled={source.page >= table.pagination.totalPages}
          onClick={() => source.setPage(source.page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
```

That is a complete table: typing in the box searches after a 300 ms
debounce, a header button cycles its column ascending → descending →
cleared, and the page, search and sort live in the URL.

## How it works

Two hooks, two jobs:

1. **A source** owns the data and the query state — rows, total, page,
   limit, search, sort, filters, grouping — and the setters that change
   them. It is a `TableSource`, the same contract every kit consumes; see
   [Concepts](./concepts.md#the-tablesource-contract).
2. **`useDataTable`** reads the source and the columns and derives what
   rendering needs: the visible columns for the current layout, the
   debounced search value, pagination figures, selection, filter chips and
   the prop-getters.

`useDataTable` never renders and never fetches. Everything it returns is a
function of the source and the options, so the same hook drives a `<table>`,
a card list, a virtualized grid, or a design system's own components.

Columns are the React `ColumnDef` a kit takes. A column without a `header`
gets one humanized from its `key`, and a column without an `accessor` or
`Cell` reads the row by its key, exactly as under `<DataTable>`.

## Building a source

Every source builder returns a `TableSource`, and `useDataTable` cannot tell
them apart. Pick by where the rows live — the tiers themselves are covered in
[Data tiers](./data-tiers.md).

### In memory — `useFrontendData`

```tsx
import { useFrontendData } from "@adapttable/react";

const source = useFrontendData({ data: people, columns });
```

Search, sort and paging run in memory. Pass `columns` so sorting can read
each column's `sortValue`; `getSearchText`, `getSortValue` and `filterFn`
override the defaults, and `getRowId` defaults to `String(row.id)`.
`paginationMode` defaults to `"auto"` — infinite on viewports at or below
768 px, paged above — so set `"paged"` or `"infinite"` when your markup
renders only one of them.

### Your own fetch — `useServerData`

```tsx
import { useServerData } from "@adapttable/react";
import { useState } from "react";

interface Person {
  id: string;
  name: string;
}

export function usePeopleSource() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  return useServerData({
    rows,
    total,
    loading,
    paginationMode: "paged",
    onQueryChange: async (query, { signal }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
          search: query.search,
        });
        const res = await fetch(`/api/people?${params}`, { signal });
        const body = (await res.json()) as { items: Person[]; total: number };
        setRows(body.items);
        setTotal(body.total);
      } finally {
        setLoading(false);
      }
    },
  });
}
```

`onQueryChange` fires with one consolidated `TableQuery` whenever the query
changes, including once on mount with the URL-restored values, and aborts
the previous call's `signal` when a newer query supersedes it.
`supports` opts the query into the optional fields listed in
[What the query carries](./data-tiers.md#what-the-query-carries-and-how-it-grows);
`facetKeys`, `aggregates`, `nextCursor` and `expandedIds` supply their values.

### A query library — `useQuerySource`

`useQuerySource({ usePaginatedQuery })` wraps your `useInfiniteQuery`-style
query hook into the same contract: it flattens pages in infinite mode, shows the
latest page in paged mode, and clamps out-of-range pages. The full TanStack
Query example is in [Data tiers — Full control](./data-tiers.md#3-full-control--source).

## `useDataTable` options

| Option                  | Type                                | Default        | Description                                                                               |
| ----------------------- | ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------- |
| `source`                | `TableSource<TRow>`                 | required       | The data and query state.                                                                 |
| `columns`               | `ColumnDef<TRow>[]`                 | required       | Column definitions.                                                                       |
| `rowKey`                | `(row: TRow) => string`             | required       | Stable row identity; the React key and, by default, the selection id.                     |
| `tableLabel`            | `string`                            | `labels.table` | The table's accessible name.                                                              |
| `labels`                | `TableLabels`                       | English        | Label overrides, merged over the defaults.                                                |
| `locale`                | `string`                            | —              | Resolves per-column `i18n` data paths for bare-key columns.                               |
| `dir`                   | `"ltr" \| "rtl"`                    | `"ltr"`        | Written to the table element by `getTableProps`.                                          |
| `forceMobile`           | `boolean`                           | `false`        | Use the mobile column set; reported back as `isMobile`.                                   |
| `mobileIdentityColumns` | `number`                            | `3`            | Leading columns anchored in the mobile column set; an explicit `hideOnMobile` still wins. |
| `searchDebounceMs`      | `number`                            | `300`          | Delay between typing and `source.setSearch`.                                              |
| `multiSort`             | `boolean`                           | `false`        | Shift-press on a sort button adds or cycles a sort level instead of replacing the sort.   |
| `bulkActions`           | `BulkAction[]`                      | —              | Any action turns selection on.                                                            |
| `selectionGetId`        | `(row: TRow) => string`             | `rowKey`       | Selection id when it differs from the row key.                                            |
| `selectedIds`           | `readonly string[]`                 | —              | Controlled selection.                                                                     |
| `onSelectedIdsChange`   | `(ids: string[]) => void`           | —              | Change handler for the controlled selection.                                              |
| `filterLabels`          | `Record<string, ChipLabelResolver>` | —              | Chip label per filter key; drives `filterChips`.                                          |
| `fitColumns`            | `boolean`                           | `false`        | Share the container width: `flex` columns get a percentage width.                         |
| `columnWidths`          | `Record<string, number>`            | —              | User widths (for example from a column layout); they win over `width` and `flex`.         |

## The result

| Field                                   | What it is                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `rows`                                  | The rows for the current slice — the page, or everything loaded in infinite mode.               |
| `columns`                               | The columns to render for the current layout, with headers and accessors resolved.              |
| `isEmpty`                               | `true` when there are no rows and the first load is not in progress.                            |
| `isMobile`                              | The `forceMobile` value.                                                                        |
| `labels`                                | Every label, defaults merged with your overrides.                                               |
| `dir`                                   | The resolved direction.                                                                         |
| `pagination`                            | `{ totalPages, safePage, fromIndex, toIndex }`; the indices are 1-based and `0` when empty.     |
| `sortBy` / `sortDir`                    | The primary sort.                                                                               |
| `toggleSort(key)`                       | Advance a column through ascending → descending → cleared.                                      |
| `searchValue` / `setSearchValue`        | The input's immediate value and its setter; the source receives it after the debounce.          |
| `sortByOptions`                         | `{ value, label }` for every sortable column with a text label — the options for a sort select. |
| `selection`                             | `SelectionState` when `bulkActions` is non-empty, else `null`.                                  |
| `filterChips`                           | Removable `{ key, label, onRemove }` chips for active filters that have a `filterLabels` entry. |
| `activeFilterCount`                     | `filterChips.length`.                                                                           |
| `source`                                | The source you passed, for `setPage`, `setLimit`, `fetchNextPage` and the rest.                 |
| `getRowKey(row)`                        | The row's React key — `rowKey`, kept out of `getRowProps`.                                      |
| `getCellContent(column, row, rowIndex)` | The column's `Cell` component when set, else its `accessor` value, else `null`.                 |

Selection is keyed by id, so it survives page, sort and page-size changes; it
resets when the search, the filters or the grouping change the result set.

## Prop-getters

Each getter returns a plain object to spread on an element. Pass your own
props as the last argument and they are merged: `className` values are
joined, `style` objects are merged, event handlers (`on` followed by a
capital letter) both run — the getter's first — and any other key you pass
replaces the getter's value.

```tsx
<tr
  key={table.getRowKey(row)}
  {...table.getRowProps(row, index, {
    className: "people-row",
    onClick: () => openPerson(row.id),
  })}
/>
```

| Getter                               | Returns                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTableProps(props?)`              | `role: "table"`, `dir`, `aria-label` (`tableLabel`, else `labels.table`).                                                                                                                 |
| `getHeaderRowProps(props?)`          | `role: "row"`.                                                                                                                                                                            |
| `getHeaderCellProps(column, props?)` | `role: "columnheader"`, `scope: "col"`, `aria-sort` (`"ascending"`, `"descending"` or `"none"` on sortable columns, absent otherwise), `data-sort-index`, `data-column-key`, and `style`. |
| `getSortButtonProps(column, props?)` | `type: "button"`, `disabled` (`true` when the column is not sortable), `onClick`, `data-sort-index`, and `aria-label` (`"Sort by: <header>"`).                                            |
| `getRowProps(row, index, props?)`    | `role: "row"`, `data-adapttable-part: "row"`, `data-row-id`, `data-index` (the `index` you pass), and `aria-selected` while selection is on. Never a `key`.                               |
| `getCellProps(column, props?)`       | `role: "cell"`, `data-column-key`, and `style`.                                                                                                                                           |
| `getSearchInputProps(props?)`        | `type: "search"`, `role: "searchbox"`, `value`, `placeholder` (`labels.searchPlaceholder`), `aria-label` (`labels.search`), and `onChange`.                                               |

The `style` on header and body cells carries `textAlign` from the column's
`align` (`start`, `center` or `end`, so it follows the writing direction) and,
when the column states any, `width`, `minWidth` and `maxWidth` — the user's
width from `columnWidths` first, then the column's `width`, then its `flex`
share under `fitColumns`.

`data-sort-index` is the column's 1-based place in a multi-column sort and is
present only while it is sorted. The sort button's `onClick` accepts the
click event: with `multiSort: true`, a Shift-press toggles the column's level
in the sort chain instead of replacing the sort.

`data-index` is also the attribute a virtualizer measures by, which is why
`getRowProps` takes the index: pass the row's position in the source rows,
not its position on screen.

## Selection

Pass `bulkActions` and `selection` becomes a `SelectionState`:

```tsx
import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
} from "@adapttable/react";

interface Person {
  id: string;
  name: string;
}

const columns: ColumnDef<Person>[] = [{ key: "name" }];

export function SelectablePeople({
  people,
  onArchive,
}: {
  people: Person[];
  onArchive: (ids: string[]) => void;
}) {
  const source = useFrontendData({ data: people, columns });
  const table = useDataTable({
    source,
    columns,
    rowKey: (row) => row.id,
    bulkActions: [{ key: "archive", label: "Archive", onClick: onArchive }],
  });
  const selection = table.selection;

  return (
    <table {...table.getTableProps()}>
      <thead>
        <tr {...table.getHeaderRowProps()}>
          <th scope="col">
            <input
              type="checkbox"
              aria-label={table.labels.selectAll}
              checked={selection?.headerState === "all"}
              onChange={() => selection?.toggleAll()}
            />
          </th>
          {table.columns.map((column) => (
            <th key={column.key} {...table.getHeaderCellProps(column)}>
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, index) => (
          <tr key={table.getRowKey(row)} {...table.getRowProps(row, index)}>
            <td>
              <input
                type="checkbox"
                aria-label={table.labels.selectRow}
                checked={selection?.isSelected(row.id) ?? false}
                onChange={() => selection?.toggle(row.id)}
              />
            </td>
            {table.columns.map((column) => (
              <td key={column.key} {...table.getCellProps(column)}>
                {table.getCellContent(column, row, index)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

`selection` also carries `selectedIds`, `selectedCount`, `clear`,
`replace`, `selectAllMatching` and `allMatching` for a "select every match"
banner, and `headerState` (`"all"`, `"some"` or `"none"`) for an
indeterminate header box. `useBulkActionRunner` runs an action through a
confirm handler; see [Selection & bulk actions](./selection.md).

## Mobile cards

`useDataTable` does not watch the viewport. Read it with `useIsMobile()` —
a `(max-width: 768px)` media query by default, `useIsMobile(px)` for another
breakpoint — and pass the answer as `forceMobile`. `columns` then drops the
columns marked `hideOnMobile`, and mobile-only columns (`hideOnDesktop`)
appear.

```tsx
import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
  useIsMobile,
} from "@adapttable/react";

interface Person {
  id: string;
  name: string;
  team: string;
  email: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team", sortable: true },
  { key: "email", header: "Email", hideOnMobile: true },
];

export function People({ people }: { people: Person[] }) {
  const isMobile = useIsMobile();
  const source = useFrontendData({
    data: people,
    columns,
    paginationMode: "paged",
  });
  const table = useDataTable({
    source,
    columns,
    rowKey: (row) => row.id,
    forceMobile: isMobile,
  });

  if (!table.isMobile) {
    // …the <table> from the first example
    return null;
  }

  return (
    <div>
      <label>
        {table.labels.sortBy}{" "}
        <select
          value={table.sortBy ?? ""}
          onChange={(event) =>
            source.setSort(event.currentTarget.value || undefined, "asc")
          }
        >
          <option value="">—</option>
          {table.sortByOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <ul aria-label={table.labels.table}>
        {table.rows.map((row, index) => (
          <li key={table.getRowKey(row)}>
            <dl>
              {table.columns.map((column) => (
                <div key={column.key}>
                  <dt>{column.mobileLabel ?? column.header}</dt>
                  <dd>{table.getCellContent(column, row, index)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

A card has no header to click, so sorting moves to a select built from
`sortByOptions`. `getRowProps` returns `role: "row"`, which belongs inside a
table; a list item takes its key from `getRowKey` instead. Kit adapters make
the same switch at the same 768 px default — see
[Mobile cards](./mobile.md).

## Virtualization

`useTableVirtualization` windows any list of rows: it returns the slice to
mount and the space above and below it. It is exported from
`@adapttable/react` and uses `@tanstack/react-virtual`, a dependency of that
package.

```tsx
import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
  useTableVirtualization,
} from "@adapttable/react";
import { useRef } from "react";

interface Reading {
  id: string;
  sensor: string;
  value: number;
}

const columns: ColumnDef<Reading>[] = [
  { key: "sensor", header: "Sensor", sortable: true },
  {
    key: "value",
    header: "Value",
    align: "end",
    accessor: (row) => row.value,
  },
];

export function Readings({ readings }: { readings: Reading[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const source = useFrontendData({
    data: readings,
    columns,
    paginationMode: "infinite",
  });
  const table = useDataTable({ source, columns, rowKey: (row) => row.id });
  const virtual = useTableVirtualization({
    rows: table.rows,
    rowKey: table.getRowKey,
    enabled: true,
    estimateSize: 40,
    getScrollElement: () => scrollRef.current,
    onEndReached: source.fetchNextPage,
  });

  return (
    <div ref={scrollRef} style={{ maxHeight: 400, overflow: "auto" }}>
      <table {...table.getTableProps()}>
        <thead>
          <tr {...table.getHeaderRowProps()}>
            {table.columns.map((column) => (
              <th key={column.key} {...table.getHeaderCellProps(column)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {virtual.paddingTop > 0 && (
            <tr aria-hidden="true" style={{ height: virtual.paddingTop }}>
              <td colSpan={table.columns.length} />
            </tr>
          )}
          {virtual.rows.map(({ row, index, key }) => (
            <tr
              key={key}
              ref={virtual.measureElement}
              {...table.getRowProps(row, index)}
            >
              {table.columns.map((column) => (
                <td key={column.key} {...table.getCellProps(column)}>
                  {table.getCellContent(column, row, index)}
                </td>
              ))}
            </tr>
          ))}
          {virtual.paddingBottom > 0 && (
            <tr aria-hidden="true" style={{ height: virtual.paddingBottom }}>
              <td colSpan={table.columns.length} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

With `getScrollElement` the window tracks that element; without it, it tracks
the page, and `scrollMargin` is the list's offset from the top of the
document. Each mounted row is measured through `measureElement`, which reads
the `data-index` that `getRowProps` writes. `onEndReached` fires once each
time the window reaches the last loaded row, which is where an infinite
source loads more.

| Option             | Type                                    | Default  | Description                                                                       |
| ------------------ | --------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `rows`             | `readonly TRow[]`                       | required | The rows to window — usually `table.rows`.                                        |
| `rowKey`           | `(row: TRow) => string`                 | required | Stable row key.                                                                   |
| `enabled`          | `boolean`                               | `false`  | Off returns every row with no spacers, so one render path serves both cases.      |
| `estimateSize`     | `number \| ((index: number) => number)` | `56`     | Row height estimate in px, before measurement.                                    |
| `overscan`         | `number`                                | `8`      | Rows mounted beyond each edge of the visible window.                              |
| `getScrollElement` | `() => Element \| null`                 | —        | The scroll box to track; omit to track the page.                                  |
| `scrollMargin`     | `number`                                | `0`      | Page mode only: the list's offset from the top of the document.                   |
| `onEndReached`     | `() => void`                            | —        | Called when the window reaches the last row.                                      |
| `expandable`       | `boolean`                               | `false`  | Rows carry a detail row; each pair is measured together through `measureRowPair`. |

It returns `{ enabled, rows, paddingTop, paddingBottom, measureElement?,
measureRowPair? }`, where each entry of `rows` is `{ row, index, key,
virtualItem? }`. A windowed table mounts a fraction of its rows, so tell
assistive technology the real size: set `aria-rowcount` on the table and
`aria-rowindex` on each row, as the kit adapters do — see
[Virtualization](./virtualization.md) and
[Accessibility](./accessibility.md).

## URL state

The source builders keep their state in the query string through
`useTableUrlState`, so a headless table has shareable, reload-safe URLs with
no extra code. All three builders take the same URL options:

| Option            | Default     | Description                                                                         |
| ----------------- | ----------- | ----------------------------------------------------------------------------------- |
| `urlSync`         | `true`      | `false` keeps the state in component memory instead of the URL.                     |
| `urlKey`          | —           | Namespace for this table's params (`left.q`, `left.page`, …) when a URL holds two.  |
| `urlAdapter`      | History API | A `UrlStateAdapter` for your router.                                                |
| `defaults`        | —           | Initial `page`, `limit`, `search`, sort and `extra` values while the URL is silent. |
| `numberExtraKeys` | —           | Extra-filter keys parsed as numbers.                                                |
| `arrayExtraKeys`  | —           | Extra-filter keys parsed as comma-separated arrays.                                 |

State that is not a query field has its own hook, each returning a value and
a change handler to wire into your controls:

| Hook                       | Returns                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `useColumnLayoutUrlState`  | `{ layout, onLayoutChange }` — hidden, order, pinned, widths, names |
| `useDensityUrlState`       | `{ density, onDensityChange }`                                      |
| `useGroupCollapseUrlState` | `{ collapsedGroupIds, onCollapsedGroupIdsChange }`                  |
| `useRowPinningUrlState`    | `{ pinnedRowIds, onPinnedRowIdsChange }`                            |

Each takes `urlKey`, `urlSync` and `urlAdapter`. `createHistoryAdapter()`
and `createMemoryAdapter(initialSearch?)` build adapters; router adapters
for react-router, TanStack Router and Next.js, the param names, and the
format guarantees are in [URL state](./url-state.md).

## Headless or an adapter

`useDataTable` is the right level when the markup is yours: a design system
the kits do not cover, a card-first layout, or a table embedded in a larger
component. The prop-getters carry the semantics; the controls around them —
pagination, filter forms, column menus, toolbars — are yours to draw.

When the goal is a complete table for a UI kit that AdaptTable does not ship,
with the feature factories, slots and every built-in behaviour, write an
adapter on the `@adapttable/react/adapter` builder tier instead — see
[Building an adapter](./building-an-adapter.md). Using a kit AdaptTable
already supports, `<DataTable>` from `@adapttable/<kit>` is the shorter path;
its `classNames`, `slots` and `renderCard` cover most visual changes without
leaving it ([Customization](./customization.md)).

## Notes

- `useDataTable` does not apply filters on its own. `useFrontendData`
  filters through `filterFn` and `filterTreeFn`; server sources send the
  filter state in the query. Set filter values with `source.setExtra`.
- `getTableProps` always returns `role: "table"`. Keyboard grid navigation
  (`role="grid"`, roving focus, ranges) is `useGridFocus`; see
  [Cell navigation](./cell-navigation.md#headless).
- Infinite mode without virtualization pairs with `useInfiniteScroll`, a
  sentinel ref that calls `fetchNextPage` as the end of the list comes into
  view; see [Pagination modes](./concepts.md#pagination-modes).
- Export works headless too: `downloadTableCsv({ source, columns, writer })`
  from `@adapttable/core` builds and downloads the file the export button
  would, with any writer — see [Excel (XLSX) export](./export-xlsx.md).
