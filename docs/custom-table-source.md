# Custom React table data source — the TableSource contract

Every `<DataTable>` renders one `TableSource<TRow>`: the rows to show, the
view state that produced them, and the setters that change it. The built-in
builders — `useFrontendData`, `useServerData`, `useQuerySource` — each return
one. When none of them fits your data layer, build the object yourself and
pass it as `source`; the table cannot tell the difference.

**Related:** [Data tiers](./data-tiers.md) · [Concepts](./concepts.md) ·
[Realtime](./realtime.md) · [API](./api.md#source-capabilities)

## Pick a builder first

Most data fits a builder, and a builder already handles the edge cases this
page lists.

| Your data                                            | Use                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Rows already in memory                               | `data` alone, or `useFrontendData` headless — [data tiers](./data-tiers.md#1-frontend--data) |
| Rows pushed into memory by a socket or poll          | `data` plus `applyRowPatches` / `useRowPatchStream` — [realtime](./realtime.md)              |
| A paginated endpoint you call yourself               | `onQueryChange`, or `useServerData` headless                                                 |
| TanStack Query `useInfiniteQuery`, caching, prefetch | `useQuerySource` — [full control](./data-tiers.md#3-full-control--source)                    |

A hand-rolled source fits when:

- your data layer already speaks its own protocol — a socket that answers
  queries and pushes invalidations, an SDK with its own paging object — and
  mapping it onto the contract is shorter than routing it through
  `onQueryChange`;
- the view state (page, sort, filters) must live in a store you already own,
  because other parts of the app read and write it;
- a test or story needs a fixed source with exact flags.

## Example — a socket that answers queries

The server receives a query over a WebSocket, replies with one page, and sends
`changed` when the data moves. `useTableUrlState` supplies the whole state
half of the contract; the hook adds the data half.

```tsx
import { useEffect, useRef, useState } from "react";
// or import from "@adapttable/mui", "@adapttable/chakra", "@adapttable/antd",
// "@adapttable/radix", "@adapttable/shadcn", "@adapttable/unstyled" — same exports everywhere.
import {
  DataTable,
  type TableSource,
  useTableUrlState,
} from "@adapttable/mantine";

interface Trade {
  id: string;
  symbol: string;
  price: number;
}

/** What the server sends back over the socket. */
type ServerMessage =
  | { type: "page"; requestId: number; rows: Trade[]; total: number }
  | { type: "error"; requestId: number; message: string }
  | { type: "changed" };

/** Paged only: there is never a next page to append. */
function noNextPage(): void {}

export function useTradeSource(url: string): TableSource<Trade> {
  // The state half: page, limit, search, sort, filters, grouping and every
  // setter, URL-synced, with each visible-row change resetting to page 1.
  const state = useTableUrlState({ urlKey: "trades" });

  const socketRef = useRef<WebSocket | null>(null);
  const latestRequest = useRef(0);
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [rows, setRows] = useState<readonly Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;
    socket.onopen = () => setOpen(true);
    socket.onclose = () => setOpen(false);
    socket.onerror = () => {
      setFetching(false);
      setError(new Error("The trades feed is unavailable."));
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as ServerMessage;
      if (message.type === "changed") {
        // The server says the data moved: ask for the same view again.
        setRevision((n) => n + 1);
        return;
      }
      // A reply to a superseded query is dropped.
      if (message.requestId !== latestRequest.current) return;
      setFetching(false);
      if (message.type === "error") {
        setError(new Error(message.message));
        return;
      }
      setRows(message.rows);
      setTotal(message.total);
      setError(null);
      setLoaded(true);
    };
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [url]);

  const { page, limit, search, sortBy, sortDir, extra } = state;
  useEffect(() => {
    const socket = socketRef.current;
    if (!open || !socket) return;
    latestRequest.current += 1;
    setFetching(true);
    socket.send(
      JSON.stringify({
        type: "query",
        requestId: latestRequest.current,
        page,
        limit,
        search,
        sortBy,
        sortDir,
        filters: extra,
      })
    );
  }, [open, revision, page, limit, search, sortBy, sortDir, extra]);

  return {
    ...state,
    rows,
    total,
    isLoading: !loaded,
    isFetching: fetching,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: noNextPage,
    error,
    refetch: () => setRevision((n) => n + 1),
    paginationMode: "paged",
    capabilities: {
      fullDataset: false,
      grouping: false,
      selectAcrossPages: true,
      exportScope: "page",
      totalCount: "exact",
    },
  };
}

export function TradesTable() {
  const source = useTradeSource("wss://example.com/trades");
  return (
    <DataTable
      source={source}
      columns={[
        { key: "symbol", sortable: true },
        { key: "price", sortable: true, align: "end" },
      ]}
      rowKey={(row) => row.id}
    />
  );
}
```

## How it works

- `source` wins tier resolution: the table uses the object as it is and does
  no filtering, sorting or paging of its own. Passing `data` or
  `onQueryChange` alongside it dev-warns.
- `useTableUrlState` returns every state field and every setter the contract
  needs (`UseTableUrlStateResult` extends `TableStateMutators`), so spreading
  it covers that half. Pass `urlSync: false` to keep the same state in memory
  instead of the URL.
- The source re-sends its query whenever a state value changes, and on
  `refetch()` or a server `changed` message. Each request carries an id, and a
  reply to an older id is dropped, so a slow answer never overwrites a newer
  one.
- `isLoading` is true until the first page arrives and never again;
  `isFetching` is true whenever a request is in flight. The table draws the
  skeleton while `isLoading` holds and no rows exist, and a non-blocking
  refresh indicator for every later request.
- `capabilities` says this source serves one page at a time and counts the
  full match set. Grouping is off, so a `groupBy` in the URL is ignored and the
  status bar says why.

## The contract

`TableSource<TRow>` is exported from `@adapttable/core` and re-exported by
every kit. The members below are required.

### Data

| Member               | Type                    | What the table does with it                                                                                                |
| -------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `rows`               | `readonly TRow[]`       | Renders them — the current page, or every loaded row in infinite mode.                                                     |
| `total`              | `number`                | Drives the pager and the "select all N matching" banner.                                                                   |
| `isLoading`          | `boolean`               | First load only. With no rows, the body renders the skeleton. A background refresh never raises it again.                  |
| `isFetching`         | `boolean`               | Any request in flight. Without `isLoading` or `isFetchingNextPage`, the table shows its refresh indicator and `aria-busy`. |
| `isFetchingNextPage` | `boolean`               | An append started by `fetchNextPage` is in flight. Always `false` in paged mode.                                           |
| `hasNextPage`        | `boolean`               | Infinite mode shows Load more and arms the scroll sentinel. Always `false` in paged mode.                                  |
| `fetchNextPage`      | `() => void`            | Appends the next page. A no-op in paged mode, while an append is in flight, or when the data is exhausted.                 |
| `error`              | `Error \| null`         | Non-null replaces the body with the error state and hides the pager.                                                       |
| `paginationMode`     | `"paged" \| "infinite"` | The resolved mode — never `"auto"`. Paged shows the footer pager; infinite shows Load more.                                |

### View state

| Member         | Type                           | Meaning                                                                            |
| -------------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| `page`         | `number`                       | Current 1-based page.                                                              |
| `limit`        | `number`                       | Current page size.                                                                 |
| `defaultLimit` | `number`                       | The size the rows-per-page list keeps offering after the reader picks another one. |
| `search`       | `string`                       | Committed search term.                                                             |
| `sortBy`       | `string \| undefined`          | Active sort column key.                                                            |
| `sortDir`      | `"asc" \| "desc" \| undefined` | Active sort direction.                                                             |
| `sortLevels`   | `readonly SortLevel[]`         | The multi-sort chain; empty unless multi-sort is in use.                           |
| `extra`        | `ExtraFilters`                 | The filter bag: `Record<string, string \| string[] \| number \| undefined>`.       |
| `groupBy`      | `string \| undefined`          | Row-grouping keys, comma-separated.                                                |

### Setters — `TableStateMutators`

Every setter that changes which rows are visible also resets to page 1.

| Member            | Signature                                                 | Obligation                                                                             |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `setPage`         | `(next: number) => void`                                  | Set the 1-based page. The only setter that does not reset the page.                    |
| `setLimit`        | `(next: number) => void`                                  | Set the page size; reset to page 1.                                                    |
| `setSort`         | `(key: string \| undefined, dir?: SortDirection) => void` | Set or clear the single-column sort; reset the multi-sort chain and the page.          |
| `toggleSortLevel` | `(key: string) => void`                                   | Cycle the key in the chain: absent → asc → desc → removed. New keys append at the end. |
| `setSearch`       | `(next: string) => void`                                  | Set or clear the search term; reset to page 1.                                         |
| `setExtra`        | `(key: string, value: FilterValue) => void`               | Set one filter; reset to page 1.                                                       |
| `setExtras`       | `(updates: ExtraFilters) => void`                         | Set several filters in one commit; reset to page 1.                                    |
| `clearExtras`     | `() => void`                                              | Clear every filter; keep search and sort; reset to page 1.                             |
| `clearAll`        | `() => void`                                              | Clear search, sort, grouping, page and every filter in one commit.                     |
| `setGroupBy`      | `(key: string \| undefined) => void`                      | Set or clear the grouping keys; reset to page 1.                                       |

The table's Clear filters action calls `clearExtras()`, then
`setFilterTree?.(undefined)`. The empty state reads "no results" rather than
"no data" when a filter chip is active, `extra` has a key, or `search` is
non-empty.

## Optional members

A source adds these when it can answer them. Leaving one out turns off what it
would have unlocked; nothing else changes.

| Member                                                   | Add it when                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `refetch`                                                | The source can re-run its fetch. The error state offers Retry only when this exists, and shows it as retrying while `isFetching` is true.                                |
| `allFilteredRows`                                        | Every row matching search, filters and sort is in hand, unpaginated. Client grouping, export of every matching row and select-across-pages read it.                      |
| `allSearchedRows`                                        | Rows after search, before filters. Facet counts start here so a checklist can exclude its own filter.                                                                    |
| `facets`                                                 | You computed distinct-value counts per filter key (`FacetMap`) — on a server, the counts for `query.facets`.                                                             |
| `filterTree` / `setFilterTree`                           | The source applies a nested AND/OR tree ([advanced filters](./filter-tree.md)).                                                                                          |
| `capabilities`                                           | The shape of the source would mislead the table — see below.                                                                                                             |
| `groups`                                                 | The server computed the groups (`QueryGroupRow<TRow>[]`) for the current `groupBy`. The table renders them instead of grouping the one page it holds.                    |
| `groupAggregations` / `queryAggregates`                  | With server groups: the operations the rows on screen were computed with, and the developer's original `query.aggregates`.                                               |
| `aggregateOperations`                                    | The backend names the aggregate ids it computes. Omitted, the five standard functions are assumed.                                                                       |
| `honorsAggregates`                                       | The source computes the `query.aggregates` it receives. On server groups the reader's aggregate controls are enabled only when this is `true`. Frontend sources omit it. |
| `groupAggregateOverrides` / `setGroupAggregateOverrides` | The source keeps the reader's per-session aggregate choices. `useTableUrlState` provides both.                                                                           |
| `initializeGroupBy`                                      | Set grouping only when no grouping state exists yet, so an explicit empty value still wins. `useTableUrlState` provides it.                                              |
| `tableEngine`                                            | The source is backed by a `TableEngine` — see [the engine and revisions](#the-engine-and-revisions).                                                                     |

## State that lives in your own store

When page, sort and filters must live in a store you own, implement the setters
yourself. This hook keeps the view in React state; the same functions map onto
any store's actions.

```ts
import { useState } from "react";
import type {
  ExtraFilters,
  SortLevel,
  TableSource,
  TableStateMutators,
} from "@adapttable/core";

/** The view a table reads and writes, held wherever your app keeps state. */
export type ViewState = TableStateMutators &
  Pick<
    TableSource<unknown>,
    | "page"
    | "limit"
    | "defaultLimit"
    | "search"
    | "sortBy"
    | "sortDir"
    | "extra"
    | "groupBy"
  >;

interface View {
  page: number;
  limit: number;
  search: string;
  sortLevels: readonly SortLevel[];
  extra: ExtraFilters;
  groupBy: string | undefined;
}

const DEFAULT_LIMIT = 25;
const INITIAL: View = {
  page: 1,
  limit: DEFAULT_LIMIT,
  search: "",
  sortLevels: [],
  extra: {},
  groupBy: undefined,
};

/** absent → asc → desc → removed; a new key joins the end of the chain. */
function cycleLevel(
  levels: readonly SortLevel[],
  key: string
): readonly SortLevel[] {
  const current = levels.find((level) => level.key === key);
  if (!current) return [...levels, { key, dir: "asc" }];
  if (current.dir === "asc") {
    return levels.map((level) =>
      level.key === key ? { key, dir: "desc" } : level
    );
  }
  return levels.filter((level) => level.key !== key);
}

export function useViewState(): ViewState {
  const [view, setView] = useState<View>(INITIAL);
  // Every change to which rows are visible starts again at page 1.
  const narrow = (next: (prev: View) => Partial<View>) =>
    setView((prev) => ({ ...prev, ...next(prev), page: 1 }));
  const head = view.sortLevels[0];

  return {
    ...view,
    defaultLimit: DEFAULT_LIMIT,
    sortBy: head?.key,
    sortDir: head?.dir,
    setPage: (page) => setView((prev) => ({ ...prev, page })),
    setLimit: (limit) => narrow(() => ({ limit })),
    setSort: (key, dir = "asc") =>
      narrow(() => ({ sortLevels: key ? [{ key, dir }] : [] })),
    toggleSortLevel: (key) =>
      narrow((prev) => ({ sortLevels: cycleLevel(prev.sortLevels, key) })),
    setSearch: (search) => narrow(() => ({ search })),
    setExtra: (key, value) =>
      narrow((prev) => ({ extra: { ...prev.extra, [key]: value } })),
    setExtras: (updates) =>
      narrow((prev) => ({ extra: { ...prev.extra, ...updates } })),
    clearExtras: () => narrow(() => ({ extra: {} })),
    clearAll: () => setView((prev) => ({ ...INITIAL, limit: prev.limit })),
    setGroupBy: (groupBy) => narrow(() => ({ groupBy })),
  };
}
```

Swap `useTableUrlState({ urlKey: "trades" })` in the socket example for
`useViewState()` and the rest of the source is unchanged. `sortBy` and
`sortDir` read the head of the chain, so single-column and multi-column
sorting stay one state.

## `capabilities` — what the source can do

Some controls need more than one page: exporting every row, grouping, "select
all 2,431 matching". `sourceCapabilities(source)` in `@adapttable/core` is the
one place the table decides what a source supports. A declared
`capabilities` object wins outright — it is used whole, not merged. Without
one, the answer is read off the source's shape:

| Capability          | Inferred as                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `fullDataset`       | `true` when `allFilteredRows` is present.                                                        |
| `grouping`          | `"server"` when `groups` is present; otherwise `"client"` when `fullDataset`; otherwise `false`. |
| `selectAcrossPages` | `true` when `fullDataset`, or when `total` is greater than zero.                                 |
| `exportScope`       | `"all"` when `fullDataset`; otherwise `"page"`.                                                  |
| `totalCount`        | `"exact"` when `fullDataset`, or when `total` is greater than zero; otherwise `"loaded"`.        |

Declare `capabilities` when the shape says the wrong thing: a paged source
whose backend can export or select everything, or an in-memory slice that must
not pose as the whole set. A declaration describes support; it does not move
data. `exportScope: "all"` without `allFilteredRows` still needs an export
route on the export feature — see
[what a source can do](./data-tiers.md#what-a-source-can-do--capabilities) and
[browser and server-built exports](./exporting.md).

## The engine and revisions

`tableEngine` is optional, and only `useFrontendData` sets it among the
builders. When a source carries one, the table wraps it with
`createNeutralTable(engine, engine.tableId, binding)` and publishes the
resulting `NeutralTable` — the shape `@adapttable/ai` reads — alongside the
rows it renders. A source without an engine renders exactly the same.

Revisions belong to the engine, not to the source. `TableRevisions` carries
four counters — `data`, `view`, `schema`, `policy` — that a subscriber wakes on
through `engine.subscribe(axes, listener)`, and `revisionToken(revisions)`
folds them into one comparable string. `TableSource` has no counter of its
own: the table reads a source on every render, so a hand-rolled source signals
change the way any React value does. Publish a new `rows` array when the data
changes and keep the same one when it does not — derived views compare arrays
by identity.

To back a custom source with an engine, build it with `createTableEngine` from
`@adapttable/core` — see
[the engine, and why it has no React in it](./concepts.md#the-engine-and-why-it-has-no-react-in-it).

## Notes

- `groupBy` alone never groups a one-page source. Grouping needs
  `allFilteredRows` (client) or `groups` (server); without either, the table
  ignores it and the status bar carries the reason.
- In infinite mode, `rows` is every row loaded so far and `fetchNextPage`
  appends to it — the adapters call it when the bottom of the list scrolls
  into view and from the Load more button.
- `refetch` may return a promise or nothing. The table calls it from the error
  state's Retry and does not await it.
- The table never owns the data. Edits, adds, deletes and reorders reach your
  app through feature callbacks; a source reports the result through `rows`.
- `TableSource`, `TableStateMutators`, `TableSourceCapabilities`,
  `sourceCapabilities` and `capabilityReason` are exported from
  `@adapttable/core`; the [API reference](./api.md#source-capabilities) lists
  their types.
