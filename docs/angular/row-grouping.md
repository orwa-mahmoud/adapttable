# Angular row grouping with nested groups and subtotals

Group rows by one column or an ordered list of columns. `grouping()` supplies
fixed keys; `groupingPanel()` also lets the reader add, remove and reorder
grouping fields. Both factories render the selected kit's group headers on
desktop and group header cards on phones.

Try the [unstyled Angular row-grouping demo](https://adapttable.orwamahmoud.com/angular/demo/unstyled/grouping/)
or the [NG-ZORRO row-grouping demo](https://adapttable.orwamahmoud.com/angular/demo/ng-zorro/grouping/).

## Configure client-side grouping with an Angular grouping panel

```ts
import { Component } from "@angular/core";
import { aggregate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";

interface Work {
  id: string;
  team: string;
  status: string;
  hours: number;
}

@Component({
  selector: "app-grouped-work",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Work by team"
      urlKey="work"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class GroupedWork {
  readonly rows: readonly Work[] = [
    { id: "w1", team: "Design", status: "Open", hours: 3 },
    { id: "w2", team: "Design", status: "Done", hours: 2 },
    { id: "w3", team: "Engineering", status: "Open", hours: 5 },
  ];
  readonly rowKey = (row: Work) => row.id;
  readonly columns: readonly ColumnDef<Work>[] = [
    { key: "team", header: "Team" },
    { key: "status", header: "Status" },
    { key: "hours", header: "Hours", groupable: false },
  ];
  readonly features = [
    groupingPanel<Work>(["team", "status"], {
      groupAggregates: aggregate<Work>(
        { hours: "sum" },
        { columns: this.columns }
      ),
      groupFooters: true,
    }),
  ];
}
```

For fixed groups, replace the panel factory with `grouping(["team", "status"])`
from `/grouping`. The panel already owns grouping; a second `grouping()` feature
is unnecessary. For NG-ZORRO, use its matching root, `/grouping` and
`/grouping-panel` entries.
See [getting started](./getting-started.md) for installation
and first-release status.

## Grouping state, URL persistence and client-side pagination

The panel's first argument seeds the grouping keys. Existing URL state wins
over that seed. Keys are ordered outermost first; `onGroupByChange` receives the
current string array. Grouping changes view state, not your records. Use a
stable `rowKey` so selection and expansion still refer to the same records.

Frontend grouping uses the full filtered set: a group is not silently split
at an ordinary page boundary. `groupPageSize` limits the number of groups and
`groupRowPageSize` limits rows within a group. Their Show more controls reveal
the next portion. `groupSort` orders groups, while `groupFilter` filters the
group nodes. These are separate from sorting and filtering individual rows.

## Server-side Angular row-grouping recipe

For server-side grouping, the backend groups the complete matching dataset and
returns group counts, aggregates and any included records. The browser cannot
infer full-dataset groups from one page. `supports: { grouping: true }` allows
`groupBy` into the query; it does not itself attach response groups to the
source. Wrap `injectServerData()` in a computed source that supplies `groups`.

This component expects your application's `POST /api/work/groups` endpoint to
accept `TableQuery` and return `GroupedWorkPage` below. This is a host-defined
HTTP endpoint, not an AdaptTable service. When `query.groupBy` is empty, return
ordinary paged `rows` and `groups: []`. Otherwise, return the requested group
hierarchy with every materialized leaf record also present in `rows`, so
selection and record identity can use the same records as the grouped view.
`total` counts matching source records, not group headers.

```ts
import { Component, computed, signal } from "@angular/core";
import {
  injectServerData,
  type ColumnDef,
  type TableQueryHandler,
  type TableSource,
} from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { groupingPanel } from "@adapttable/angular-unstyled/grouping-panel";

interface Work {
  id: string;
  team: string;
  status: string;
  hours: number;
}
interface GroupedWorkPage {
  rows: Work[];
  total: number;
  groups: NonNullable<TableSource<Work>["groups"]>;
}

@Component({
  selector: "app-server-grouped-work",
  standalone: true,
  imports: [AdaptDataTable],
  template: `
    @if (error(); as failure) {
      <p role="alert">{{ failure.message }}</p>
      <button type="button" (click)="retry()">Retry groups</button>
    }
    <adapt-data-table
      tableLabel="Server work groups"
      [source]="source"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class ServerGroupedWork {
  private readonly page = signal<GroupedWorkPage>({
    rows: [],
    total: 0,
    groups: [],
  });
  readonly loading = signal(false);
  readonly error = signal<Error | null>(null);
  readonly responseKey = signal<string | undefined>(undefined);
  readonly rowKey = (row: Work) => row.id;
  readonly columns: readonly ColumnDef<Work>[] = [
    { key: "team", header: "Team" },
    { key: "status", header: "Status" },
    { key: "hours", header: "Hours", groupable: false },
  ];
  readonly features = [groupingPanel<Work>(["team"], { groupFooters: true })];

  readonly load: TableQueryHandler = async (query, info) => {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await fetch("/api/work/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
        signal: info.signal,
      });
      if (!response.ok)
        throw new Error(`Group request failed: ${response.status}`);
      const page = (await response.json()) as GroupedWorkPage;
      if (info.signal.aborted) return;
      this.page.set(page);
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

  private readonly server = injectServerData<Work>({
    rows: computed(() => this.page().rows),
    total: computed(() => this.page().total),
    loading: this.loading,
    error: this.error,
    responseKey: this.responseKey,
    columns: this.columns,
    supports: { grouping: true, aggregates: true },
    aggregates: [{ key: "hours", fn: "sum" }],
    onQueryChange: this.load,
    paginationMode: "paged",
    urlKey: "server-work-groups",
    defaults: { groupBy: "team" },
  });
  readonly source = computed<TableSource<Work>>(() => ({
    ...this.server(),
    groups: this.loading() || this.error() ? [] : this.page().groups,
  }));
  readonly retry = () => this.server().refetch?.();
}
```

For a query grouped by `team`, this is a valid response containing one group:

```json
{
  "rows": [
    { "id": "w1", "team": "Design", "status": "Open", "hours": 3 },
    { "id": "w2", "team": "Design", "status": "Done", "hours": 2 }
  ],
  "total": 2,
  "groups": [
    {
      "value": "Design",
      "count": 2,
      "aggregates": { "hours": 5 },
      "rows": [
        { "id": "w1", "team": "Design", "status": "Open", "hours": 3 },
        { "id": "w2", "team": "Design", "status": "Done", "hours": 2 }
      ]
    }
  ]
}
```

Each group requires `value` and `count`; `aggregates`, nested `groups` and leaf
`rows` are optional. Nest `groups` in the same order as `query.groupBy`.
`count` and aggregate values must describe the backend's matching group,
even if only some children were returned. The displayed subtotal comes from
`aggregates`, not a fresh sum of the downloaded page. Validate field names,
operations and filters on the backend, and validate JSON on the client in
production; the cast above only documents its TypeScript shape.

The request handler honors cancellation, ignores aborted responses and echoes
`info.key` through `responseKey`. The wrapper hides groups during fetching and
after failures rather than labeling an old group's values as the new result.
A failed request can be retried through the source's `refetch` action.

### Server group pagination and incremental loading

Define server paging explicitly: which groups and children correspond to
`page` and `limit`, and how a later response replaces or extends them. The
server renderer preserves returned group order; local `groupSort`,
`groupFilter`, `groupPageSize` and `groupRowPageSize` are not a substitute for
backend ordering, filtering and paging.

A count larger than the included `rows.length` does not automatically fetch
children or create a server “Show more” row. Opening a group changes collapse
state. `onGroupLoadMore(groupKey)` is called when the grouping model's show-more
action requests rows, but merely supplying that callback does not implement a
server transport. For partial groups, provide a host-owned load control and
request handler, then immutably replace or merge the corresponding group and
its materialized rows. Guard that request with the same query identity and
cancellation checks. Never set `allFilteredRows` to one remote page to enable
client grouping.

## Collapse groups, show aggregate footers and support mobile cards

`collapsedGroupIds` and `onCollapsedGroupIdsChange` support controlled collapse.
Use the stable group IDs the model supplies, not display captions that can be
duplicated or localized. The headless grouping model also offers `expandAll`,
`collapseAll` and `collapseToDepth` for custom controls.

`groupAggregates` is a mapper from a group's rows to values keyed by column.
[`aggregate()`](./aggregation.md) builds one and declares the operations the
panel can inspect. `groupFooters` adds aligned subtotal rows. Set a column's
`groupable: false` when grouping it would be meaningless, such as a unique ID.

The panel has an add control and removal/move controls as well as drag
interaction. Keyboard users can move grouping chips and activate group
toggles, and changes are announced through the binding's localized live region.
Group selection applies to materialized member rows; a server count alone does
not select unloaded records. Headers are structural entries, not records to
edit or send to a mutation endpoint. On mobile, collapsing a
header card hides its member cards using the same state.

See [Aggregation](./aggregation.md), [Pivot](./pivot.md),
[Virtualization](./virtualization.md) and [URL state](./url-state.md).
The [grouping implementation](../../packages/angular/angular/src/features/grouping.ts)
and [kit grouping tests](../../packages/angular/adapter-angular-unstyled/src/grouping.test.ts)
cover scope, collapse, paging, subtotals and mobile rendering.
