---
title: "React table pinned summary and total rows (v3)"
description: Pin total and summary rows above or below a React data table,
  outside sort, filter, grouping, pagination and selection, on grouped and tree
  tables too.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table pinned summary and total
      rows","item":"https://adapttable.orwamahmoud.com/v3/react/pinned-summary-rows/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/pinned-summary-rows.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/pinned-summary-rows.png
slug: v3/react/pinned-summary-rows
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/efd18cf92b4e11175f673269395687617e39c2de/starters/mantine?file=src%2FApp.tsx) — compose `pinnedSummaryRows`. [Other UI kits →](/v3/react/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [pinned summaries and group totals in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/aggregation/) — host-owned totals stick above and below the list, and they are not data rows. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

These are **not** lifted data rows. You pass separate objects
(`pinnedRows: { top, bottom }`) that never enter sort, filter, grouping,
pagination or selection. Cells still run through the ordinary column
pipeline — formatters, sparklines, spanning — and the rows stick above
or below the scroll window, including on grouped and tree tables where
[lift-a-data-row pinning](/v3/react/row-pinning/) stays refused.

```tsx
import { DataTable } from "@adapttable/mantine";
import { pinnedSummaryRows } from "@adapttable/mantine/pinned-summary-rows";

const totals = { id: "totals", name: "Team total", budget: 128_000 };

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    pinnedSummaryRows({
      top: [totals],
      bottom: [{ id: "grand", name: "Grand total", budget: 128_000 }],
    }),
  ]}
/>;
```

The objects are host data. Nothing is written to the URL or a Saved View
— a shared link does not have to invent totals the next load cannot
recompute. They are not exported, selected, edited, reordered, or given
pin / row-action menus.

Desktop rows use `data-adapttable-part="pinned-summary-top"` /
`"pinned-summary-bottom"` and `aria-label` from `pinnedSummaryRow`.
Keyboard cell navigation reaches them. Mobile cards keep the same order
and announcement; a card list has no sticky chrome.

Identities are namespaced (`adapttable:pinned-summary:top:0`) so they
never collide with a data-row id.

Totals computed from rows — `summaryRow` and group aggregates — are on the
[aggregation](/v3/react/aggregation/) page. Lift a real person with [`rowPinning`](/v3/react/row-pinning/). Stick a total
that is not in the dataset with this factory.

Labels: `pinnedSummaryRow`, `pinnedSummaryTop`, `pinnedSummaryBottom`.

Headless, from `@adapttable/core`: `PinnedRows` is the `{ top, bottom }`
shape and `PinnedSummaryEntry` one resolved row; `resolvePinnedRows`,
`pinnedSummaryEntries` and `allPinnedSummaryEntries` flatten them into keyed
entries. `pinnedSummaryRowId(side, index)` builds the namespaced id,
`isPinnedSummaryRowId(id)` and `pinnedSummarySideFromId(id)` read it back, and
`pinnedSummaryPart(side)` names the row's part (`PINNED_SUMMARY_TOP_PART` /
`PINNED_SUMMARY_BOTTOM_PART`). The id and part helpers are also on
`@adapttable/react/adapter`.
