# Custom Angular sources and the TableSource contract

Use a custom `TableSource<TRow>` when an existing store or transport already
owns the table's data and view state. The Angular binding reads a source signal;
it does not require a specific HTTP client or query library.

First consider the built-in builders in [Data tiers](./data-tiers.md):
`injectFrontendData` processes an array, `injectServerData` coordinates
host-fetched pages, and `injectQuerySource` consumes infinite-query signals.
They already handle URL state and the paging/loading rules.

## Bridge an existing store

`fromStore` accepts an object with `getSnapshot` and `subscribe`. This example
defines the integration boundary for an application that already has such a
store. Provide `PEOPLE_SOURCE` with that real store in the consuming route or
application injector.

```ts
import { Component, inject, InjectionToken } from "@angular/core";
import {
  fromStore,
  type ColumnDef,
  type ExternalStore,
  type TableSource,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
}

export const PEOPLE_SOURCE = new InjectionToken<
  ExternalStore<TableSource<Person>>
>("People table source");

@Component({
  selector: "store-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      tableLabel="People"
    />
  `,
})
export class StorePeopleTable {
  readonly source = fromStore(inject(PEOPLE_SOURCE));
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly rowKey = (row: Person) => row.id;
}
```

The store must return the same snapshot object until something changes, then
publish a new snapshot and notify subscribers. Mutating the old object in place
does not reliably invalidate Angular's signal consumers. `subscribe(listener)`
must return its unsubscribe function; `fromStore` calls it when the injection
context is destroyed. It does not dispose a globally shared store for you.

A host-owned `computed<TableSource<Person>>` also works. Read all relevant
signals inside the computation and expose actions that update the host's state.
Do not rebuild the source controller or start subscriptions from a template.

## Required data and view state

| Members                                                         | Meaning                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `rows`, `total`                                                 | Materialized rows for the current slice, and the matching dataset's count |
| `page`, `limit`, `defaultLimit`                                 | One-based page, current page size and initial page size                   |
| `search`, `sortBy`, `sortDir`, `sortLevels`, `extra`, `groupBy` | Current committed view state                                              |
| `paginationMode`                                                | Resolved `"paged"` or `"infinite"`, never `"auto"`                        |
| `isLoading`                                                     | First load before a result has settled                                    |
| `isFetching`                                                    | Any current request, including refreshes                                  |
| `isFetchingNextPage`, `hasNextPage`                             | Infinite append state and availability                                    |
| `error`                                                         | An `Error` or `null`                                                      |
| `fetchNextPage`                                                 | Guarded append operation; inert in paged mode or when exhausted           |

Expose the shared state mutators: `setPage`, `setLimit`, `setSort`,
`toggleSortLevel`, `setSearch`, `setExtra`, `setExtras`, `clearExtras`,
`clearAll` and `setGroupBy`. Optional methods include `setFilterTree`,
`initializeGroupBy` and `setGroupAggregateOverrides`.

Setters must update the source's state, arrange any required fetch, and publish
the resulting frame. Changes to the matching set reset to page 1. `setSort`
replaces a multi-sort chain; `toggleSortLevel` cycles a member in that chain.
`clearExtras` preserves search and sort; `clearAll` clears the whole query view.
If a control is offered, its action must work; placeholder no-op setters are
not a complete source.

## Optional capabilities

`allFilteredRows` means the complete searched, filtered and sorted dataset is
available locally, before paging. `allSearchedRows` is the full searched set
before extra filters, used for faceting. Never populate either with one remote
page to unlock local-only features.

`capabilities` describes actual full-data access, grouping, export, selection
and total-count semantics. When omitted, the table derives these from the
source shape. Server-computed `groups`, `facets`, `groupAggregations`,
`queryAggregates`, `aggregateOperations` and `honorsAggregates` communicate
additional backend results and restrictions. See the shared
[source reference](../custom-table-source.md)
and [server queries](../server-queries.md).

`refetch` enables retry when it can genuinely repeat the failed load. A frontend
source may also expose `tableEngine` for neutral revisions and row scopes.
Do not fabricate an engine merely to claim capabilities.

## Async and lifecycle rules

Use request identity or cancellation to prevent an old response from replacing
a newer query. Preserve rows during background refresh, track append requests
separately, clamp pages when totals shrink, and avoid appending the same page
twice. These are responsibilities of the custom source, not the renderer.

Keep the initial snapshot safe for SSR; access browser-only transports after
checking the platform. Destroy component-owned sockets and requests with the
component. If URL persistence belongs to your store, do not also create an
independent URL owner for the same table namespace.

See [Headless rendering](./headless.md), [Pagination](./pagination.md),
[Realtime](./realtime.md) and [Angular SSR](./ssr-rsc.md).
