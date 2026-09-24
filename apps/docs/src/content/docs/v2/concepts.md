---
title: "AdaptTable concepts — headless core & source (v2)"
description: One headless core, a TableSource data contract, and adapters that
  mount real Mantine, MUI, Chakra, Ant, Radix and shadcn components.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"AdaptTable
      concepts — headless core &
      source","item":"https://adapttable.orwamahmoud.com/v2/concepts/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/concepts.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/concepts.png
slug: v2/concepts
---

▶ **See it working:** [the live demo](https://adapttable.orwamahmoud.com/react/demo/) — one dataset, one feature set, re-rendered by every real adapter.

## The `TableSource` contract

Everything in AdaptTable revolves around one idea: a **`TableSource<T>`** —
a uniform contract that a table consumes regardless of where its rows came
from. Both built-in source hooks fulfil it, and the table renders without
knowing which produced it.

```ts
interface TableSource<TRow> {
  rows: readonly TRow[];
  total: number;
  isLoading: boolean; // FIRST load only — refreshes never re-raise it
  isFetching: boolean; // any in-flight request
  isFetchingNextPage: boolean; // an append fetch (infinite mode)
  hasNextPage: boolean; // more rows can be APPENDED (always false when paged)
  fetchNextPage: () => void; // appends; no-op in paged mode
  refetch?: () => Promise<unknown> | void; // re-runs the underlying fetch
  error: Error | null;
  paginationMode: "infinite" | "paged";
  // state
  page: number;
  limit: number;
  defaultLimit: number; // page size when the URL has no `limit` (default 25)
  search: string;
  sortBy: string | undefined;
  sortDir: "asc" | "desc" | undefined;
  sortLevels: readonly { key: string; dir: "asc" | "desc" }[]; // multi-sort chain
  extra: Record<string, string | string[] | number | undefined>;
  groupBy: string | undefined; // comma-separated grouping keys
  // setters
  setPage;
  setLimit;
  setSort;
  toggleSortLevel;
  setSearch;
  setExtra;
  setExtras;
  setFilterTree?; // AND/OR filter tree, when the source supports one
  clearExtras;
  clearAll;
  setGroupBy;
}
```

Because the table is agnostic to the source's origin, you can switch between
in-memory and server data — or build a custom source — without touching the
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
  header?: ReactNode; // pre-translated; omitted → humanized key
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
**paged on desktop**, using the same breakpoint the table uses, so the two
never drift. Force a mode with `paginationMode: "paged" | "infinite"`.

In infinite mode the adapters auto-load the next page when the bottom of the
list scrolls into view (via `IntersectionObserver`, prefetching ~200px
early), and also render an explicit **Load more** button as a keyboard- and
screen-reader-friendly fallback. The auto-load behaviour is packaged as a
headless hook, `useInfiniteScroll`, exported from `@adapttable/core` — attach
the returned ref to a sentinel element after your last row to get the same
behaviour in custom markup:

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

Long infinite lists can opt into row/card windowing with `virtualize`. The
core exports `useTableVirtualization`, and the ready adapters wire it into
their desktop rows and mobile cards. With no `maxHeight` the window tracks
the page scroll; add `maxHeight` and the same prop virtualizes inside the
scroll box instead — fifty thousand rows in a 380px panel stay a handful of
DOM nodes. Ant Design maps the same `virtualize` prop to antd's native
virtual table mode.

```tsx
<DataTable
  source={source}
  columns={columns}
  rowKey={(row) => row.id}
  paginationMode="infinite"
  virtualize
  estimateRowSize={56}
  estimateCardSize={140}
/>
```

Virtualization is optional. Leave it off for small lists or paged tables; turn
it on for long infinite lists.

## Responsive cards

Adapters automatically switch from table rows to mobile cards at the shared
mobile breakpoint (768px by default; `mobileBreakpoint` sets another width
and `forceMobile` forces the card layout). `hideOnMobile` can hide low-value columns, while
`mobileIdentityColumns` preserves a configurable number of leading
desktop-visible columns so every card keeps enough identity to be useful.

```tsx
<DataTable mobileIdentityColumns={2} />
```

## The two ways to use it

1. **Batteries-included** — `import { DataTable } from "@adapttable/<kit>"`.
2. **Headless** — `import { useDataTable } from "@adapttable/core"` and render
   your own markup with the returned prop-getters.
