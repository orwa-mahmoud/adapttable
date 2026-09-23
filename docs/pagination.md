# React table pagination — paged, infinite scroll & auto by device

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — numbered pagination is on by default in the starter; edit it in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Every table paginates out of the box. Choose between a classic paged footer,
infinite scroll, or `"auto"` (the default), which picks per device.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  city: string;
}

const data: Person[] = Array.from({ length: 120 }, (_, i) => ({
  id: String(i + 1),
  name: `Person ${i + 1}`,
  city: i % 2 === 0 ? "Dubai" : "Oslo",
}));

export function People() {
  return (
    <DataTable
      data={data}
      columns={[{ key: "name", sortable: true }, { key: "city" }]}
      rowKey={(r) => r.id}
      paginationMode="paged"
      defaults={{ limit: 10 }}
    />
  );
}
```

## How it works

- `paginationMode` accepts `"paged"`, `"infinite"`, or `"auto"` (the default).
  `"auto"` resolves by device: **infinite scroll on mobile, paged on desktop**,
  by the same rule as the card/table layout switch — the 768px media query, or
  `mobileBreakpoint` when you set it, and `forceMobile` over both.
- **Paged** renders a footer with a rows-per-page select, page buttons, and a
  "Showing X–Y of Z" summary.
- **Infinite** auto-loads the next page when a sentinel below the last row
  scrolls into view (`IntersectionObserver`, prefetching early), and also
  renders an explicit **Load more** button as a keyboard- and
  screen-reader-friendly fallback.
- Page and page size live in the URL (`?page=`, `?limit=`), so reloads and
  shared links restore the exact view. `defaults={{ limit }}` applies only
  while the URL is silent about a key. The rows-per-page list is 10 / 25 /
  50 / 100 (`PAGE_SIZE_OPTIONS`; `pageSizeOptions()` builds the list, both
  from `@adapttable/core`), plus that default when it isn't already in the
  list — so a table that starts at 500 still offers 500 after you pick 10.
- On the server tier, pagination state arrives in the consolidated
  `TableQuery` (`{ page, limit, … }`) passed to `onQueryChange` — forward both
  to your API and return `rows` + `total`; `total` drives the pager.

## Cursor pagination

Offset paging asks for "rows 100–125". If a row is inserted or deleted while
someone is reading, every later page shifts by one, and they see an entry twice
or never see it at all. Cursor pagination asks for "the 25 rows after _this_
one", which cannot drift.

Declare the capability and hand back the token your API returned:

```tsx
import { useState } from "react";
import { useServerData } from "@adapttable/react";
import { DataTable } from "@adapttable/mantine";

interface Row {
  id: string;
  name: string;
}

export function Rows() {
  const [data, setData] = useState<{
    rows: Row[];
    nextCursor: string | null;
  }>({ rows: [], nextCursor: null });

  const source = useServerData<Row>({
    rows: data.rows,
    total: 0, // cursor APIs usually have no count to give
    nextCursor: data.nextCursor,
    supports: { cursor: true },
    onQueryChange: async ({ cursor, limit, search }, { signal }) => {
      const params = new URLSearchParams({ limit: String(limit), search });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/rows?${params}`, { signal });
      setData(await res.json()); // { rows, nextCursor }
    },
  });

  return (
    <DataTable
      source={source}
      columns={[{ key: "name" }]}
      rowKey={(r) => r.id}
    />
  );
}
```

Return `nextCursor: null` when there are no more rows — that is what ends the
list, since there is no total to count against.

What the table guarantees:

- **It only ever sends a token your server issued.** The first page carries no
  `cursor` field at all, so the query is byte-for-byte the one an offset
  endpoint already receives.
- **Back works.** Tokens are kept as a trail, so paging back through what the
  user has already seen replays their own cursors.
- **A jump to an unvisited page does nothing.** Page 7 has no token, and
  sending none would silently re-serve page 1. This is the honest shape of
  cursor pagination rather than a limitation to route around — use offset
  paging (omit `supports.cursor`) where arbitrary jumps matter.
- **A trail that no longer means anything is thrown away.** Change the search,
  the sort, a filter or the page size and every held token points into a result
  that no longer exists, so the trail resets to page 1 rather than paging into
  the previous query's rows.

### With a query library

`useQuerySource` takes the same two options, so cursor mode is not tied to the
hand-rolled tier: declare the capability and say where the token lives on your
page.

```tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import type { TableQueryParams } from "@adapttable/core";
import { useQuerySource } from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
}
type PeopleParams = TableQueryParams;
interface PeoplePage {
  items: Person[];
  next: string | null;
}

function usePeopleQuery(params: Partial<PeopleParams>) {
  return useInfiniteQuery({
    queryKey: ["people", params],
    queryFn: async (): Promise<PeoplePage> => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
      }
      return (await fetch(`/api/people?${search}`)).json();
    },
    initialPageParam: params.page ?? 1,
    getNextPageParam: () => undefined,
  });
}

export function usePeopleSource() {
  return useQuerySource<Person, PeopleParams, PeoplePage>({
    usePaginatedQuery: usePeopleQuery,
    selectPage: (page) => ({ rows: page.items, total: 0 }),
    supports: { cursor: true },
    nextCursor: (page) => page.next, // the token that opens the NEXT page
  });
}
```

The token reaches your query function as `params.cursor`, alongside the params
it already receives — nothing else about the hook changes.

- **A new sort, filter, search, or page size resets to the first page.** Those
  tokens describe a position in a result set that no longer exists.
- **The URL keeps everything except the cursor.** Sort, filters, search and
  page size stay shareable; an opaque token would be meaningless to whoever
  opened the link, and stale by the time they did.

## Options

| Prop               | Type                                   | Default                  | Description                                                                               |
| ------------------ | -------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `paginationMode`   | `"paged" \| "infinite" \| "auto"`      | `"auto"`                 | Pagination behaviour; `"auto"` = infinite on mobile, paged on desktop.                    |
| `defaults`         | `{ page?: number; limit?: number; … }` | `{ page: 1, limit: 25 }` | Initial page/page-size, used while the URL has no value.                                  |
| `labels`           | `TableLabels`                          | English                  | Override `rowsPerPage`, `loadMore`, and the `showing` range builder.                      |
| `skeletonRows`     | `number`                               | page size                | Number of skeleton rows shown while loading.                                              |
| `mobileBreakpoint` | `number`                               | `768`                    | Width at or below which the card layout takes over. `"auto"` pagination does not read it. |
| `forceMobile`      | `boolean`                              | —                        | Pins the card layout. `"auto"` pagination does not read it.                               |

## Notes

- A URL `limit` outside **1–500** falls back to the default page size, and
  the rows-per-page control clamps to 1–500. `defaults.limit` is used as
  given.
- `paginationMode` applies to every tier. On the `onQueryChange` tier
  (`useServerData`) infinite mode appends each new page to the rows already
  shown.
- `nextCursor` is read only when the source declares `supports: { cursor: true }`.
  Without that declaration the field is ignored and no `cursor` is ever sent,
  so an endpoint written before cursors existed keeps its exact query.
- In infinite mode the table slices `page × limit` rows, so "page" really
  means "how much is loaded" — `fetchNextPage` just bumps it.
- The infinite-scroll sentinel is exported from `@adapttable/react` as a
  headless hook, `useInfiniteScroll`, for custom markup (`rootMargin`
  defaults to `"200px"`); it no-ops safely where
  `IntersectionObserver` is unavailable (SSR, tests).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
