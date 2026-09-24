# React table row pinning — sticky top and bottom rows

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — compose `rowPinning()` and pin actions appear. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [pin and merge rows in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/rows/) — sticky pins, Team written once down consecutive teammates (pin keeps that one merge), and a 3-dot menu. Movement lives on the [row-reordering page](https://adapttable.orwamahmoud.com/react/demo/mantine/row-reordering/). The same pages exist for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Import `rowPinning` from `@adapttable/<kit>/row-pinning` and compose it; every
row gains icon-only
Pin to top / Pin to bottom / Unpin (labels on hover and as the accessible name),
each hidden when it does not apply. A table that does not compose it carries
none of this — see [feature composition](./features.md). The value is
`{ top, bottom }` lists of row ids, not a flat array: which edge a row
sticks to is the feature.

```tsx
import { DataTable } from "@adapttable/mantine";
import type { RowPinState } from "@adapttable/mantine/features";
import { rowPinning } from "@adapttable/mantine/row-pinning";
import { useState } from "react";

function Tasks({ rows }: { rows: Task[] }) {
  const [pinnedRowIds, setPinnedRowIds] = useState<RowPinState>({
    top: [],
    bottom: [],
  });
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        rowPinning({ pinnedRowIds, onPinnedRowIdsChange: setPinnedRowIds }),
      ]}
    />
  );
}
```

Uncontrolled: a bare `rowPinning()`, or `rowPinning({ onPinnedRowIdsChange })`
to observe the lists, and the table holds them. In that mode the
batteries-included shell writes them to the URL
(`rowPin=id1:top,id2:bottom`) so a shared link keeps the same rows stuck, and
Saved Views capture `rowPin` with the rest of the table. A controlled
`pinnedRowIds` keeps the URL out of it. `useRowPinningUrlState` is the same
pair for a host that wants to own the URL itself.

## Outside the virtual window

A pinned row is **removed** from the scroll list and rendered first or last
in the body (`data-adapttable-part="pinned-top"` /
`"pinned-bottom"` on the row). Leave it in the window and it draws twice. The
virtualizer windows only the unpinned rows; ARIA `rowCount` and
`windowStart` still describe the whole dataset.

Pinned-row cells keep column `pinOffset`, with a z-index between a scrolled
pinned column and the sticky header (`PIN_Z.rowPinned` /
`PIN_Z.rowPinnedColumn`), so a pinned row over a pinned column does not
overlap the header corner.

## Mobile

Cards get the same pin actions and no sticky chrome — a card list is not a
grid. The list order still puts top pins first and bottom pins last.

## What it will not do

**Grouping or a tree.** A nested list is not a flat pin stack. Composing
`rowPinning(…)` while either is armed logs a `devWarn` and the actions do not
render.
Host-owned totals that are not data rows are a different feature —
[`pinnedSummaryRows`](./pinned-summary-rows.md) sticks those objects above
or below the scroll body on every table shape, including grouped and tree
tables.

## Headless

`useRowPinning(options)` returns `RowPinningState`: `state`, `sideOf`,
`pin`, `unpin`, and the three synthesized actions
(`PIN_TOP_ACTION_KEY`, `PIN_BOTTOM_ACTION_KEY`, `UNPIN_ROW_ACTION_KEY`).
`applyRowPin(state, rowId, side)` is the in-memory helper — a copy, never
a mutate. `partitionPinnedRows(rows, state, getRowId)` splits a list into
top / scroll / bottom. `rowPinSignature(pinning, rowId)` is the memo
digest so a virtualized row repaints when it is pinned or unpinned.
`EMPTY_ROW_PIN_STATE` is `{ top: [], bottom: [] }`.

From `@adapttable/react/adapter`: `pinnedRowStickyStyle` / `pinnedRowCellStyle`
are the sticky CSS kits spread; `pinnedRowPart` names the row's
`data-adapttable-part`; `pinnedRowSticky` is the sticky style when the
kit asked for sticky pins; `orderedCardEntries` is the card-list order;
`useOffsetHeight` measures the header so top pins sit under it;
`PINNED_TOP_PART` / `PINNED_BOTTOM_PART` name the sections.
`rowSourceIndex(entry)` is the dataset index when pinning remapped the
window.

Labels: `pinToTop`, `pinToBottom`, `unpinRow` (`RowPinLabels`).
