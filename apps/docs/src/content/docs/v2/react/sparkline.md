---
title: "React table sparkline columns — bar, line, area (v2)"
description: Optional React table sparkline columns — bar, line and area as
  inline SVG from @adapttable/core/sparkline, so the base bundle never pays for
  charts.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table sparkline columns — bar, line,
      area","item":"https://adapttable.orwamahmoud.com/v2/react/sparkline/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/sparkline.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/sparkline.png
slug: v2/react/sparkline
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — import `@adapttable/core/sparkline`. [Other UI kits →](/v2/react/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [turn on the sparkline column in the Feature Lab](https://adapttable.orwamahmoud.com/react/demo/all-options/) — switch kits with it on and the chart is drawn by each one.

A sparkline is a mini chart in a cell: bar, line or area, drawn as inline
SVG. It ships as `@adapttable/core/sparkline` so a table that never
imports it never pays for it. No chart library.

```tsx
import { sparklineColumn } from "@adapttable/core/sparkline";
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
`kind` defaults to `"line"` and `color` to `currentColor`, so the kit theme
wins. `column` adds any other `ColumnDef` fields; the helper's accessor, sort
and export take precedence over them. Non-finite values are dropped before
drawing (`finiteSparklineValues`); `sparklineSummary` and
`sparklineExportValue` are the label and export helpers on their own.

The SVG is a fixed size (80×28 by default). No `ResizeObserver`, so a
virtualized row can mount and unmount it without measuring. Mobile
cards render the same cell. Time stays left-to-right even under RTL —
mirroring a series would put "last" on the left. Pass a `label` for a
translated summary; the default is a numeric sentence (`3 values, min
1, max 4, last 2`).

Omit the import and nothing is drawn and nothing is downloaded.
