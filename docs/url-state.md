# React table URL state — shareable filters, sort, and page

▶ **See it working:** [the live demo](https://orwa-mahmoud.github.io/adapttable/demo/) — filter, sort and page it, then copy the URL: every bit of that state is in the address bar (the kit switcher too).

AdaptTable keeps the table's state in the URL query string: search (`q`),
pagination (`page`, `limit`), sorting (`sortBy`/`sortDir`, or `sort` for a
multi-sort chain), and every filter value (`f_<key>`). Column layout
(`colHide`, `colPin`, `colOrder`, `colW`) joins in when you wire
`useColumnLayoutUrlState`, and saved views capture all of it under a name.
Reloading, sharing the link, or pressing back lands on the exact same slice.

Two conventions keep URLs clean: default values are omitted, and changing
search, sort, or a filter resets the page to 1.

## Multiple tables on one URL: `urlKey`

Two tables on one page would clobber each other's params. Give each a
namespace and every param is prefixed (`people.q`, `orders.f_totalMin`, …):

```tsx
import { DataTable } from "@adapttable/mantine";

type Person = { id: string; name: string; status: string };
type Order = { id: string; ref: string; total: number };

export function Dashboard({
  people,
  orders,
}: {
  people: Person[];
  orders: Order[];
}) {
  return (
    <>
      <DataTable
        data={people}
        columns={[
          { key: "name", sortable: true },
          { key: "status", filter: { type: "select", options: "auto" } },
        ]}
        rowKey={(r) => r.id}
        urlKey="people"
      />
      <DataTable
        data={orders}
        columns={[{ key: "ref" }, { key: "total", filter: "numberRange" }]}
        rowKey={(o) => o.id}
        urlKey="orders"
      />
    </>
  );
}
// → ?people.q=avery&people.page=2&orders.f_totalMin=100
```

The same `urlKey` option exists on `useFrontendData`, `useQuerySource`,
`useTableUrlState`, `useColumnLayoutUrlState`, and `useSavedViews` for
headless consumers. Omitting distinct `urlKey`s on shared-URL tables logs a
development warning.

## URL adapters

The URL layer is decoupled from any router via a tiny `UrlStateAdapter`:

```ts
interface UrlStateAdapter {
  getSearch(): string; // current query string (no "?")
  setSearch(search: string, opts?: { push?: boolean }): void;
  subscribe(onChange: () => void): () => void;
}
```

- **`createHistoryAdapter()`** — browser History API; the default (one
  shared instance per window via `getHistoryAdapter()`).
- **`createMemoryAdapter(initial?)`** — in-memory; used for SSR, tests, and
  when URL sync is disabled (the table still gets fully working local state).

Pass a custom adapter as `urlAdapter` on any `<DataTable>` (the headless
hooks call the option `adapter`). Router recipes:

### react-router

```tsx
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { UrlStateAdapter } from "@adapttable/core";

export function useReactRouterAdapter(): UrlStateAdapter {
  const navigate = useNavigate();
  const location = useLocation();
  return useMemo(
    () => ({
      getSearch: () => location.search.replace(/^\?/, ""),
      setSearch: (search, opts) =>
        navigate({ search }, { replace: !opts?.push }),
      // react-router re-renders on navigation; the hook re-reads getSearch.
      subscribe: () => () => undefined,
    }),
    [location.search, navigate]
  );
}
```

### Next.js (App Router)

```tsx
"use client";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { UrlStateAdapter } from "@adapttable/core";

export function useNextAdapter(): UrlStateAdapter {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(
    () => ({
      getSearch: () => searchParams.toString(),
      setSearch: (search, opts) => {
        const url = search ? `${pathname}?${search}` : pathname;
        if (opts?.push) router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
      },
      subscribe: () => () => undefined,
    }),
    [searchParams, pathname, router]
  );
}
```

```tsx
<DataTable
  data={data}
  columns={columns}
  rowKey={(r) => r.id}
  urlAdapter={useNextAdapter()}
/>
```

## Turning URL sync off

One prop: `urlSync={false}`. Search, sort, filters and pagination keep
working identically — state just lives in memory, the address bar never
changes, and any `urlAdapter` is ignored.

```tsx
<DataTable data={data} columns={columns} rowKey={(r) => r.id} urlSync={false} />
```

Headless equivalent: `useTableUrlState({ enabled: false })` — handy inside
modals or drawers where the address bar shouldn't change.

## Param reference

| Param                       | Example                     | Meaning                                                                                     |
| --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `q`                         | `q=avery`                   | Committed search term.                                                                      |
| `page`                      | `page=3`                    | 1-based page; omitted at 1.                                                                 |
| `limit`                     | `limit=50`                  | Page size, clamped to 1–500; omitted at the default (25).                                   |
| `sortBy` + `sortDir`        | `sortBy=name&sortDir=desc`  | Single-column sort (`sortDir` falls back to `asc`).                                         |
| `sort`                      | `sort=name:asc,age:desc`    | Multi-sort chain; supersedes `sortBy`/`sortDir` while present.                              |
| `groupBy`                   | `groupBy=team`              | Active row-grouping column key (frontend tier).                                             |
| `f_<key>`                   | `f_status=active`           | One filter value; `multiSelect` arrays are comma-separated with each entry percent-encoded. |
| `f_<key>From` / `f_<key>To` | `f_hiredAtFrom=2026-01-01`  | `dateRange` bounds (inclusive; the end bound keeps that whole day).                         |
| `f_<key>Min` / `f_<key>Max` | `f_salaryMin=50000`         | `numberRange` bounds (inclusive; parsed as numbers).                                        |
| `colHide`                   | `colHide=email,phone`       | Hidden columns (keys percent-encoded).                                                      |
| `colPin`                    | `colPin=name:left`          | Pinned columns and their side.                                                              |
| `colOrder`                  | `colOrder=name,role,salary` | Explicit column order.                                                                      |
| `colW`                      | `colW=name:220`             | Per-column pixel widths.                                                                    |

With a `urlKey` every param is prefixed: `people.q`, `people.f_status`,
`people.colHide`, ….

### Defaults vs. explicit clears

`defaults` (search, sort, `extra` filter values) apply only while the URL is
silent about a key. When the user explicitly clears a defaulted value, the
hook records it as an empty-valued param (`q=`, `f_status=`) so the default
does not instantly resurrect — a missing param means "default applies", an
empty one means "explicitly cleared".

## SSR

The default History-API adapter hydrates from an empty query string (the
server has no `window`; the real URL applies right after hydration). To
server-render the exact requested slice, pass an explicit router adapter —
it knows the request URL, and the hooks trust an explicit adapter to be
hydration-consistent. `getHistoryAdapter()` itself returns a memory adapter
when there is no `window`, so nothing crashes under SSR either way.
