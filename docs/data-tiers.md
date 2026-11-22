# Client & server React table data — one TableSource API

One `<DataTable>`, two ways to feed it: `data`, the rows the table pages,
sorts and filters itself, or `source`, a source built for it — a server
source, a query library or your own. Search, sorting, filters, chips and URL
sync behave identically either way.

## Example

### 1. Frontend — `data`

Pass the rows; the table filters, sorts, and pages them in memory.

```tsx
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada Lovelace", role: "Engineer" },
  { id: "2", name: "Alan Turing", role: "Founder" },
  { id: "3", name: "Grace Hopper", role: "Admiral" },
];

export function PeopleTable() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[{ key: "name", sortable: true }, { key: "role" }]}
      rowKey={(r) => r.id}
    />
  );
}
```

### 2. Server — `source={useServerData(…)}`

Your API paginates; the server source owns the query state and tells you when
to fetch.

```tsx
import { useState } from "react";
import { type ColumnDef, useServerData } from "@adapttable/react";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
}

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "role" },
];

export function PeopleTable() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const source = useServerData<Person>({
    rows,
    total,
    loading,
    onQueryChange: async (query, { signal }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(query.page),
          limit: String(query.limit),
          search: query.search,
        });
        // Forward `signal`: superseded requests abort at the source.
        const res = await fetch(`/api/people?${params}`, { signal });
        const body = (await res.json()) as { items: Person[]; total: number };
        setRows(body.items);
        setTotal(body.total);
      } finally {
        setLoading(false);
      }
    },
  });

  return <DataTable source={source} columns={COLUMNS} rowKey={(r) => r.id} />;
}
```

A table given `data` carries none of this: the server source, its request
builder and the server engine come with `useServerData`.

#### Filters on a server source

A range, multi-value or checklist filter restored from the URL has to reach
the first request typed — `budgetMin` as a number, `stage` as a list — and a
checklist asks the server for its counts. `serverFilterKeys` derives those
keys from the declarations the table is given:

```tsx
import { serverFilterKeys, useServerData } from "@adapttable/react";

const source = useServerData<Deal>({
  ...serverFilterKeys({ columns: COLUMNS, filters: FILTERS }),
  rows,
  total,
  onQueryChange,
});
```

It returns `arrayExtraKeys`, `numberExtraKeys` and `facetKeys`; pass
`filterTypes` and `locale` when the table gets them. Each key can also be
written by hand.

#### What the query carries, and how it grows

Every server source receives one consolidated `TableQuery`:

```ts
{
  (page, limit, search, sortBy, sortDir, sortLevels, filters);
}
```

That is the whole baseline, and it will not change. Capabilities beyond it —
grouping, aggregates, nested filter trees, facet counts, cursor pagination —
ride as **optional** fields that a source opts into by declaring what its
endpoint can answer:

```tsx
import { useServerData } from "@adapttable/react";

useServerData({
  rows,
  total,
  // this endpoint can group and count; it cannot do the rest yet
  supports: { grouping: true, facets: true },
  onQueryChange: async (query, { signal }) => {
    // query.groupBy → ["team"] when the user is grouping
    // query.facets  → ["status"] when a filter wants distinct-value counts
  },
});
```

Declare nothing and nothing changes: the query arrives with exactly the seven
baseline fields, so an endpoint written before a capability existed keeps
working untouched. Declare a capability and its field starts arriving.

If the table wants something the source has not declared, the field is
**omitted rather than sent and ignored** — a server should never receive a
field it never agreed to read — and development logs which capability would
unlock it. That warning is the intended way to discover the next thing your
backend could do, not an error.

| Field         | Capability   | Carries                                                                                                                                                                                                                        |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `groupBy`     | `grouping`   | Grouping keys, outermost first                                                                                                                                                                                                 |
| `aggregates`  | `aggregates` | `{ key, fn }` pairs to compute. Optional `supports.aggregateOperations` lists the ids the backend can answer; omit it and the five standard functions are assumed. Custom ids travel as strings, never as functions.           |
| `filterTree`  | `filterTree` | Nested AND/OR condition tree                                                                                                                                                                                                   |
| `facets`      | `facets`     | Column keys needing distinct-value counts. The response returns the same keys as `facets` on the page (`PaginatedResponse.facets` / `PageSelector.facets`) — counts for the filtered set with each facet's own filter removed. |
| `cursor`      | `cursor`     | Opaque cursor from the previous response                                                                                                                                                                                       |
| `expandedIds` | `tree`       | Open tree node ids, so the response can carry the children of every open branch                                                                                                                                                |

