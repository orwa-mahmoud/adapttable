# Angular tree data and lazy children

`tree()` turns related records into an expandable hierarchy within one
table. Choose nested rows with `getChildren`, or flat rows with
`getParentId`; stable row IDs connect the hierarchy and its expansion state.

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { tree } from "@adapttable/angular-unstyled/tree";

interface Person {
  id: string;
  name: string;
  reports?: readonly Person[];
}

@Component({
  selector: "app-organization-tree",
  imports: [AdaptDataTable],
  template: `
    <button type="button" (click)="expandedIds.set(['ada'])">Open Ada</button>
    <button type="button" (click)="expandedIds.set([])">Collapse all</button>
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
  `,
})
export class OrganizationTree {
  readonly rows: Person[] = [
    {
      id: "ada",
      name: "Ada",
      reports: [
        { id: "grace", name: "Grace" },
        { id: "alan", name: "Alan" },
      ],
    },
  ];
  readonly columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
  readonly rowKey = (row: Person) => row.id;
  readonly expandedIds = signal<readonly string[]>([]);
  readonly features = [
    tree<Person>({
      getChildren: (row) => row.reports,
      treeColumn: "name",
      expandedIds: this.expandedIds,
      onExpandedIdsChange: (ids) => this.expandedIds.set(ids),
    }),
  ];
}
```

NG-ZORRO provides the same feature at `@adapttable/ng-zorro/tree`, paired
with its root table. Both kits use [workspace setup](./getting-started.md).

## Hierarchy and expansion

For a flat dataset, provide `getParentId: row => row.parentId`; a root
returns `undefined`. Do not use a row's current array index as its ID.
The tree walks rows supplied by the source: it cannot reconstruct parents
or children that the server has not supplied. Design server pagination and
filtering to return the hierarchy your application intends to show.

`treeColumn` defaults to the first shown column. Only that cell gets the
indent and disclosure; leaves use an equal-width spacer. Without
`expandedIds`, the tree starts folded and keeps its open set internally;
`onExpandedIdsChange` can observe changes without taking control.

`TreeFeatureOptions.expandedIds` accepts `MaybeSignal<readonly string[]>`:
an array or an Angular signal of IDs. Both kit shells follow the signal
passed to `tree()` after mounting. Pass the signal itself, as above, rather
than the snapshot returned by `this.expandedIds()`. The change callback
requests the next IDs; the host accepts them with `signal.set`. Updating
that same signal from another host control immediately updates the tree;
`set([])` collapses all nodes. A fixed array is controlled too, so without
a host update a toggle cannot change it.

Keep the feature declaration stable and update its signal. Custom shells
can use `injectTreeExpansion` with the same controlled-state pattern.
Tree expansion is independent of row details and group collapse and is not
automatically stored in URL state or saved views.

## Loading children

Use `hasChildren(row)` for a node known to have children that have not yet
arrived. `onLoadChildren(row): void | Promise<void>` is a host callback:
fetch children, write them into the rows supplied to the table, then resolve.
Returning the fetched array alone does not update the table.

For nested data, replace the parent with a copy containing its loaded
children. For flat data, add the children with matching parent IDs. Preserve
all other rows and stable identities. A host that owns network cancellation
should also cancel its request on teardown.

The controller suppresses duplicate loads and does not refetch children
already present. During a request, the disclosure reports busy state. A
rejected request records the node as failed and closes it, so its next open
attempt retries. The binding exposes `loadingIds` and `failedIds` through
`injectTree` for a custom error/retry surface. A late completion after the
injection context is destroyed cannot update that controller.

## Interaction and composition

Disclosures are keyboard-activatable kit buttons with `aria-expanded`,
localized labels and `aria-busy` during loading. Mobile cards expose the
same toggle and indent the whole child card. The tree indent uses logical
spacing and the chevron follows RTL. Pass `[labels]` and `dir` on the shell.

Virtualization windows the expanded entry list. The complete loaded-tree
walk is available for export, but export does not fetch unknown descendants.
[Row reordering](./row-reordering.md) can reorder siblings or request
re-parenting with the proper host callback; it rejects cycles. Data-row
pinning is refused for trees, while [pinned summaries](./pinned-summary-rows.md)
remain available.

Use [nested tables](./nested-tables.md) when each parent has a separate table
with its own columns and query state, or [row detail](./row-expansion.md) for
a simple content panel.
