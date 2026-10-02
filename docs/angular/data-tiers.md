# Angular data tiers: arrays, servers and query signals

The table always consumes a `TableSource`. Its kit shell can build one from
an in-memory array, connect host-fetched pages, or consume a source you already
created. The columns and visible controls remain the same.

## Select the tier

| Inputs                         | Who processes the data?                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `[data]`                       | Frontend tier searches, filters, sorts and pages all supplied rows |
| `[data]` and `[onQueryChange]` | Server tier asks the host to fetch the matching page               |
| `mode="frontend"` with both    | Frontend tier processes rows; the callback observes query changes  |
| `[source]`                     | Your source controls rows, view state and capabilities             |

Provide only the data contract you intend to use. A prebuilt source owns its
query and URL setup; shell defaults do not reconfigure that source. URL state
is enabled by default. Use `urlKey` for independent tables or disable it with
`[urlSync]="false"` / `urlSync: false`.

## Frontend data as a signal

Inside an Angular component or service's injection context:

```ts
import { Injectable, signal } from "@angular/core";
import { injectFrontendData, type ColumnDef } from "@adapttable/angular";

interface Person {
  id: string;
  name: string;
}

@Injectable()
export class PeopleState {
  readonly people = signal<Person[]>([{ id: "ada", name: "Ada Lovelace" }]);
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly source = injectFrontendData({
    data: this.people,
    columns: this.columns,
    getRowId: (row) => row.id,
    getSearchText: (row) => row.name,
    defaults: { limit: 25 },
    urlSync: false,
  });
}
```

Provide this service in the consuming component's `providers` and inject it
there, so the source lives as long as that table. Do not construct it with
`new` outside Angular. Pass the signal itself to the source builder, and bind
the returned signal through `[source]` on the kit. Update rows with a new
array. Passing `people()` into the builder would capture the current array
instead of following future updates.

## Server pages with cancellation and errors

This complete component assumes your application implements `POST /api/people`:
it accepts a `TableQuery` and returns `{ rows, total }`. The server must apply
the query to the complete matching dataset, not merely the returned page.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef, TableQueryHandler } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Person {
  id: string;
  name: string;
}
interface PeoplePage {
  rows: Person[];
  total: number;
}

