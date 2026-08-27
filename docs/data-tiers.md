# Client & server React table data — one TableSource API

One `<DataTable>`, three ways to feed it — from "here's an array" to full
query-library control. Search, sorting, filters, chips, and URL sync behave
identically in every tier.

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

### 2. Server — `data` + `total` + `loading` + `onQueryChange`

Your API paginates; the table owns the query state and tells you when to
fetch.

```tsx
import { useState } from "react";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import { DataTable } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  role: string;
}

export function PeopleTable() {
  const [rows, setRows] = useState<Person[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  return (
    <DataTable
      data={rows}
      total={total}
      loading={loading}
      onQueryChange={async (query, { signal }) => {
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
      }}
      columns={[{ key: "name", sortable: true }, { key: "role" }]}
      rowKey={(r) => r.id}
    />
  );
}
```

#### What the query carries, and how it grows

Every server tier receives one consolidated `TableQuery`:

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

| Field        | Capability   | Carries                                                                                                                                                                                                                        |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `groupBy`    | `grouping`   | Grouping keys, outermost first                                                                                                                                                                                                 |
| `aggregates` | `aggregates` | `{ key, fn }` pairs to compute                                                                                                                                                                                                 |
| `filterTree` | `filterTree` | Nested AND/OR condition tree                                                                                                                                                                                                   |
| `facets`     | `facets`     | Column keys needing distinct-value counts. The response returns the same keys as `facets` on the page (`PaginatedResponse.facets` / `PageSelector.facets`) — counts for the filtered set with each facet's own filter removed. |
| `cursor`     | `cursor`     | Opaque cursor from the previous response                                                                                                                                                                                       |

The flat `filters` bag is always populated, including when `filterTree` is
sent, so a server that only reads the simple form keeps working.

### 3. Full control — `source`

Build a `TableSource` yourself — `useQuerySource` over TanStack Query (shown
below; wrap your app in its `QueryClientProvider`), `useFrontendData` for
headless in-memory use, or a hand-rolled object that fulfils the contract.

```tsx
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same props everywhere.
import {
  DataTable,
  type PaginatedResponse,
  type TableQueryParams,
  useQuerySource,
} from "@adapttable/mantine";

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
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
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

## Explicit `mode` — when inference isn't what you meant

The tier is inferred from what you pass (`data` alone → frontend;
`data` + `onQueryChange` → server; `source` → full control). The optional
`mode` prop pins it explicitly — and unlocks one combination inference
cannot express:

| I want…                                                           | Pass                                       | `onQueryChange` acts as…                                        |
| ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| The table to fetch nothing; my handler runs every query           | `mode="server"` (requires `onQueryChange`) | **the contract** — you fetch and hand back `data` + `total`     |
| The table to keep filtering/sorting/paging my `data`, but TELL me | `mode="frontend"` + `onQueryChange`        | **a pure notification** — fires per committed change, not mount |
| Today's inference exactly                                         | omit `mode`                                | contract when present, nothing otherwise                        |

`mode="server"` without `onQueryChange` does not compile; `mode` together
with `source` dev-warns and `source` wins.

## How it works

- Tier resolution is by what you pass: `source` wins; otherwise
  `onQueryChange` selects the server tier; otherwise `data` alone is the
  frontend tier. Mixing tiers dev-warns and uses `source`.
- **Frontend**: search, the declarative-filter predicate, sorting, and page
  slicing all run in memory. Pagination defaults to `"auto"` — paged on
  desktop, infinite scroll on mobile.
- **Server**: the table owns page, page size, debounced search, sort, and
  filter state (URL-synced), and emits ONE consolidated `TableQuery` —
  `{ page, limit, search, sortBy, sortDir, sortLevels, filters }` — per real
  change, **including once on mount with the URL-restored values**. Your only
  job is to fetch and hand back `data` + `total`.
- Server queries are value-keyed (`stableKey`), so identical re-renders and
  StrictMode double-mounts never re-fire the same query; when a newer query
  supersedes an in-flight one, the previous call's `signal` aborts — forward
  it to `fetch` and out-of-order responses die at the source.
- **Full control**: every source builder returns the same
  [`TableSource`](./concepts.md) contract, so the table can't tell in-memory
  from server data — switch tiers without touching the UI.
- Column `filter` shorthands and the `filters` array drive widgets, chips,
  and URL parsing in **all three tiers**; only the frontend tier also applies
  the row predicate (the other tiers receive `query.filters` instead).

## Cache keys for TanStack Query and SWR

Wiring the table to a query library means turning the emitted `TableQuery` into
a cache key. Hand-rolling that fails in two ways that are hard to see: a key
built from an object literal changes whenever `filters` is rebuilt, so the
cache misses on every keystroke; and invalidation after a save either refetches
the whole endpoint or only the page on screen.

```tsx
import { tableQueryKey, tableQueryBaseKey } from "@adapttable/core";

const infinite = useInfiniteQuery({
  queryKey: tableQueryKey(query, { scope: "people" }),
  queryFn: ({ signal }) => fetchPeople(query, signal),
  getNextPageParam: (last) => last.nextCursor,
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

`onQueryChange` fires per real change, not per render. Four guarantees, each
covered by a test:

- **One request per query.** Queries are compared by value, so setting the same
  search term three times in a tick, an identical re-render, or a StrictMode
  double-mount all collapse into a single call.
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

| Prop            | Type                                                                          | Default | Description                                                                                     |
| --------------- | ----------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `data`          | `readonly TRow[]`                                                             | —       | Frontend tier: all rows. Server tier: the current page, exactly as the server returned it.      |
| `total`         | `number`                                                                      | `0`     | Server tier: total row count across all pages (drives the pager).                               |
| `loading`       | `boolean`                                                                     | `false` | Server tier: request in flight (skeleton when no rows yet, subtle refresh indicator otherwise). |
| `onQueryChange` | `(query: TableQuery, info: { signal: AbortSignal }) => void \| Promise<void>` | —       | Server tier: fired per consolidated query change, once on mount included.                       |
| `error`         | `Error \| null`                                                               | `null`  | Forwarded error to display.                                                                     |
| `source`        | `TableSource<TRow>`                                                           | —       | Full control: a prebuilt source from `useFrontendData` / `useQuerySource` / your own.           |

## Notes

- **Picking a tier**: rows already in memory (up to a few thousand) →
  frontend. A paginated API and no query library → server. Caching, infinite
  scroll, prefetching, or an existing TanStack Query setup → `source` with
  `useQuerySource`.
- The hooks behind the first two tiers — `useFrontendData` and
  `useServerData` — are exported for headless use; `useTableData` is the
  resolver that picks between them.
- `useQuerySource` accepts `selectPage` (a `PageSelector` — project your
  own page shape to `{ rows, total? }` when it isn't `PaginatedResponse`),
  `baseParams` (static params merged into every call, e.g. a parent scope
  id), and `sanitizeParams`. Its query argument is typed structurally as
  `InfiniteQueryLike`, so TanStack Query stays a type-only peer. See
  [`examples/mui-query-source.tsx`](../examples/mui-query-source.tsx) for a complete
  runnable version.
- On the server tier, `source.refetch()` re-emits the current query;
  out-of-range pages and stale responses are handled for you via the abort
  signal.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