`cursor` and `expandedIds` arrive through the `nextCursor` and
`expandedIds` options of `useServerData` and `useQuerySource`, beside
`supports`, `facetKeys` and `facets`.

The flat `filters` bag is always populated, including when `filterTree` is
sent, so a server that only reads the simple form keeps working.

### 3. Full control — `source`

Build a `TableSource` yourself — `useQuerySource` over TanStack Query (shown
below; wrap your app in its `QueryClientProvider`), `useFrontendData` for
headless in-memory use, or a [hand-rolled object that fulfils the contract](./custom-table-source.md).

```tsx
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import type { PaginatedResponse, TableQueryParams } from "@adapttable/core";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import { DataTable, useQuerySource } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
}

async function fetchPeople(
  params: Partial<TableQueryParams>
): Promise<PaginatedResponse<Person>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const res = await fetch(`/api/people?${search}`);
  return (await res.json()) as PaginatedResponse<Person>;
}

// Your query hook: fetch one page for the current params.
function usePeopleQuery(params: Partial<TableQueryParams>) {
  return useInfiniteQuery({
    queryKey: ["people", params],
    queryFn: ({ pageParam }) => fetchPeople({ ...params, page: pageParam }),
    initialPageParam: params.page ?? 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function PeopleTable() {
  const source = useQuerySource<Person>({ usePaginatedQuery: usePeopleQuery });
  return (
    <DataTable
      source={source}
      columns={[{ key: "name", sortable: true }, { key: "role" }]}
      rowKey={(r) => r.id}
    />
  );
}
```

## Hearing about changes — `onViewChange`

A table over `data` keeps filtering, sorting and paging its rows, and tells
`onViewChange` what the reader did: one consolidated `TableQuery` per
committed change to page, page size, search, sort or filters, never for the
mount. It is a notification — log it, mirror it, prefetch with it — and the
rows the table shows stay the ones in `data`.

```tsx
<DataTable
  data={PEOPLE}
  columns={COLUMNS}
  rowKey={(r) => r.id}
  onViewChange={(query) => analytics.track("people-view", query)}
/>
```

## How it works

- The tier is what you pass: `source`, or `data`. Passing both dev-warns
  and uses `source`; passing neither dev-warns and renders an empty table.
- **Frontend**: search, the declarative-filter predicate, sorting, and page
  slicing all run in memory. Pagination defaults to `"auto"` — paged on
  desktop, infinite scroll on mobile.
- **Server**: `useServerData` owns page, page size, debounced search, sort,
  and filter state (URL-synced), and emits ONE consolidated `TableQuery` —
  `{ page, limit, search, sortBy, sortDir, sortLevels, filters }` — per real
  change, **including once on mount with the URL-restored values**. Your only
  job is to fetch and hand back `rows` + `total`. The mount query goes out
  while the server engine is still loading.
- Server queries are value-keyed (`stableKey`), so identical re-renders never
  re-fire the same query; when a newer query
  supersedes an in-flight one, the previous call's `signal` aborts — forward
  it to `fetch` and out-of-order responses die at the source.
- **Full control**: every source builder returns the same
  [`TableSource`](./concepts.md) contract, so the table can't tell in-memory
  from server data — switch tiers without touching the UI. Switching after
  mount is a host handing the table another `source`, or `data`; a server
  source keeps its own view state, and the page carries across through the
  URL.
- Column `filter` shorthands and the `filters` array drive widgets, chips,
  and URL parsing for every source; only the frontend tier also applies the
  row predicate (a server source receives `query.filters` instead).

## What a source can do — `capabilities`

Some controls only work if the data layer behind them can answer. Exporting
everything needs every row; grouping needs either the whole filtered set or a
server that groups; "select all 2,431 matching" needs a source that can speak
for rows that are not on screen.

A source states what it supports:

```ts
const source: TableSource<Person> = {
  ...rest,
  capabilities: {
    fullDataset: false, // one page at a time
    grouping: "server", // the API returns group rows
    selectAcrossPages: true, // it can act on the whole match set
    exportScope: "all", // it permits a wired full-export route
    totalCount: "exact", // `total` counts matches, not what has loaded
  },
};
```

