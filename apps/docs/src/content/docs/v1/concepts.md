---
title: "AdaptTable concepts — headless core, TableSource, adapters (v1)"
description: "How AdaptTable works: one headless core, a TableSource data
  contract, and adapters that mount real Mantine/MUI/Chakra/Ant/Radix/Base
  UI/shadcn components — not a re-skin."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"AdaptTable
      concepts — headless core, TableSource,
      adapters","item":"https://adapttable.orwamahmoud.com/v1/concepts/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/concepts.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/concepts.png
slug: v1/concepts
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
  allFilteredRows?: readonly TRow[]; // frontend sources: every matching row
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  refetch?: () => Promise<unknown> | void;
  paginationMode: "infinite" | "paged";
  // state
  page: number;
  limit: number;
  search: string;
  sortBy: string | undefined;
  sortDir: "asc" | "desc" | undefined;
  sortLevels: readonly { key: string; dir: "asc" | "desc" }[];
  groupBy: string | undefined;
  extra: Record<string, string | string[] | number | undefined>;
  // setters
  setPage;
  setLimit;
  setSort;
  toggleSortLevel;
  setSearch;
  setExtra;
  setExtras;
  clearExtras;
  setGroupBy;
  clearAll;
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

### `useBackendData`

Server-paginated. Wraps a caller-supplied `useInfiniteQuery` hook and maps
each page to rows via `selectPage`. Flattens pages in infinite mode, returns
the latest page in paged mode, and clamps out-of-range pages.

```ts
const source = useBackendData({ usePaginatedQuery, selectPage, baseParams });
```

## Columns

```ts
interface ColumnDef<TRow> {
  key: string; // unique; also the backend sortBy value and the default data path
  header?: ReactNode; // pre-translated; humanized from `key` when omitted
  group?: string; // spanning header group for contiguous columns
  i18n?: Record<string, string>; // per-locale data paths
  filter?: ColumnFilter<TRow>; // declarative filter shorthand
  editable?: boolean | ((row: TRow) => boolean);
  editor?: CellEditor;
  editValue?: (row: TRow) => string;
  Cell?: ComponentType<{ row: TRow; rowIndex: number }>; // stable identity
  accessor?: (row: TRow) => ReactNode; // lightweight
  sortValue?: (row: TRow) => string | number | boolean | null | undefined;
  sortable?: boolean;
  width?: number | string;
  align?: "start" | "center" | "end";
  mobileLabel?: string;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  meta?: Record<string, unknown>;
}
```

## Pagination modes

`"auto"` (the default) resolves to **infinite scroll on mobile** and
**paged on desktop**, using the same breakpoint the table uses, so the two
never drift. Force a mode with `paginationMode: "paged" | "infinite"` on
`useFrontendData` / `useBackendData`; the `data` tier of `<DataTable>` always
uses `"auto"`, and the `onQueryChange` tier is always paged.

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

Long infinite lists can opt into row/card windowing with `virtualize`; it
applies only while the source runs in infinite mode. The
core exports `useTableVirtualization`, and the ready adapters wire it into
their desktop rows and mobile cards. With no `maxHeight` the window tracks
the page scroll; add `maxHeight` and the same prop virtualizes inside the
scroll box instead — fifty thousand rows in a 380px panel stay a handful of
DOM nodes. Ant Design maps the same `virtualize` prop to antd's native
virtual table mode.

```tsx
const source = useFrontendData({ data, columns, paginationMode: "infinite" });

<DataTable
  source={source}
  columns={columns}
  rowKey={(row) => row.id}
  virtualize
  estimateRowSize={56}
  estimateCardSize={140}
/>;
```

Virtualization is optional. Leave it off for small lists or paged tables; turn
it on for long infinite lists.

## Responsive cards

Adapters automatically switch from table rows to mobile cards at the shared
mobile breakpoint. `hideOnMobile` can hide low-value columns, while
`mobileIdentityColumns` (default `3`) preserves a configurable number of leading
desktop-visible columns so every card keeps enough identity to be useful.

```tsx
<DataTable mobileIdentityColumns={2} />
```

## The two ways to use it

1. **Batteries-included** — `import { DataTable } from "@adapttable/<kit>"`.
2. **Headless** — `import { useDataTable } from "@adapttable/core"` and render
   your own markup with the returned prop-getters.