@Component({
  selector: "server-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [total]="total()"
      [loading]="loading()"
      [error]="error()"
      [responseKey]="responseKey()"
      [onQueryChange]="load"
      [columns]="columns"
      [rowKey]="rowKey"
      paginationMode="paged"
      tableLabel="People"
    />
  `,
})
export class ServerPeopleTable {
  readonly rows = signal<Person[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly error = signal<Error | null>(null);
  readonly responseKey = signal<string | undefined>(undefined);
  readonly columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
  readonly rowKey = (row: Person) => row.id;

  readonly load: TableQueryHandler = async (query, info) => {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch("/api/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: info.signal,
      });
      if (!response.ok)
        throw new Error(`People request failed: ${response.status}`);
      const page = (await response.json()) as PeoplePage;
      if (info.signal.aborted) return;
      this.rows.set(page.rows);
      this.total.set(page.total);
      this.responseKey.set(info.key);
    } catch (error) {
      if (!info.signal.aborted) {
        this.error.set(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    } finally {
      if (!info.signal.aborted) this.loading.set(false);
    }
  };
}
```

`onQueryChange` is a callback input, not an Angular output. The first callback
includes restored URL state. A changed query aborts the preceding request;
destroying the table also aborts the request in flight. Honor that signal and
ignore late responses, even if your transport cannot cancel its underlying work.

Keep the previous rows while refreshing. Initial loading, background fetching
and append fetching have distinct source flags; the kit shows a first-load
skeleton, refresh feedback and retryable failures accordingly. `responseKey`
identifies the query answered by the published data. `total` is the complete
matching count, not `rows.length`.

For a reusable controller, `injectServerData({ rows, total, loading, error,
onQueryChange, ... })` returns a source signal with the same lifecycle.

## A query library

`injectQuerySource` accepts a `query(paramsSignal)` function, called once in
the injection context. That function creates your query using reactive
`params()` inside the query options. Its return value follows
`InfiniteQuerySignals<TPage>`:

- Signals for `data` (`{ pages, pageParams }`), `isLoading`, `isFetching`,
  `isFetchingNextPage`, `hasNextPage`, `error`, and optional `dataUpdatedAt`
- `fetchNextPage` and `refetch` functions

Angular Query's `injectInfiniteQuery` has this shape. Configure its provider
in your host app, key the query on the current params, and return a next-page
parameter only while a page remains. `selectPage` maps a custom response to
rows/total/facets; otherwise the adapter reads `PaginatedResponse<TRow>`.
The source handles page selection in paged mode and flattening in infinite
mode. A regular promise or a React query hook is not this contract.

For example, this component expects an application endpoint
`POST /api/people-pages` that accepts the params and returns
`{ items, total, nextPage }`. `nextPage` is `null` at the end. The optional
Angular Query package must be available in the host application.

```ts
import { Component, type Signal } from "@angular/core";
import {
  injectQuerySource,
  type ColumnDef,
  type TableQueryParams,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  injectInfiniteQuery,
  provideTanStackQuery,
  QueryClient,
} from "@tanstack/angular-query-experimental";

interface QueryPerson {
  id: string;
  name: string;
}
interface QueryPeoplePage {
  items: QueryPerson[];
  total: number;
  nextPage: number | null;
}

function injectPeopleQuery(params: Signal<Partial<TableQueryParams>>) {
  return injectInfiniteQuery(() => {
    const current = params();
    return {
      queryKey: ["people", current],
      initialPageParam: current.page ?? 1,
      queryFn: async ({ pageParam, signal }): Promise<QueryPeoplePage> => {
        const response = await fetch("/api/people-pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...current, page: pageParam }),
          signal,
        });
        if (!response.ok)
          throw new Error(`People request failed: ${response.status}`);
        return (await response.json()) as QueryPeoplePage;
      },
      getNextPageParam: (page: QueryPeoplePage) => page.nextPage ?? undefined,
    };
  });
}

@Component({
  selector: "query-people-table",
  standalone: true,
  imports: [AdaptDataTable],
  providers: [provideTanStackQuery(new QueryClient())],
  template: `
    <adapt-data-table
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      tableLabel="People"
    />
  `,
})
export class QueryPeopleTable {
  readonly columns: ColumnDef<QueryPerson>[] = [
    { key: "name", sortable: true },
  ];
  readonly rowKey = (row: QueryPerson) => row.id;
  readonly source = injectQuerySource<
    QueryPerson,
    TableQueryParams,
    QueryPeoplePage
  >({
    query: injectPeopleQuery,
    paginationMode: "paged",
    defaults: { limit: 25 },
    urlKey: "people",
    selectPage: (page) => ({ rows: page.items, total: page.total }),
  });
}
```

If the app already provides a query client, use that provider rather than
creating a second cache for each table. Query errors and fetch state flow
through the source to the same kit loading/error surfaces.

## Capabilities and ownership

Declare only endpoint extensions the backend implements through `supports`:
cursor paging, filter trees, facets, grouping, aggregates and tree queries
have separate contracts. Multi-sort is the baseline query's `sortLevels`
field, not a `supports` option. An array of one remote page is not a complete
frontend dataset. Do not advertise full-data export, totals or grouping that
the source cannot fulfill.

`injectTableData` is the higher-level resolver used by adapters. It returns
`{ source, runtime }`; `runtime` is the declarative filter runtime, not a
second source. All `inject*` builders need an injection context or their
explicit `injector` option. Keep one controller for the table's lifetime.

See [Pagination](./pagination.md), [Custom sources](./custom-table-source.md),
[URL state](./url-state.md), [Angular SSR](./ssr-rsc.md) and the shared
[server query contract](../server-queries.md).
