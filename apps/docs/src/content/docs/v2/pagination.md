---
title: "React table pagination — paged, infinite, auto (v2)"
description: Numbered pages on desktop, infinite scroll on mobile, or force
  either. Server-side paging and shareable URL state included.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table pagination — paged, infinite,
      auto","item":"https://orwa-mahmoud.github.io/adapttable/v2/pagination/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/pagination.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/pagination.png
slug: v2/pagination
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — numbered pagination is on by default in the starter; edit it in the browser, no install. [Other UI kits →](/adapttable/v2/getting-started/#try-it-in-stackblitz)

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

* `paginationMode` accepts `"paged"`, `"infinite"`, or `"auto"` (the default).
  `"auto"` resolves by device: **infinite scroll on mobile, paged on desktop**,
  using the same breakpoint as the card/table layout switch, so the two never
  drift.
* **Paged** renders a footer with a rows-per-page select, page buttons, and a
  "Showing X–Y of Z" summary.
* **Infinite** auto-loads the next page when a sentinel below the last row
  scrolls into view (`IntersectionObserver`, prefetching early), and also
  renders an explicit **Load more** button as a keyboard- and
  screen-reader-friendly fallback.
* Page and page size live in the URL (`?page=`, `?limit=`), so reloads and
  shared links restore the exact view. `defaults={{ limit }}` applies only
  while the URL is silent about a key. The rows-per-page list is 10 / 25 /
  50 / 100, plus that default when it isn't already in the list — so a
  table that starts at 500 still offers 500 after you pick 10.
* On the server tier, pagination state arrives in the consolidated
  `TableQuery` (`{ page, limit, … }`) passed to `onQueryChange` — forward both
  to your API and return `rows` + `total`; `total` drives the pager.

## Cursor pagination

Offset paging asks for "rows 100–125". If a row is inserted or deleted while
someone is reading, every later page shifts by one, and they see an entry twice
or never see it at all. Cursor pagination asks for "the 25 rows after *this*
one", which cannot drift.

Declare the capability and hand back the token your API returned:

```tsx
const [data, setData] = useState({ rows: [], nextCursor: null });

const source = useServerData({
  rows: data.rows,
  total: 0, // cursor APIs usually have no count to give
  nextCursor: data.nextCursor,
  supports: { cursor: true },
  onQueryChange: async ({ cursor, limit, search }, { signal }) => {
    const res = await fetch(
      `/api/rows?limit=${limit}&search=${search}` +
        (cursor ? `&cursor=${cursor}` : ""),
      { signal },
    );
    setData(await res.json()); // { rows, nextCursor }
  },
});
```

Return `nextCursor: null` when there are no more rows — that is what ends the
list, since there is no total to count against.

What the table guarantees:

* **It only ever sends a token your server issued.** The first page carries no
  `cursor` field at all, so the query is byte-for-byte the one an offset
  endpoint already receives.
* **Back works.** Tokens are kept as a trail, so paging back through what the
  user has already seen replays their own cursors.
* **A jump to an unvisited page does nothing.** Page 7 has no token, and
  sending none would silently re-serve page 1. This is the honest shape of
  cursor pagination rather than a limitation to route around — use infinite
  scroll (`paginationMode="infinite"`) where arbitrary jumps matter.
* **A trail that no longer means anything is thrown away.** Change the search,
  the sort, a filter or the page size and every held token points into a result
  that no longer exists, so the trail resets to page 1 rather than paging into
  the previous query's rows.

### With a query library

`useQuerySource` takes the same two options, so cursor mode is not tied to the
hand-rolled tier: declare the capability and say where the token lives on your
page.

```tsx
const source = useQuerySource<Person, PeopleParams, PeoplePage>({
  usePaginatedQuery: usePeopleQuery,
  selectPage: (page) => ({ rows: page.items, total: 0 }),
  supports: { cursor: true },
  nextCursor: (page) => page.next, // the token that opens the NEXT page
});
```

The token reaches your query function as `params.cursor`, alongside the params
it already receives — nothing else about the hook changes.

* **A new sort, filter, search, or page size resets to the first page.** Those
  tokens describe a position in a result set that no longer exists.
* **The URL keeps everything except the cursor.** Sort, filters, search and
  page size stay shareable; an opaque token would be meaningless to whoever
  opened the link, and stale by the time they did.

Using a query library instead? `useQuerySource` already supports cursors
through your own `getNextPageParam` — the table reads `hasNextPage` and calls
`fetchNextPage`, and never needs to see the token.

## Options

| Prop             | Type                                   | Default                  | Description                                                                                                         |
| ---------------- | -------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `paginationMode` | `"paged" \| "infinite" \| "auto"`      | `"auto"`                 | Pagination behaviour; `"auto"` = infinite on mobile, paged on desktop.                                              |
| `defaults`       | `{ page?: number; limit?: number; … }` | `{ page: 1, limit: 25 }` | Initial page/page-size, used while the URL has no value.                                                            |
| `labels`         | `TableLabels`                          | English                  | Override `rowsPerPage`, `loadMore`, `previousPage`, `nextPage`, and the `showing` / `pageOf` / `goToPage` builders. |
| `skeletonRows`   | `number`                               | page size                | Number of skeleton rows shown while loading.                                                                        |

## Notes

* A page-size change is clamped to **1–500**; a hand-edited URL `limit`
  outside that range falls back to the default page size.
* `paginationMode` applies on every tier. On the `onQueryChange` tier,
  infinite mode's `fetchNextPage` advances the page and appends the rows you
  hand back to those already on screen.
* `nextCursor` is read only when the source declares `supports: { cursor: true }`.
  Without that declaration the field is ignored and no `cursor` is ever sent,
  so an endpoint written before cursors existed keeps its exact query.
* In infinite mode the frontend tier slices `page × limit` rows, so "page" really
  means "how much is loaded" — `fetchNextPage` just bumps it.
* The infinite-scroll sentinel is exported as a headless hook,
  `useInfiniteScroll`, for custom markup; it no-ops safely where
  `IntersectionObserver` is unavailable (SSR, tests).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
