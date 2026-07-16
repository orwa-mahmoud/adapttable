# React table pagination — paged, infinite scroll, auto by device

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

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
  using the same breakpoint as the card/table layout switch, so the two never
  drift.
- **Paged** renders a footer with a rows-per-page select, page buttons, and a
  "Showing X–Y of Z" summary.
- **Infinite** auto-loads the next page when a sentinel below the last row
  scrolls into view (`IntersectionObserver`, prefetching early), and also
  renders an explicit **Load more** button as a keyboard- and
  screen-reader-friendly fallback.
- Page and page size live in the URL (`?page=`, `?limit=`), so reloads and
  shared links restore the exact view. `defaults={{ limit }}` applies only
  while the URL is silent about a key.
- On the server tier, pagination state arrives in the consolidated
  `TableQuery` (`{ page, limit, … }`) passed to `onQueryChange` — forward both
  to your API and return `rows` + `total`; `total` drives the pager.

## Options

| Prop             | Type                                   | Default                  | Description                                                            |
| ---------------- | -------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| `paginationMode` | `"paged" \| "infinite" \| "auto"`      | `"auto"`                 | Pagination behaviour; `"auto"` = infinite on mobile, paged on desktop. |
| `defaults`       | `{ page?: number; limit?: number; … }` | `{ page: 1, limit: 25 }` | Initial page/page-size, used while the URL has no value.               |
| `labels`         | `TableLabels`                          | English                  | Override `rowsPerPage`, `loadMore`, and the `showing` range builder.   |
| `skeletonRows`   | `number`                               | page size                | Number of skeleton rows shown while loading.                           |

## Notes

- `limit` is clamped to **1–500** (`MAX_LIMIT`), whether it comes from
  `defaults` or a hand-edited URL.
- Sources built with `useServerData` (the `onQueryChange` tier) are always
  paged; `paginationMode` applies to the frontend tier and `useBackendData`.
- In infinite mode the table slices `page × limit` rows, so "page" really
  means "how much is loaded" — `fetchNextPage` just bumps it.
- The infinite-scroll sentinel is exported as a headless hook,
  `useInfiniteScroll`, for custom markup; it no-ops safely where
  `IntersectionObserver` is unavailable (SSR, tests).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
