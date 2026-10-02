# Angular row reordering

`rowReorder(onRowReorder, options?)` adds a desktop grip and mobile move
buttons. Its callback reports the move; the host updates and persists its
own rows.

```ts
import { Component, signal } from "@angular/core";
import { applyRowReorder } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { rowReorder } from "@adapttable/angular-unstyled/row-reorder";

interface Task {
  id: string;
  title: string;
}

@Component({
  selector: "app-ordered-tasks",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [searchable]="false"
      [urlSync]="false"
    />
  `,
})
export class OrderedTasks {
  readonly rows = signal<Task[]>([
    { id: "draft", title: "Draft" },
    { id: "review", title: "Review" },
    { id: "publish", title: "Publish" },
  ]);
  readonly columns: ColumnDef<Task>[] = [{ key: "title", header: "Task" }];
  readonly rowKey = (row: Task) => row.id;
  readonly features = [
    rowReorder<Task>((from, to) => {
      this.rows.update((rows) => applyRowReorder(rows, from, to));
    }),
  ];
}
```

This example has a flat, unfiltered, unsorted list, so the source order and
host array order agree. `applyRowReorder` returns a copy. For NG-ZORRO, use
its root and `/row-reorder` imports; the neutral host helper stays in core.
Both kits are unpublished [workspace packages](./getting-started.md).

## Index and write contracts

The callback receives `(from, to, row)`. For flat rows, indices include the
source page/window offset; they are not DOM row positions. For grouped and
tree rows, same-scope reorder uses positions within the sibling group or
parent. Use the supplied row identity and the actual source ordering when a
filtered view differs from your stored array. Do not blindly splice the
unfiltered array using filtered-view indices.

The table bounds keyboard movement to the available page or loaded infinite
window. A server-backed host must persist the requested ordering and return
updated rows. Reorder callbacks are write notifications, with no automatic
request pending/error UI; handle remote failures in the host.

## Pointer, keyboard and mobile

- Drag a desktop grip to the destination row
- Space lifts a focused grip; arrows move the target; Space drops it
- Escape cancels the gesture
- Up/Down move vertically; Left/Right respect the grip's computed direction
- Mobile cards use up/down buttons, disabled at the ends

The composed announcer reports lift, move, cancellation and rejected moves
using table labels. Grouped and tree rows also offer destination menus for
keyboard and touch users. Pass the table's `[labels]` and `dir` consistently.

## Cross-group moves and re-parenting

`options.movePolicy` is `"never"` by default. Same-scope reorder remains
available, while membership changes are refused. `"auto"` dispatches an
allowed move immediately; `"confirm"` asks through the kit's move menu.

Provide `onGroupMove(row, fromGroup, toGroup, position)` for changes between
groups, or `onTreeMove(row, fromParent, toParent, position)` for a new tree
parent. Group references contain raw grouping levels; tree references have
an ID, row and label, with `null` for the root parent. The host must change
the membership fields as well as ordering. A tree cycle is rejected before
the callback runs.

`confirmMove(request): Promise<boolean>` replaces kit confirmation with a
host-owned dialog. While it is unresolved, controls are disabled and another
move cannot take over. Lifecycle teardown prevents a late confirmation from
committing after the table is destroyed.

Active sorting rejects same-scope order-only writes because sorting owns the
visible order. Valid cross-group and tree membership changes remain possible.
Row order itself is host data and is not saved in the URL or saved views.
See [tree data](./tree-data.md), [grouping](./row-grouping.md) and
[row appearance](./row-styling.md).
