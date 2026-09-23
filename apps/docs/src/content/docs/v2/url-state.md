---
title: "React table URL state — filters, sort, page (v2)"
description: Want shareable React table links? Search, filters, sort and page
  sync to the URL (History, Next.js, react-router). Refresh-safe and
  SSR-friendly.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table URL state — filters, sort,
      page","item":"https://orwa-mahmoud.github.io/adapttable/v2/url-state/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/url-state.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/url-state.png
slug: v2/url-state
---

▶ **See it working:** [the live demo](https://orwa-mahmoud.github.io/adapttable/demo/) — filter, sort and page it, then copy the URL: every bit of that state is in the address bar (the kit switcher too).

AdaptTable keeps the table's state in the URL query string: search (`q`),
pagination (`page`, `limit`), sorting (`sortBy`/`sortDir`, or `sort` for a
multi-sort chain), and every filter value (`f_<key>`). Column layout
(`colHide`, `colPin`, `colOrder`, `colW`, `colGroupCollapse`) joins in when you wire
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

* **`createHistoryAdapter()`** — browser History API; the default (one
  shared instance per window via `getHistoryAdapter()`).
* **`createMemoryAdapter(initial?)`** — in-memory; used for SSR, tests, and
  when URL sync is disabled (the table still gets fully working local state).

Pass a custom adapter as `urlAdapter` on any `<DataTable>` (the headless
hooks take the same `urlAdapter` option).

## Your router

Every router recipe is the same shape: read the current query string, and
navigate to a new one. `routerUrlAdapter` is that shape — its
`RouterUrlAdapterOptions` are the router's current `search` and a `navigate` —
so each router takes two lines instead of twelve — and it depends on no router, which is why it can
ship at all.

Memoize it on the search: the adapter is a value, and rebuilding it is how the
table learns the route changed.

### react-router

```tsx
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { routerUrlAdapter } from "@adapttable/core";

export function useReactRouterAdapter() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  return useMemo(
    () =>
      routerUrlAdapter({
        search: params.toString(),
        navigate: (search, { push }) =>
          navigate({ search }, { replace: !push }),
      }),
    [params, navigate],
  );
}
```

### TanStack Router

```tsx
import { useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { routerUrlAdapter } from "@adapttable/core";

export function useTanStackAdapter() {
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const navigate = useNavigate();
  return useMemo(
    () =>
      routerUrlAdapter({
        search,
        navigate: (next, { push }) =>
          navigate({ to: ".", search: next, replace: !push }),
      }),
    [search, navigate],
  );
}
```

### Next.js (App Router)

```tsx
"use client";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { routerUrlAdapter } from "@adapttable/core";

export function useNextAdapter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return useMemo(
    () =>
      routerUrlAdapter({
        search: searchParams.toString(),
        navigate: (search, { push }) => {
          const url = search ? `${pathname}?${search}` : pathname;
          if (push) router.push(url, { scroll: false });
          else router.replace(url, { scroll: false });
        },
      }),
    [searchParams, pathname, router],
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

`push` is opt-in throughout: the default is a replace, because a table's every
keystroke is not a page anyone wants to walk back through.

The adapter reports no external changes on purpose. A router re-renders its
tree on navigation, so the hook holding the adapter runs again and reads the
new search itself — subscribing would deliver the same change twice. The one
way to hold it wrong is to pass a `search` that does not update, which is why
it takes a value rather than a getter.

## Turning URL sync off

One prop: `urlSync={false}`. Search, sort, filters and pagination keep
working identically — state just lives in memory, the address bar never
changes, and any `urlAdapter` is ignored.

```tsx
<DataTable data={data} columns={columns} rowKey={(r) => r.id} urlSync={false} />
```

Headless equivalent: `useTableUrlState({ urlSync: false })` — handy inside
modals or drawers where the address bar shouldn't change.

## Param reference

| Param                       | Example                                        | Meaning                                                                                                                                                        |
| --------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `q`                         | `q=avery`                                      | Committed search term.                                                                                                                                         |
| `page`                      | `page=3`                                       | 1-based page; omitted at 1.                                                                                                                                    |
| `limit`                     | `limit=50`                                     | Page size, 1–500 (anything else reads as the default); omitted at the default (25).                                                                            |
| `sortBy` + `sortDir`        | `sortBy=name&sortDir=desc`                     | Single-column sort (`sortDir` falls back to `asc`).                                                                                                            |
| `sort`                      | `sort=name:asc,age:desc`                       | Multi-sort chain; supersedes `sortBy`/`sortDir` while present.                                                                                                 |
| `groupBy`                   | `groupBy=team`                                 | Active row-grouping column keys, comma-separated, outermost first (frontend tier).                                                                             |
| `groupClosed`               | `groupClosed=Sales`                            | Collapsed group keys, comma-separated (wire `useGroupCollapseUrlState`).                                                                                       |
| `f_<key>`                   | `f_status=active`                              | One filter value; `multiSelect` arrays are comma-separated with each entry percent-encoded.                                                                    |
| `f_<key>From` / `f_<key>To` | `f_hiredAtFrom=2026-01-01`                     | `dateRange` bounds (inclusive; the end bound keeps that whole day). A `relative` operator stores the token here (`today`, `last:7`) instead of a resolved day. |
| `f_<key>Min` / `f_<key>Max` | `f_salaryMin=50000`                            | `numberRange` bounds (inclusive; parsed as numbers).                                                                                                           |
| `ft`                        | `ft=1.{"combinator":"and"}`                    | Versioned AND/OR filter tree. Unknown versions are dropped, never reinterpreted.                                                                               |
| `colHide`                   | `colHide=email,phone`                          | Hidden columns (keys percent-encoded).                                                                                                                         |
| `colPin`                    | `colPin=name:left`                             | Pinned columns and their side.                                                                                                                                 |
| `colOrder`                  | `colOrder=name,role,salary`                    | Explicit column order.                                                                                                                                         |
| `colW`                      | `colW=name:220`                                | Per-column pixel widths.                                                                                                                                       |
| `colGroupCollapse`          | `colGroupCollapse=contact`                     | Collapsed column groups.                                                                                                                                       |
| `rowPin`                    | `rowPin=id1:top,id2:bottom`                    | Pinned rows and their side.                                                                                                                                    |
| `density`                   | `density=compact`                              | Row density; omitted at the default (wire `useDensityUrlState`).                                                                                               |
| `pivot`                     | `pivot=rows:region;sum:amount`                 | Pivot configuration (`usePivotUrlState` from `@adapttable/core/pivot`).                                                                                        |
| `formula`                   | `formula=total:quantity%20*%20unitPrice:Total` | Typed formula columns (`useFormulaUrlState` from `@adapttable/core/formula`).                                                                                  |

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