| Capability            | Values                          | What it permits                                                                                      | Off means                                                     |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `fullDataset`         | `boolean`                       | Every row is reachable, not just the page on screen                                                  | The other four are decided independently                      |
| `grouping`            | `"client" \| "server" \| false` | `groupBy` groups in the browser, or renders the server's group rows                                  | `groupBy` is ignored, and the status bar says why             |
| `selectAcrossPages`   | `boolean`                       | The "select all N matching" banner after a full page is selected                                     | Selection stays the rows on screen                            |
| `exportScope`         | `"all" \| "page"`               | A source-owned `allFilteredRows` route may serve `scope: "all"`; it does not retrieve rows by itself | The Export button is disabled, with the reason on the control |
| `totalCount`          | `"exact" \| "loaded"`           | `total` is the match count                                                                           | `total` is what has arrived so far                            |
| `aggregateOperations` | `readonly string[]` (optional)  | The aggregate ids the backend computes                                                               | The five standard functions are assumed                       |

**Omit `capabilities` and nothing changes.** The table reads the same answers
off the source's shape, exactly as it always has: `allFilteredRows` present
means the full dataset, `groups` present means the server grouped, a non-zero
`total` means the count is real — which is why every source `useFrontendData`
and `useQuerySource` build already answers correctly without declaring
anything. Declare it when the shape is misleading in either direction: a paged
source whose backend permits full exports (with the actual request wired on
the export feature), or an in-memory slice that must not pretend to be the
whole set.

Capabilities describe support; they are not transport. `exportScope: "all"`
without rows or a retrieval handler leaves Export all disabled. A source-owned
route needs `allFilteredRows` to be present and the declaration to permit
`"all"`. A host that wires `exportCsv.onExportAll`, `exportCsv.request`, or
`exportCsv.fetchAll` supplies an independent executable route, so it can reach
the rest whatever the source can or cannot retrieve. `onExportAll` is the
server-built route: it receives the page-free current view, reports progress,
and supports cancellation without loading rows into the table. See
[browser and server-built exports](./exporting.md).

## Cache keys for TanStack Query and SWR

Wiring the table to a query library means turning the emitted `TableQuery` into
a cache key. Hand-rolling that fails in two ways that are hard to see: a key
built from an object literal changes whenever `filters` is rebuilt, so the
cache misses on every keystroke; and invalidation after a save either refetches
the whole endpoint or only the page on screen.

```tsx
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { tableQueryKey, tableQueryBaseKey } from "@adapttable/core";

// `query` is the `TableQuery` the table emitted; `fetchPeople` returns a
// `PaginatedResponse` for it.
const queryClient = useQueryClient();
const infinite = useInfiniteQuery({
  queryKey: tableQueryKey(query, { scope: "people" }),
  queryFn: ({ signal }) => fetchPeople(query, signal),
  initialPageParam: 1,
  getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
});

// after a write — every page of this view, nothing else
queryClient.invalidateQueries({
  queryKey: tableQueryBaseKey(query, { scope: "people" }),
});
```

- **`tableQueryBaseKey`** covers what decides _which_ rows: search, filters,
  sort, grouping, page size.
- **`tableQueryKey`** appends _where_ in them the table is: page and cursor.

The full key starts with the base key, so a library that matches by prefix —
TanStack Query does — invalidates every page of a view from the base key alone.
Both are stable across renders and ignore the order a filter object was built
in, so an identical query always produces an identical key.

Pass `scope` when a page shows more than one table, so they never share an
entry. For SWR, hand `useSWR` the array directly or join it — the parts are
strings.

Neither library is imported or depended on here; these are plain arrays that
happen to be exactly what both expect. The options shape is exported as
`TableQueryKeyOptions`.

## Which requests actually fire

A server source's `onQueryChange` fires per real change, not per render. Four
guarantees:

- **One request per query.** Queries are compared by value, so setting the same
  search term three times in a tick or an identical re-render collapses into a
  single call. Under StrictMode's development double-mount the handler runs
  twice and the first call's `signal` is already aborted, so forwarding
  `signal` to `fetch` leaves one live request.
- **Setting a value it already holds is not a change.** No request fires.
- **A superseded request aborts.** When a newer query replaces an in-flight
  one, the previous call's `signal` fires. Forward it to `fetch` and an
  out-of-order response dies at the source rather than overwriting fresher
  rows.
- **Returning to a value re-requests it.** Typing `a` → `ab` → `a` fires three
  times. The first `a` was aborted the moment `ab` superseded it, so collapsing
  the third call would leave the table with nothing in flight and nothing to
  show.

`refetch()` is the one deliberate exception: it asks for fresh data, so it
fires even though the query has not changed.

Using `useQuerySource` instead? Deduplication is your query library's, keyed
the way you configured it, and these guarantees do not apply.

## Options

