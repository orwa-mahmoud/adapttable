---
title: "React table row pinning — sticky top and bottom (v2)"
description: Row pinning for React data tables — sticky top and bottom rows
  outside the virtual window, { top, bottom } id lists, URL-synced, mobile
  actions only.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table row pinning — sticky top and
      bottom","item":"https://adapttable.orwamahmoud.com/v2/react/row-pinning/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/row-pinning.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/row-pinning.png
slug: v2/react/row-pinning
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — pass `onPinnedRowIdsChange` and pin actions appear. [Other UI kits →](/v2/react/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [pin, reorder and merge rows in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/rows/) — sticky pins, a drag grip, Team written once down consecutive teammates (pin keeps that one merge), and a 3-dot menu. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Pass `pinnedRowIds` and/or `onPinnedRowIdsChange` and every row gains icon-only
Pin to top / Pin to bottom / Unpin (labels on hover and as the accessible name).
Omit both and nothing renders, nothing ships in
the hot path — the same opt-in rule as `onCellEdit`. The value is
`{ top, bottom }` lists of row ids, not a flat array: which edge a row
sticks to is the feature.

```tsx
import type { RowPinState } from "@adapttable/core";
import { DataTable } from "@adapttable/mantine";
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
      pinnedRowIds={pinnedRowIds}
      onPinnedRowIdsChange={setPinnedRowIds}
    />
  );
}
```

Uncontrolled: pass only `onPinnedRowIdsChange` (an observer) and the table
holds the lists. The batteries-included shell also writes them to the URL
(`rowPin=id1:top,id2:bottom`) so a shared link keeps the same rows stuck.
`useRowPinningUrlState` is the same pair for a host that wants to own the
URL itself. Saved views capture `rowPin` with the rest of the table.

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

**Grouping or a tree.** A nested list is not a flat pin stack. Passing the
props while either is armed logs a `devWarn`, the actions do not render, and
the status strip under the table shows `labels.noticePinNested`.

## Headless

`useRowPinning(options)` returns `RowPinningState`: `state`, `sideOf`,
`pin`, `unpin`, and the three synthesized actions
(`PIN_TOP_ACTION_KEY`, `PIN_BOTTOM_ACTION_KEY`, `UNPIN_ROW_ACTION_KEY`).
`applyRowPin(state, rowId, side)` is the in-memory helper — a copy, never
a mutate. `partitionPinnedRows(rows, state, getRowId)` splits a list into
top / scroll / bottom. `rowPinSignature(pinning, rowId)` is the memo
digest so a virtualized row repaints when it is pinned or unpinned.
`EMPTY_ROW_PIN_STATE` is `{ top: [], bottom: [] }`.

From `@adapttable/core/adapter`: `pinnedRowStickyStyle` / `pinnedRowCellStyle`
are the sticky CSS kits spread; `pinnedRowPart` names the row's
`data-adapttable-part`; `pinnedRowSticky` is the sticky style when the
kit asked for sticky pins; `orderedCardEntries` is the card-list order;
`useOffsetHeight` measures the header so top pins sit under it;
`PINNED_TOP_PART` / `PINNED_BOTTOM_PART` name the sections.
`rowSourceIndex(entry)` is the dataset index when pinning remapped the
window.

Labels: `pinToTop`, `pinToBottom`, `unpinRow` (`RowPinLabels`).
