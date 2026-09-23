# React table virtualization — rows, columns and mobile cards

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [scroll 50,000 rows in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/scale/) — a real table you can scroll, not a recording.

Long lists opt into row/card windowing with one feature: `virtualize()` from
`@adapttable/<kit>/virtualize`. Fifty
thousand rows render as a handful of DOM nodes, on the page or inside a
fixed-height box.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { virtualize } from "@adapttable/mantine/virtualize";

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

export function Readings() {
  return (
    <DataTable
      data={data}
      columns={[{ key: "sensor", sortable: true }, { key: "value" }]}
      rowKey={(r) => r.id}
      paginationMode="infinite"
      features={[virtualize()]}
      maxHeight={380}
      estimateRowSize={56}
      estimateCardSize={140}
    />
  );
}
```

The estimates default to **56 px** rows and **132 px** cards — pass your
real measured sizes (like the `140` above) when your cells differ.

## How it works

- `virtualize()` is opt-in: a table that does not compose it never loads
  `@tanstack/react-virtual`. It applies in **infinite (non-paged) mode** — paged tables already cap the row count, so they never virtualize.
- **Window mode** (no `maxHeight`): the virtual window tracks the page scroll.
  The list's offset from the top of the document is measured automatically,
  so a table below page chrome does not open with a blank gap. Pass
  `virtualScrollMargin` only to override that measurement.
- **Element mode** (any `maxHeight` box): the same feature virtualizes inside the
  scroll box instead — the box is the scroller and the window tracks it.
  Mobile cards attach that box to the card list itself (desktop rows attach it
  to the table assembly), so `maxHeight` + `virtualize()` never mounts every card.
- `rowAppearance({ rowHeight })` overrides the estimate when set — a function is per row, so
  a variable-height table still windows. See [row styling and heights](./row-styling.md).
- Rows/cards are measured after render; `estimateRowSize` (desktop rows) and
  `estimateCardSize` (mobile cards) seed the math, and `virtualOverscan` rows
  are rendered beyond the visible window to keep scrolling smooth.
- Inside a `maxHeight` box the page-level **Load more** button and
  infinite-scroll sentinel are suppressed: the box never grows, so the virtual
  window extends itself at the box's scroll end instead.
- Ant Design maps `virtualize()` to antd's **native** virtual table mode on
  desktop; on mobile the cards window through the shared engine, just like
  every other adapter, and the page-level sentinel keeps loading more.
  `virtualize({ virtualizeColumns: true })` has no effect there: antd owns its scroller, so there is
  no measured box for the horizontal window, and every column stays in the DOM.

## Options

`virtualize(options?)` takes `true` (the default), `false`, or an options
object with `virtualizeColumns` and the size knobs below. The size knobs are
accepted on `DataTable` as props too.

| Option                | Type      | Default | Description                                                                                                     |
| --------------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------- |
| `virtualizeColumns`   | `boolean` | `false` | Window the rendered columns on very wide tables. Applies with `maxHeight` or pinned columns; not in Ant Design. |
| `maxHeight`           | `number`  | —       | `DataTable` prop. Fixed-height scroll box (px); switches to element-mode windowing.                             |
| `estimateRowSize`     | `number`  | `56`    | Desktop row-height estimate in px.                                                                              |
| `estimateCardSize`    | `number`  | `132`   | Mobile card-height estimate in px.                                                                              |
| `virtualOverscan`     | `number`  | `8`     | Extra rows/cards rendered before and after the visible window.                                                  |
| `virtualScrollMargin` | `number`  | —       | Override for the measured window-mode list offset.                                                              |

## Benchmark

Virtualization renders only the rows in view, so cost is bounded by the
viewport — not the dataset. A measured A/B on the scale demo (Mantine adapter,
the **same 10,000-row dataset fully loaded**, headless Chromium, 1280×900):

|                                  | Rows in the DOM | Retained JS heap |
| :------------------------------- | --------------: | ---------------: |
| **Virtualized** (`virtualize()`) |          **24** |        **17 MB** |
| Plain table — same 10,000 rows   |          10,000 |           368 MB |

Windowing mounts **417× fewer DOM nodes** (24 vs 10,000 — a viewport's worth
plus overscan) and holds **351 MB less memory, about 95% less** — while the
plain table blocks the main thread rendering ten thousand `<tr>`s.

The two arms differ in kind, not just degree: the plain table's memory sits in
10,000 mounted rows, which cannot be released while they are on screen. The
virtualized one mounts 24 and keeps the rest as a plain array, so what it costs
is your data, not your table.

And it stays flat: the rendered row count holds at **~24 whether the dataset is
1,000 or 100,000 rows**. Only your own data array grows — never the table's DOM:

| Rows in the dataset |  1,000 | 10,000 | 50,000 | 100,000 |
| ------------------: | -----: | -----: | -----: | ------: |
|     Rows in the DOM | **24** | **24** | **24** |  **24** |

Reproduce both with
[`scripts/bench.mjs`](https://github.com/orwa-mahmoud/adapttable/blob/main/scripts/bench.mjs)
— it serves this demo itself, drives it through the whole scenario set (wide
tables, grouping, pinned columns, sorted data) and prints the DOM rows, cells,
heap and time-to-interactive for each:

```bash
node scripts/bench.mjs                   # every scenario
node scripts/bench.mjs --smoke           # the fast subset CI runs
node scripts/bench.mjs --record          # also saves the run to scripts/bench-runs/
```

`--record` writes the run — every scenario, the machine and the browser build it
ran on — to a dated JSON file in
[`scripts/bench-runs/`](https://github.com/orwa-mahmoud/adapttable/tree/main/scripts/bench-runs).

A showcase already running on the port is used as-is, so
`pnpm --filter @adapttable/showcase dev` in another terminal still works and is
the faster loop while iterating.

Heap here is **retained** memory — measured after forcing collection and taking
the floor across repeated runs, because the raw `usedJSHeapSize` figure counts
whatever the engine has not swept yet and swings by an order of magnitude with
how busy the machine is. Measured this way the numbers come out the same on a
loaded laptop as an idle one, which is what makes them worth publishing: run
`pnpm bench` and you should see them too.

## Notes

- Virtualization is optional — leave it off for small lists or paged tables.
- `virtualize()` and `rowDetail(...)` work together. A `<tr>` cannot contain the
  panel that belongs to it, so an open detail renders as a sibling row — and the
  pair is measured as a pair, with the combined height handed to the virtualizer.
  A panel that grows later (an image loading, a nested table expanding) corrects
  its item's size when it does, so scroll positions hold.
- The headless hook `useTableVirtualization` (from `@adapttable/react`) serves custom markup
  ([example](./headless.md#virtualization));
  when disabled it returns every row with no spacers, so one render path
  serves both cases.
- A windowed table still tells assistive technology how big the data really
  is: the table carries `aria-rowcount` with each row's absolute
  `aria-rowindex`, and the mobile card list carries `aria-setsize` with each
  card's `aria-posinset`. `virtualizeColumns` does the same for the horizontal
  axis — `aria-colcount` on the table and an absolute `aria-colindex` on every
  body and header cell — so a reader is never left counting the cells it can
  reach. Without
  that a screen reader would count only the few rows in the DOM. See
  [Accessibility](./accessibility.md).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
