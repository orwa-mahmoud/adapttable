# React table row reordering — flat, grouped and tree rows

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — compose `rowReorder` and a grip appears. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [reorder flat, grouped and tree rows in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/row-reordering/) — Space lifts a row, arrows move it, Space drops it. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Import `rowReorder` from `@adapttable/<kit>/row-reorder` and a drag handle
appears in a reserved leading column. The import is the switch: a table that
does not compose it never downloads the drag state machine, its keyboard
handling or its announcements — see [feature composition](./features.md).
The table never mutates your array; you apply the move.

```tsx
import { DataTable } from "@adapttable/mantine";
import { applyRowReorder } from "@adapttable/react";
import { rowReorder } from "@adapttable/mantine/row-reorder";
import { useState } from "react";

function Tasks({ seed }: { seed: Task[] }) {
  const [rows, setRows] = useState(seed);
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        rowReorder((from, to) => {
          setRows((current) => applyRowReorder(current, from, to));
        }),
      ]}
    />
  );
}
```

`from` and `to` are **dataset-relative**: the row's index in the current source
plus the page offset, so a virtual window or a paged slice does not lie about
where the row sits. The third argument is the row that moved, so a host that
keys by identity never has to look it up.

`applyRowReorder(rows, from, to)` is the in-memory helper — a copy, never a
mutate. Out of range is a no-op copy.

## Keyboard first

A drag-only reorder is unusable with a keyboard and fails accessibility
review. The grip is a real button:

- **Space** lifts the row (announced: "Row 3 lifted")
- **Arrow Up / Down** (and Left / Right, following `dir`) move the drop target
- **Space** again drops it (announced: "Row moved from 3 to 5")
- **Escape** cancels

`RowReorderAnnouncer` is the live region. It mounts only when reorder is
armed, so a table that does not compose `rowReorder` adds no second status
region (export already owns one).

## Mobile

Cards get **up / down** buttons (`RowReorderButtons`), not a drag handle. The
ends disable rather than wrapping. Grouped and tree cards also get the same
**Move to group…** / **Move under…** menu as desktop, with 44px targets.

## Grouped rows: reorder versus move

The first handler still means **reorder among siblings**. Its `from` and `to`
are positions inside that group, not positions in the flattened list.
Crossing a group boundary is a different write:

```tsx
rowReorder((from, to, row) => reorderInsideGroup(row, from, to), {
  movePolicy: "confirm",
  onGroupMove: (row, fromGroup, toGroup, position) => {
    // toGroup.levels contains each grouping column and its raw value.
    moveRowIntoGroup(row, toGroup.levels, position);
  },
});
```

Dragging over another group's row or choosing **Move to group…** calls
`onGroupMove`. The menu lists loaded leaf groups. A nested `RowGroupRef`
contains a stable `id`, a breadcrumb `label`, and raw `{ key, value, label }`
levels, so the host can write the actual grouping fields.

## Tree rows: reorder versus re-parent

Before/after another sibling calls the ordinary reorder handler with sibling
positions. Dropping into the middle of another node, or choosing **Move
under…**, calls:

```tsx
rowReorder(reorderAmongSiblings, {
  movePolicy: "confirm",
  onTreeMove: (row, fromParent, toParent, position) => {
    updateParentAndOrder(row, toParent.id, position);
  },
});
```

`toParent.id` is `null` for the top level. A row cannot move under itself or
one of its descendants: the cycle guard rejects pointer, keyboard, and menu
paths before any host callback runs and announces the reason.

## Move policy

- `"never"` (default) keeps same-group/same-parent reorder available and
  rejects boundary changes with an announcement.
- `"confirm"` opens the kit-native confirmation in the move menu. Confirm and
  cancel return focus to the trigger. Supply `confirmMove(request)` to use a
  host-owned async confirmation surface instead.
- `"auto"` calls the matching move callback immediately.

Every pointer action has a keyboard/touch equivalent. Space + arrows can cross
the visible boundary; the destination menu reaches loaded groups and parents
directly.

When sorting is active, visual order belongs to the sort. Same-scope
order-only writes are rejected with “Clear sorting before changing row order.”
Cross-group moves and re-parenting remain available because they change row
membership; the active sort remains in force.

**URL / Saved Views.** Row order is the host's array. There is nothing to
serialize. Drag, keyboard, mobile and menu paths call the same host callbacks,
so host persistence receives one identical write contract.

## Column menu

The reorder column uses the reserved key `REORDER_COLUMN_KEY` (`"reorder"`),
the same trick as the actions column. Hide it or pin it to the start from the
Columns menu. CSV export drops it the way it drops actions
(`exportableColumns`).

## Headless

`RowReorderOptions`, `RowMovePolicy`, `RowMoveRequest`, `RowDropPosition`,
`RowGroupMoveHandler`, `RowTreeMoveHandler`, `RowTreeParentRef`,
`RowGroupRef`, `treeMoveCreatesCycle` and `rowDropPosition` are the nested
contracts. `RowReorderDecision` is the internal-seam result used to distinguish
an order write, a membership move, or a rejection. `useRowReorder(options)`
is the grab state: it returns `TableRowReorderState` from `@adapttable/react`,
the same shape adapters receive as `RowReorderState` from
`@adapttable/react/adapter`; `RowReorderHandler` is the ordinal write.
`datasetIndex(localIndex, windowStart)` turns a flat rendered slot into a
dataset index. `rowReorderSignature(reorder, rowId, localIndex)` is the memo
digest so a virtualized row repaints when lifted, targeted, or confirming.
`hostConfirmPending` is true while a host-owned `confirmMove` promise is
unresolved — adapters disable grips, buttons and menu items then, and a
second move is ignored until that promise settles.

Each adapter mounts `RowReorderHandle` (`RowReorderHandleProps`) and
`RowReorderButtons` (`RowReorderButtonsProps`) over
`RowReorderHandleChrome` / `RowReorderButtonsChrome`.
`RowReorderAnnouncer` stays on `@adapttable/react/adapter`.
`REORDER_COLUMN_WIDTH` is the pin-lead width every kit shares.
`ROW_DND_MIME` is the HTML5 drag type.

Styling and test hooks: `row-reorder-handle`, `row-reorder-buttons`,
`row-reorder-up`, `row-reorder-down`, `row-move-menu`,
`row-move-menu-trigger`, `row-move-menu-content`, `row-move-menu-item`, and
`row-move-confirmation`.
