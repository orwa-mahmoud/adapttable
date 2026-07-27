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
  [`examples/mui-backend.tsx`](../examples/mui-backend.tsx) for a complete
  runnable version.
- On the server tier, `source.refetch()` re-emits the current query;
  out-of-range pages and stale responses are handled for you via the abort
  signal.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
