---
title: "React table virtualization — 10k rows, ~24 DOM nodes (v1)"
description: "React table virtualization measured: 10,000 rows mount ~24 DOM
  nodes. Opt-in row and card windowing for large lists — free under MIT."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table virtualization — 10k rows, ~24 DOM
      nodes","item":"https://orwa-mahmoud.github.io/adapttable/v1/virtualization/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/virtualization.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/virtualization.png
slug: v1/virtualization
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/adapttable/v1/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [scroll 50,000 rows in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/scale/) — a real table you can scroll, not a recording.

Long lists can opt into row/card windowing with one prop: `virtualize`. Fifty
thousand rows render as a handful of DOM nodes, on the page or inside a
fixed-height box.

## Example

```tsx
import {
  type ColumnDef,
  DataTable,
  useFrontendData,
} from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, shadcn, unstyled

interface Reading {
  id: string;
  sensor: string;
  value: number;
}

const data: Reading[] = Array.from({ length: 50_000 }, (_, i) => ({
  id: String(i + 1),
  sensor: `Sensor ${(i % 40) + 1}`,
  value: Math.round(Math.sin(i) * 1000) / 10,
}));

const columns: ColumnDef<Reading>[] = [
  { key: "sensor", sortable: true },
  { key: "value" },
];

export function Readings() {
  // Virtualization needs infinite mode; `paginationMode` is a source option.
  const source = useFrontendData({ data, columns, paginationMode: "infinite" });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      virtualize
      maxHeight={380}
      estimateRowSize={56}
      estimateCardSize={140}
    />
  );
}
```

## How it works

* `virtualize` is opt-in (default `false`) and applies in **infinite (non-paged)
  mode** — paged tables already cap the row count, so they never virtualize.
  A `<DataTable>` fed with `data` alone runs in `"auto"` mode (paged on
  desktop), so build the source with `paginationMode: "infinite"` to virtualize
  desktop rows.
* **Window mode** (no `maxHeight`): the virtual window tracks the page scroll.
  Use `virtualScrollMargin` to offset it under sticky chrome (e.g. a sticky
  header above the table).
* **Element mode** (any `maxHeight` box): the same prop virtualizes inside the
  scroll box instead — the box is the scroller and the window tracks it.
* Rows/cards are measured after render; `estimateRowSize` (desktop rows) and
  `estimateCardSize` (mobile cards) seed the math, and `virtualOverscan` rows
  are rendered beyond the visible window to keep scrolling smooth.
* Inside a `maxHeight` box the page-level **Load more** button and
  infinite-scroll sentinel are suppressed: the box never grows, so the virtual
  window extends itself at the box's scroll end instead.
* Ant Design maps `virtualize` to antd's **native** virtual table mode on
  desktop (grouped tables window through the shared engine instead); on
  mobile the cards window through the shared engine, just like every other
  adapter, and the page-level sentinel keeps loading more.

## Options

| Prop                  | Type      | Default | Description                                                       |
| --------------------- | --------- | ------- | ----------------------------------------------------------------- |
| `virtualize`          | `boolean` | `false` | Window the rendered rows/cards on long infinite lists.            |
| `maxHeight`           | `number`  | —       | Fixed-height scroll box (px); switches to element-mode windowing. |
| `estimateRowSize`     | `number`  | `56`    | Desktop row-height estimate in px.                                |
| `estimateCardSize`    | `number`  | `132`   | Mobile card-height estimate in px.                                |
| `virtualOverscan`     | `number`  | `8`     | Extra rows/cards rendered before and after the visible window.    |
| `virtualScrollMargin` | `number`  | `0`     | Window-mode scroll offset, usually sticky chrome height.          |

## Benchmark

Virtualization renders only the rows in view, so cost is bounded by the
viewport — not the dataset. A measured A/B on the scale demo (Mantine adapter,
the **same 10,000-row dataset fully loaded**, headless Chromium, 1280×900):

|                                | Rows in the DOM |    JS heap |
| :----------------------------- | --------------: | ---------: |
| **Virtualized** (`virtualize`) |          **24** | **169 MB** |
| Plain table — same 10,000 rows |          10,000 |     347 MB |

Windowing mounts **417× fewer DOM nodes** (24 vs 10,000 — a viewport's worth
plus overscan) and uses **~178 MB less memory, roughly half** — while the plain
table blocks the main thread rendering ten thousand `<tr>`s.

And it stays flat: the rendered row count holds at **~24 whether the dataset is
1,000 or 100,000 rows**. Only your own data array grows — never the table's DOM:

| Rows in the dataset |  1,000 | 10,000 | 50,000 | 100,000 |
| ------------------: | -----: | -----: | -----: | ------: |
|     Rows in the DOM | **24** | **24** | **24** |  **24** |

Reproduce both with
[`scripts/bench-virtualization.mjs`](https://github.com/orwa-mahmoud/adapttable/blob/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/scripts/bench-virtualization.mjs)
against a running showcase. (Numbers are from one dev laptop; the **shape** —
constant DOM, about half the memory — does not change with hardware.)

## Notes

* Virtualization is optional — leave it off for small lists or paged tables.
* Combining `virtualize` with `renderRowDetail` is not recommended: desktop
  detail panels render as unmeasured sibling rows, so scroll heights can drift
  (a dev-mode warning says so). Prefer paged data with row details.
* The headless hook is exported as `useTableVirtualization` for custom markup;
  when disabled it returns every row with no spacers, so one render path
  serves both cases.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
