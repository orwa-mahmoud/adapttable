# AdaptTable concepts — headless core, TableSource, adapters

▶ **See it working:** [the live demo](https://adapttable.orwamahmoud.com/react/demo/) — one dataset, one feature set, re-rendered by every real adapter.

## The `TableSource` contract

Everything in AdaptTable revolves around one idea: a **`TableSource<T>`** —
a uniform contract that a table consumes regardless of where its rows came
from. Every built-in source builder (`useFrontendData`, `useServerData`,
`useQuerySource`) fulfils it, and the table renders without knowing which
produced it.

```ts
interface TableSource<TRow> {
  // data
  rows: readonly TRow[];
  total: number;
  isLoading: boolean; // FIRST load only — refreshes never re-raise it
  isFetching: boolean; // any in-flight request
  isFetchingNextPage: boolean; // an append fetch (infinite mode)
  hasNextPage: boolean; // more rows can be APPENDED (always false when paged)
  fetchNextPage: () => void; // appends; no-op in paged mode
  error: Error | null;
  paginationMode: "infinite" | "paged";
  // state
  page: number;
  limit: number;
  defaultLimit: number; // page size when the URL names none
  search: string;
  sortBy: string | undefined;
  sortDir: "asc" | "desc" | undefined;
  sortLevels: readonly SortLevel[]; // multi-sort chain, empty when unused
  extra: ExtraFilters; // Record<string, string | string[] | number | undefined>
  groupBy: string | undefined; // comma-separated grouping keys
  // setters
  setPage: (next: number) => void;
  setLimit: (next: number) => void;
  setSort: (key: string | undefined, dir?: "asc" | "desc") => void;
  toggleSortLevel: (key: string) => void;
  setSearch: (next: string) => void;
  setExtra: (key: string, value: FilterValue) => void;
  setExtras: (updates: ExtraFilters) => void;
  setGroupBy: (key: string | undefined) => void;
  clearExtras: () => void;
  clearAll: () => void;
}
```

Optional members a source adds when it can: `refetch`, `allFilteredRows`,
`allSearchedRows`, `facets`, `filterTree` / `setFilterTree`, `capabilities`,
`groups`, `tableEngine`, `initializeGroupBy`, `setGroupAggregateOverrides`,
and the aggregate fields (`groupAggregateOverrides`, `groupAggregations`,
`queryAggregates`, `aggregateOperations`, `honorsAggregates`). The
[API reference](./api.md) has each one's type.

Because the table is agnostic to the source's origin, you can switch between
in-memory and server data — or [build a custom source](./custom-table-source.md) — without touching the
UI.

## Source builders

### `useFrontendData`

In-memory. Filters by a searchable-text projector, sorts by a column's
`sortValue` (or a custom `getSortValue`), and slices for the current page.

```ts
const source = useFrontendData({ data, columns, getSearchText, getSortValue });
```

### `useQuerySource`

Server-paginated. Wraps a caller-supplied `useInfiniteQuery` hook and maps
each page to rows via `selectPage`. Flattens pages in infinite mode, returns
the latest page in paged mode, and clamps out-of-range pages.

```ts
const source = useQuerySource({ usePaginatedQuery, selectPage, baseParams });
```

## Columns

```ts
interface ColumnDef<TRow> {
  key: string; // unique; also the backend sortBy value
  header?: ReactNode; // pre-translated; derived from `key` when omitted
  Cell?: ComponentType<{ row: TRow; rowIndex: number }>; // stable identity
  accessor?: (row: TRow) => ReactNode; // lightweight
  sortValue?: (row: TRow) => string | number | boolean | null | undefined;
  sortable?: boolean;
  width?: number | string;
  align?: "start" | "center" | "end";
  mobileLabel?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}
```

## Pagination modes

`"auto"` (the default) resolves to **infinite scroll on mobile** and
**paged on desktop**, by the same rule as the card layout: the 768px media
query, or your `mobileBreakpoint`, and `forceMobile` over both.
Force a mode with `paginationMode: "paged" | "infinite"`.

In infinite mode the adapters auto-load the next page when the bottom of the
list scrolls into view (via `IntersectionObserver`, prefetching ~200px
early), and also render an explicit **Load more** button as a keyboard- and
screen-reader-friendly fallback. The auto-load behaviour is packaged as a
headless hook, `useInfiniteScroll`, exported from `@adapttable/react` — attach
the returned ref to a sentinel element after your last row to get the same
behaviour in custom markup (`rootMargin` sets how early it fires, default
`"200px"`):

```tsx
const sentinelRef = useInfiniteScroll({
  hasNextPage: source.hasNextPage,
  isFetchingNextPage: source.isFetchingNextPage,
  fetchNextPage: source.fetchNextPage,
  itemCount: source.rows.length, // re-arms so short pages keep loading
  enabled: source.paginationMode === "infinite",
});
// …render rows…
<div ref={sentinelRef} />;
```

It is SSR- and test-safe: where `IntersectionObserver` is unavailable it
no-ops, leaving the Load more button as the path forward.

## Optional virtualization

Long infinite lists can opt into row/card windowing with the `virtualize()`
feature. `@adapttable/react` exports the underlying `useTableVirtualization`,
and the ready adapters wire it into their desktop rows and mobile cards. With
no `maxHeight` the window tracks the page scroll; add `maxHeight` and the same
feature virtualizes inside the scroll box instead — fifty thousand rows in a
380px panel stay a handful of DOM nodes. Ant Design maps the same
`virtualize()` feature to antd's native virtual table mode.

```tsx
import { DataTable } from "@adapttable/mantine";
import { virtualize } from "@adapttable/mantine/virtualize";

interface Person {
  id: string;
  name: string;
}

export function People({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      columns={[{ key: "name", sortable: true }]}
      rowKey={(row) => row.id}
      paginationMode="infinite"
      features={[virtualize({ estimateRowSize: 56, estimateCardSize: 140 })]}
    />
  );
}
```

Virtualization is optional. Leave it off for small lists or paged tables; turn
it on for long infinite lists.

## Responsive cards

Adapters automatically switch from table rows to mobile cards at
`mobileBreakpoint` (default 768px); `forceMobile` pins the card layout.
A card shows every column without `hideOnMobile`, so `hideOnMobile` on the
low-value columns is what shapes it; `hideOnDesktop` adds a field to cards
only. `renderCard` replaces a card's body while its shell — selection,
toggles, row actions — stays.

```tsx
const columns = [
  { key: "name" },
  { key: "team" },
  { key: "email", hideOnMobile: true },
];

<DataTable data={people} columns={columns} rowKey={(row) => row.id} />;
```

## The engine, and why it has no React in it

Filtering, sorting, paging and grouping are decisions about data, not about
the DOM. They live in `@adapttable/core` as a plain object with no
framework in its import graph, and `@adapttable/react` is the binding that
subscribes a component tree to one.

```ts
import { createTableEngine } from "@adapttable/core";

const engine = createTableEngine({
  data: people,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row) => row.id,
  defaults: { limit: 25 },
});

engine.dispatch({ type: "setSearch", search: "ada" });
engine.rows("page"); // the rows that page shows
```

`CreateTableEngineOptions` is what you build one from. `data`, `columns`,
`rowKey`, `locale`, `paginationMode`, `filterFn` and `getSearchText` stay
live — change one and the engine follows. `tableId` and `defaults` are read
once, because an identity and a seed cannot be retroactively different.

`TableEngine` is the handle:

| Member                                                                  | What it gives you                                                                                                                              |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `snapshot()`                                                            | A `TableSnapshot`: the current query state, the page it is showing, `lastPage`, `selectedIds`, `capabilities`, and the four revision counters. |
| `rows(scope)`                                                           | A `TableRowScope` — `"page"`, `"visible"` or `"full"`.                                                                                         |
| `dispatch(operation)`                                                   | A `TableOperation` a person performed: `setSort`, `setSearch`, `setPage`, `setLimit`, `setFilters`, `setGroupBy`, `setSelection`.              |
| `configure(patch)`                                                      | A `TableEngineConfigPatch` — controlled state a binding replays. Pass `{ silent: true }` to move without waking subscribers.                   |
| `invalidate(axes, next)`                                                | Tell it the data or columns changed. `invalidate(["data"])` with no new array re-derives from the rows it already holds.                       |
| `subscribe(axes, listener)`                                             | Wake on a `TableRevisionAxis` — `data`, `view`, `schema` or `policy` — and nothing else.                                                       |
| `cellValue` / `rowByKey` / `rowKey` / `getColumn`                       | Read one cell, find a row, take a row's identity, look up a column.                                                                            |
| `stageCandidate` / `commitCandidate` / `discardCandidate` / `candidate` | Stage configuration and data privately, then publish or drop it. `candidate` reads the staged state; everything else reads the committed one.  |
| `tableId` / `dispose()`                                                 | The engine's identity, and releasing it.                                                                                                       |

`TableRevisions` carries those four counters. They are separate so a consumer
can wake on the one it cares about: a virtualizer on `data`, a toolbar on
`view`, an agent on `policy`.

`snapshot().page` is the page actually on screen. Ask for page 9 of a table
that shrank to three and it reports the last page, while `requestedPage`
remembers what you asked for — so restoring the rows restores the page,
instead of stranding a reader on page 1.

### Handing the engine to something that is not a table

`createNeutralTable(engine, tableId, binding)` wraps one as a `NeutralTable`:
the same rows and revisions plus an `operations` map saying which of them are
actually wired right now. That is the shape `@adapttable/ai` reads, and the
`NeutralTableBinding` is how a host tells it what the surrounding UI can do.
An operation that stops being wired disappears from the map, so nothing is
offered a capability the table can no longer perform.

## Features are imports

A `<DataTable>` with `columns`, `rowKey` and a data tier searches, sorts and
pages. Everything else — filters, grouping, editing, virtualization, bulk
actions, the column menu — is a factory imported from a kit subpath and
passed in `features`:

```tsx
import { DataTable } from "@adapttable/mantine";
import { filters } from "@adapttable/mantine/filters";
import { grouping } from "@adapttable/mantine/grouping";

interface Person {
  id: string;
  name: string;
  team: string;
}

export function People({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      columns={[
        { key: "name", sortable: true },
        { key: "team", filter: { type: "select", options: "auto" } },
      ]}
      rowKey={(row) => row.id}
      features={[filters([]), grouping("team")]}
    />
  );
}
```

The import is the switch: a table downloads a feature only when it names
one. Host plugins are the same `TableFeature` type in the same array.
[Feature composition](./features.md) lists every factory, the standard
preset, and the plugin hooks.

## The two ways to use it

1. **Batteries-included** — `import { DataTable } from "@adapttable/<kit>"`.
2. **Headless** — `import { useDataTable } from "@adapttable/react"` and render
   your own markup with the returned prop-getters — see
   [headless rendering](./headless.md).