| Prop           | Type                                                                                       | Default | Description                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `data`         | `readonly TRow[]`                                                                          | —       | Every row; the table pages, sorts and filters them.                                                                 |
| `loading`      | `boolean`                                                                                  | `false` | The rows of `data` are still arriving (skeleton when there are none yet).                                           |
| `error`        | `Error \| null`                                                                            | `null`  | A failure to display.                                                                                               |
| `onViewChange` | `(query: TableQuery, info: { signal: AbortSignal; key: string }) => void \| Promise<void>` | —       | Told of each committed change to the view of a table over `data`, never of the mount.                               |
| `source`       | `TableSource<TRow>`                                                                        | —       | A prebuilt source in place of `data`: `useServerData`, `useQuerySource`, `useFrontendData` or your own (see below). |

`useServerData` takes the server side:

| Option                              | Type                                                                                       | Description                                                                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`                              | `readonly TRow[]`                                                                          | The current page, exactly as the server returned it.                                                                                                                          |
| `total`                             | `number`                                                                                   | Row count across all pages (drives the pager).                                                                                                                                |
| `loading`                           | `boolean`                                                                                  | A request in flight (skeleton when no rows yet, subtle refresh indicator otherwise).                                                                                          |
| `error`                             | `Error \| null`                                                                            | The failure from the last request.                                                                                                                                            |
| `onQueryChange`                     | `(query: TableQuery, info: { signal: AbortSignal; key: string }) => void \| Promise<void>` | Fired per consolidated query change, once on mount included. `info.key` identifies the request; echo it back as `responseKey` to say which one the rows answer.               |
| `responseKey`                       | `string`                                                                                   | The `info.key` of the request the current `rows` answer (see [Row grouping](./row-grouping.md#server-tiers)).                                                                 |
| `supports`                          | `QuerySupport`                                                                             | What the endpoint can answer beyond the baseline query.                                                                                                                       |
| `aggregates`                        | `readonly QueryAggregate[]`                                                                | Developer defaults sent as `query.aggregates` when `supports.aggregates` is declared. Reader overrides overlay this; Restore defaults returns here, not to the last response. |
| `facetKeys`, `facets`               | `readonly string[]`, `FacetMap`                                                            | Filters to count and the counts from the last response.                                                                                                                       |
| `arrayExtraKeys`, `numberExtraKeys` | `readonly string[]`                                                                        | Filter keys whose URL values parse as lists and as numbers; `serverFilterKeys` derives them.                                                                                  |
| `nextCursor`, `expandedIds`         | `string \| null`, `readonly string[]`                                                      | Cursor pagination and open tree nodes, read with `supports.cursor` and `supports.tree`.                                                                                       |

## Notes

- **Picking a tier**: rows already in memory (up to a few thousand) →
  `data`. A paginated API and no query library → `useServerData`. Caching,
  infinite scroll, prefetching, or an existing TanStack Query setup →
  `useQuerySource`.
- `useFrontendData` and `useServerData` also serve headless use;
  `useTableData` is the resolver that serves `source`, else `data`.
- `useQuerySource` accepts `selectPage` (a `PageSelector` — project your
  own page shape to `{ rows, total? }` when it isn't `PaginatedResponse`),
  `baseParams` (static params merged into every call, e.g. a parent scope
  id), and `sanitizeParams`. Its query argument is typed structurally as
  `InfiniteQueryLike`, so TanStack Query stays a type-only peer. See
  [`examples/mui-query-source.tsx`](../examples/mui-query-source.tsx) for a complete
  runnable version.
- `selectPage` is read through a ref: the projected rows recompute when
  fetched pages, pagination mode, or `selectorKey` change — not when the
  selector function's identity changes. Memoizing `selectPage` alone cannot
  trigger a re-projection. Pass the closed-over input as `selectorKey`
  when a memoized selector must re-run against unchanged fetched pages:

  ```tsx
  const selectPage = useCallback(
    (page: Page) => ({
      rows: page.items.map((row) => ({ ...row, name: `${row.name}${suffix}` })),
      total: page.pagination.total,
    }),
    [suffix]
  );
  const source = useQuerySource({
    usePaginatedQuery,
    selectPage,
    selectorKey: suffix,
  });
  ```

  `selectorKey` accepts only a stable `string` or `number`. An unmemoized
  inline selector that closes over changing values and omits the key will
  keep showing the previous projection until the next fetch.

- On a server source, `source.refetch()` re-emits the current query;
  out-of-range pages and stale responses are handled for you via the abort
  signal.

See it live in the [demo](https://adapttable.orwamahmoud.com/react/demo/).
