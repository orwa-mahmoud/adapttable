---
title: "React table row reordering — drag handle (v2)"
description: Row reordering for React data tables — opt-in onRowReorder, a drag
  handle with Space-lift keyboard, dataset-relative indices, mobile up/down.
  Grouping and trees refuse it.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table row reordering — drag
      handle","item":"https://adapttable.orwamahmoud.com/v2/react/row-reordering/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/row-reordering.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/row-reordering.png
slug: v2/react/row-reordering
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — pass `onRowReorder` and a grip appears. [Other UI kits →](/v2/react/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [drag-reorder rows in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/rows/) — Space lifts a row, arrows move it, Space drops it. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Pass `onRowReorder` and a drag handle appears in a reserved leading column.
Or import `rowReorder` from `@adapttable/<kit>/row-reorder` and pass
`features={[rowReorder(handler)]}` — same runtime, see
[feature composition](/v2/react/features/). The enabling prop is deprecated and
stays until v3.
Omit it and nothing renders, nothing ships in the hot path — the same opt-in
rule as `onCellEdit`. The table never mutates your array; you apply the move.

```tsx
import { applyRowReorder } from "@adapttable/core";
import { DataTable } from "@adapttable/mantine";
import { useState } from "react";

function Tasks({ seed }: { seed: Task[] }) {
  const [rows, setRows] = useState(seed);
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      onRowReorder={(from, to) => {
        setRows((current) => applyRowReorder(current, from, to));
      }}
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

* **Space** lifts the row (announced: "Row 3 lifted")
* **Arrow Up / Down** (and Left / Right, following `dir`) move the drop target
* **Space** again drops it (announced: "Row moved from 3 to 5")
* **Escape** cancels

`RowReorderAnnouncer` is the live region. It mounts only when reorder is
armed, so a table without `onRowReorder` does not add a second status
region (export already owns one).

## Mobile

Cards get **up / down** buttons (`RowReorderButtons`), not a drag handle. The
ends disable rather than wrapping.

## What it will not do

**Grouping or a tree.** Nested order is not a flat splice. Passing
`onRowReorder` while either is armed logs a `devWarn`, the handle does not
render, and the status strip under the table shows `labels.noticeReorderNested`
— never a silent ignore.

**URL / Saved Views.** Row order is the host's array. There is nothing to
serialize.

## Column menu

The reorder column uses the reserved key `REORDER_COLUMN_KEY` (`"reorder"`),
the same trick as the actions column. Hide it or pin it to the start from the
Columns menu. CSV export drops it the way it drops actions
(`exportableColumns`).

## Headless

`useRowReorder(options)` (`RowReorderState` is what it returns; `RowReorderHandler`
is the host callback; `RowReorderLabels` names the grip and the live region)
is the grab state. `datasetIndex(localIndex, windowStart)` turns a rendered
slot into a dataset index. `rowReorderSignature(reorder, rowId, localIndex)` is
the memo digest so a virtualized row repaints when it is lifted or is the drop
target. It also carries a global in-flight bit so every visible row repaints
once at lift and once at drop (live `dropProps` for the drag); hover still
does not repaint untouched rows.

Each adapter mounts `RowReorderHandle` (`RowReorderHandleProps`) and
`RowReorderButtons` (`RowReorderButtonsProps`) over
`RowReorderHandleChrome` / `RowReorderButtonsChrome`.
`RowReorderAnnouncer` stays on `@adapttable/core/adapter`.
`REORDER_COLUMN_WIDTH` is the pin-lead width every kit shares.
`ROW_DND_MIME` is the HTML5 drag type.
