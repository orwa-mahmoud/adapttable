# Angular table pagination: client-side and server-side

Pagination belongs to the source. Both Angular kits render the same source
state through their own controls. Pages are one-based, and `total` is the
count of every matching row, not just the current page.

## Set the initial page size

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
}

@Component({
  selector: "paged-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [defaults]="{ limit: 50 }"
      paginationMode="paged"
      tableLabel="People"
    />
  `,
})
export class PagedPeopleTable {
  readonly people: Person[] = Array.from({ length: 120 }, (_, index) => ({
    id: String(index + 1),
    name: `Person ${index + 1}`,
  }));
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly rowKey = (row: Person) => row.id;
}
```

`defaults` apply when the URL has no corresponding value. The shell reads
them at initialization; use the source's `setLimit` and `setPage` methods to
change the live view. The default limit is 25. The page-size chooser retains
your initial limit even after the reader chooses a different size.

## Choose a mode

- `"paged"` renders the numbered pager and rows-per-page controls
- `"infinite"` extends the visible rows using `fetchNextPage`
- `"auto"` is the default: desktop uses pages, mobile uses infinite loading

`forceMobile` selects the card layout and influences automatic mode. A
prebuilt source should receive its own matching `forceMobile` or
`paginationMode` option; shell inputs do not rebuild it.

Infinite mode offers a load-more control and observes the load-more area as
it approaches the viewport. The source prevents concurrent append requests
and stops at the end. Compose [virtualization](./virtualization.md) when a
large growing row list should render only its visible window. Infinite
loading by itself is not virtualization.

## Server-side pagination in Angular

Use server-side pagination when an API owns the complete dataset. Bind its
current page to `[data]`, the full matching count to `[total]`, and a stable
loader to `[onQueryChange]`. Do not slice the returned page again in the host.
The [complete server-side Angular table example](./data-tiers.md#server-pages-with-cancellation-and-errors)
includes a standalone component, a POST request, cancellation, loading and
error signals, and the response key needed to reject stale pages.

For a page-number endpoint, translate the one-based query page into the
backend's offset as `(page - 1) * limit`. Apply search, filters and sorting
before that offset and limit, and compute `total` with the same filters.
Changing from page size 25 to 50 must request a new first page, rather than
reuse rows from the previous page size.

## Cursor pagination and infinite scrolling

On the server tier, changing page invokes `[onQueryChange]`; the host publishes
that page's rows, total, loading state and response key. Search, filtering,
sorting and page-size changes reset the view to page 1. If a total shrinks
past the current page, built-in sources clamp the requested page into range.

For cursor endpoints, `injectServerData` accepts `nextCursor` and
`supports: { cursor: true }`. `injectQuerySource` takes a `nextCursor(page)`
extractor with the same declared support. Tokens are opaque: preserve the
exact token returned by the server and return `null` when exhausted. The
source maintains the visited cursor trail; do not invent an offset from a
cursor string or promise arbitrary jumps to unfetched pages.

For a custom pager, read `table.pagination()` and `table.pagerSlots()` from
`injectDataTable`, then call `table.setPage` and `table.setLimit`. For a
custom infinite surface, preserve the complete `loadMoreAttrs()` and
`loadMoreButtonAttrs()` records with `AdaptAttrs`.

## State and feedback

URL state stores page and limit by default. Set `urlKey` for multiple tables
on one page; see [URL state](./url-state.md). Keep the permanent table status
announcer when rendering headlessly, and announce the actual visible range.
Do not remove current rows merely to represent a background refresh. Surface
fetch failures and offer retry only when the source supplies it.

See [Data tiers](./data-tiers.md), [Mobile cards](./mobile.md),
[Headless rendering](./headless.md) and the
[server query contract](../server-queries.md).
