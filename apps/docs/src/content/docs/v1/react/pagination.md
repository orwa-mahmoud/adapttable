---
title: "React table pagination — paged, infinite scroll, auto by device (v1)"
description: "React table pagination that matches the device: numbered pages on
  desktop, infinite scroll on mobile (or force either). Server-side paging and
  shareable URL state included."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table pagination — paged, infinite scroll, auto by
      device","item":"https://adapttable.orwamahmoud.com/v1/react/pagination/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/pagination.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/pagination.png
slug: v1/react/pagination
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — numbered pagination is on by default in the starter; edit it in the browser, no install. [Other UI kits →](/v1/react/getting-started/#try-it-in-stackblitz)

Every table paginates out of the box. Choose between a classic paged footer,
infinite scroll, or `"auto"` (the default), which picks per device.

## Example

```tsx
import {
  type ColumnDef,
  DataTable,
  useFrontendData,
} from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, shadcn, unstyled

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

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "city" },
];

export function People() {
  // `paginationMode` and `defaults` are source-builder options.
  const source = useFrontendData({
    data,
    columns,
    paginationMode: "paged",
    defaults: { limit: 10 },
  });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

## How it works

* `paginationMode` accepts `"paged"`, `"infinite"`, or `"auto"` (the default).
  It is an option on `useFrontendData` / `useBackendData`; a `<DataTable>`
  fed with `data` alone always runs in `"auto"`.
  `"auto"` resolves by device: **infinite scroll on mobile, paged on desktop**,
  using the same breakpoint as the card/table layout switch, so the two never
  drift.
* **Paged** renders a footer with a rows-per-page select (10 / 25 / 50 / 100,
  `PAGE_SIZE_OPTIONS`; a non-standard active `limit` is prepended), page
  buttons, and a "Showing X–Y of Z" summary.
* **Infinite** auto-loads the next page when a sentinel below the last row
  scrolls into view (`IntersectionObserver`, prefetching early), and also
  renders an explicit **Load more** button as a keyboard- and
  screen-reader-friendly fallback.
* Page and page size live in the URL (`?page=`, `?limit=`), so reloads and
  shared links restore the exact view. `defaults: { limit }` applies only
  while the URL is silent about a key.
* On the server tier, pagination state arrives in the consolidated
  `TableQuery` (`{ page, limit, … }`) passed to `onQueryChange` — forward both
  to your API and return `rows` + `total`; `total` drives the pager.

## Options

| Prop             | Type                                   | Default                  | Description                                                                                   |
| ---------------- | -------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| `paginationMode` | `"paged" \| "infinite" \| "auto"`      | `"auto"`                 | Source-builder option. Pagination behaviour; `"auto"` = infinite on mobile, paged on desktop. |
| `defaults`       | `{ page?: number; limit?: number; … }` | `{ page: 1, limit: 25 }` | Source-builder option. Initial page/page-size, used while the URL has no value.               |
| `labels`         | `TableLabels`                          | English                  | Override `rowsPerPage`, `loadMore`, and the `showing` range builder.                          |
| `skeletonRows`   | `number`                               | page size                | Number of skeleton rows shown while loading.                                                  |

## Notes

* `setLimit` clamps the page size to **1–500**; a URL `limit` outside that
  range is ignored and the default applies.
* Sources built with `useServerData` (the `onQueryChange` tier) are always
  paged; `paginationMode` applies to the frontend tier and `useBackendData`.
* In infinite mode on the frontend tier the table slices `page × limit` rows,
  so "page" really means "how much is loaded" — `fetchNextPage` just bumps it.
  `useBackendData` instead flattens the loaded pages of your infinite query.
* The infinite-scroll sentinel is exported as a headless hook,
  `useInfiniteScroll`, for custom markup; it no-ops safely where
  `IntersectionObserver` is unavailable (SSR, tests).

See it live in the [demo](https://adapttable.orwamahmoud.com/react/demo/).
