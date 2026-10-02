# Angular row grouping

Group rows by one column or an ordered list of columns. `grouping()` supplies
fixed keys; `groupingPanel()` also lets the reader add, remove and reorder
grouping fields. Both factories render the selected kit's group headers on
desktop and group header cards on phones.

## Let the reader configure groups

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

## State and data scope

The panel's first argument seeds the grouping keys. Existing URL state wins
over that seed. Keys are ordered outermost first; `onGroupByChange` receives the
current string array. Grouping changes view state, not your records. Use a
stable `rowKey` so selection and expansion still refer to the same records.

Frontend grouping uses the full filtered set: a group is not silently split
at an ordinary page boundary. `groupPageSize` limits the number of groups and
`groupRowPageSize` limits rows within a group. Their Show more controls reveal
the next portion. `groupSort` orders groups, while `groupFilter` filters the
group nodes. These are separate from sorting and filtering individual rows.

Server grouping requires a source that supports the grouping contract and
provides its groups/aggregate results. The library does not infer complete
server groups from one loaded page. For incremental server groups,
`onGroupLoadMore(groupKey)` lets the host request more; update the host-owned
source when it resolves and expose fetching/failure state there.

## Collapse, aggregates and interaction

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
Group selection applies to the group's rows; headers are structural entries,
not records to edit or send to a mutation endpoint. On mobile, collapsing a
header card hides its member cards using the same state.

See [Aggregation](./aggregation.md), [Pivot](./pivot.md),
[Virtualization](./virtualization.md) and [URL state](./url-state.md).
The [grouping implementation](../../packages/angular/angular/src/features/grouping.ts)
and [kit grouping tests](../../packages/angular/adapter-angular-unstyled/src/grouping.test.ts)
cover scope, collapse, paging, subtotals and mobile rendering.
