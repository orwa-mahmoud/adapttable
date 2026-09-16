# React table sparkline columns

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — import `@adapttable/react/sparkline`. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [turn on the sparkline column in the Feature Lab](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — switch kits with it on and the chart is drawn by each one.

A sparkline is a mini chart in a cell: bar, line or area, drawn as inline
SVG. It ships as `@adapttable/react/sparkline` so a table that never
imports it never pays for it. No chart library.

```tsx
import { sparklineColumn } from "@adapttable/react/sparkline";
import { DataTable } from "@adapttable/mantine";

const columns = [
  sparklineColumn({
    key: "load",
    header: "Load",
    values: (row) => row.history,
    kind: "area",
  }),
];

<DataTable data={rows} columns={columns} rowKey={(row) => row.id} />;
```

`Sparkline` is the chart on its own, for a host `Cell` or `accessor`.
`sparklineColumn` wires the usual surfaces: the cell draws the SVG,
`sortValue` is the last finite number, and `exportValue` is the series
as `"1, 2, 3"` so CSV and xlsx get the numbers, not markup.

The SVG is a fixed size (80×28 by default). No `ResizeObserver`, so a
virtualized row can mount and unmount it without measuring. Mobile
cards render the same cell. Time stays left-to-right even under RTL —
mirroring a series would put "last" on the left. Pass a `label` for a
translated summary; the default is a numeric sentence (`3 values, min
1, max 4, last 2`).

Omit the import and nothing is drawn and nothing is downloaded.
