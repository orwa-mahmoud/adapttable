---
title: "React table row styling and heights (v2)"
description: Conditional row styling and heights for React data tables —
  rowStyle and rowHeight on desktop rows and mobile cards, with a
  variable-height virtualizer.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table row styling and
      heights","item":"https://adapttable.orwamahmoud.com/v2/react/row-styling/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/row-styling.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/row-styling.png
slug: v2/react/row-styling
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — pass `rowStyle` or `rowHeight`. [Other UI kits →](/v2/react/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [the live demo](https://adapttable.orwamahmoud.com/react/demo/) — turn **Style** on.

`rowClassName` already appends a class. `rowStyle` and `rowHeight` are the
inline half of the same hook: a function of `(row, index)`, applied on
desktop rows and mobile cards alike. Omit both and nothing is set.

```tsx
import { DataTable } from "@adapttable/mantine";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  rowStyle={(row) =>
    row.overdue ? { backgroundColor: "var(--overdue)" } : undefined
  }
  rowHeight={(row) => (row.tall ? 72 : 48)}
/>;
```

A number `rowHeight` is every row. A function is per row. Height wins when
`rowStyle` also names `height` — `rowHeight` is the dedicated override.

Pass a light fill and a dark fill — AdaptTable does not pick those colours.
`light-dark()` follows the page `color-scheme` (and RTL uses logical
properties, so `text-align: start` is already the extra's alignment):

```tsx
rowStyle={(row) =>
  row.overdue
    ? {
        backgroundColor:
          "light-dark(oklch(0.93 0.08 95), oklch(0.38 0.07 85))",
      }
    : undefined
}
```

CSS variables that flip under the host's dark class work the same way.

The row virtualizer's `estimateSize` reads the same value, so a
variable-height table still windows. `measureElement` stays authoritative
for what the browser actually laid out.

Style and height are functions of the row, not table state — nothing goes
in the URL or a saved view.
