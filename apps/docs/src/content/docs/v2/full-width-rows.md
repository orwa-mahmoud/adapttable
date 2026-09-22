---
title: "React table full-width and separator rows (v2)"
description: Full-width and separator rows for React data tables — extraRows
  splices host-injected slots into the body by beforeRowId. Mobile cards keep
  the same slots.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table full-width and separator
      rows","item":"https://orwa-mahmoud.github.io/adapttable/v2/full-width-rows/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/full-width-rows.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/full-width-rows.png
slug: v2/full-width-rows
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — pass `extraRows`. [Other UI kits →](/adapttable/v2/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [the live demo](https://orwa-mahmoud.github.io/adapttable/demo/) — turn **Extras** on.

A separator is a thin rule. A full-width row is one cell that spans the
table. Both are host-injected slots in the same `kind`-tagged list grouping
already uses — omit `extraRows` and nothing is inserted.

```tsx
import { DataTable } from "@adapttable/mantine";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  extraRows={[
    { key: "s", kind: "separator", beforeRowId: "2" },
    {
      key: "note",
      kind: "fullWidth",
      render: () => <em>Shipped Friday.</em>,
    },
  ]}
/>;
```

`beforeRowId` is a data-row id. Omit it to append after the last data row.
Several extras that share a target keep the host's order. A named extra
stays in front of that person through drag-reorder and pin — it is its
own full-width row, with its own height, not folded into the person
below. When a Team (or any) row span would paint through that extra, the
extra sits on top of the spanned column so the note stays whole. The
extra uses that person's `rowStyle` fill (light and dark are whatever
you passed) — AdaptTable does not pick a colour of its own.

```tsx
extraRows={[
  {
    key: "note",
    kind: "fullWidth",
    beforeRowId: ada.id,
    render: () => `Attached to ${ada.name} — drag or pin them and this extra comes along.`,
  },
]}
```

The slots join the grouping entry list when grouping is on, so they window
with the groups. On a flat or tree table they splice into the rendered
body. Mobile cards keep the same slots: a rule between cards, or a
full-width note.

Extras are content, not table state — nothing goes in the URL or a saved
view.
