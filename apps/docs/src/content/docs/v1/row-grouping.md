---
title: "React table row grouping — single-level groupBy, per-group aggregates (v1)"
description: Single-level React table row grouping — opt-in groupBy, per-group
  aggregates sharing the summaryRow mapper, expand/collapse, frontend tier only.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table row grouping — single-level groupBy, per-group
      aggregates","item":"https://orwa-mahmoud.github.io/adapttable/v1/row-grouping/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/row-grouping.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/row-grouping.png
slug: v1/row-grouping
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — this page's feature is already wired in `src/App.tsx` (`groupBy="role"` + `groupAggregates`); edit it in the browser, no install. [Other UI kits →](/adapttable/v1/getting-started/#try-it-in-stackblitz)

▶ **See it working:** [collapse groups and read per-group subtotals in the live demo](https://orwa-mahmoud.github.io/adapttable/demo/grouping/) — a real table you can click, not a recording.

Group rows by one column with `groupBy` and optional per-group subtotals via
`groupAggregates` — the **same mapper signature as `summaryRow`**. Omit
`groupBy` and the table never inserts group header rows (package DNA: opt-in).

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Aisha", team: "Core", budget: 42_000 },
  { id: "2", name: "Jonas", team: "Platform", budget: 38_000 },
  { id: "3", name: "Mei", team: "Core", budget: 51_000 },
];

export function People() {
  return (
    <DataTable
      data={PEOPLE}
      columns={[
        { key: "name", sortable: true },
        { key: "team", sortable: true },
        {
          key: "budget",
          accessor: (r) => `$${r.budget.toLocaleString()}`,
          sortValue: (r) => r.budget,
        },
      ]}
      rowKey={(r) => r.id}
      groupBy="team"
      groupAggregates={(rows) => ({
        budget: (
          <b>${rows.reduce((sum, r) => sum + r.budget, 0).toLocaleString()}</b>
        ),
      })}
    />
  );
}
```

## How it works

* **Opt-in.** Pass `groupBy` (a column key) or set `source.groupBy` via
  `useFrontendData` / URL state — without it, grouping stays fully dormant.
* **Single level.** One grouping column at a time (no nested groups, no
  drag-to-group panel).
* **Frontend tier only.** Grouping needs the full filtered row set in memory
  (`allFilteredRows`). Server-paginated sources log a dev-mode warning and
  ignore grouping — see [Data tiers](/adapttable/v1/data-tiers/).
* **Shared mapper.** `groupAggregates(rows)` uses the same
  `(rows) => Partial<Record<string, ReactNode>>` shape as `summaryRow`; reuse
  one function for both if the math is identical.
* **Expand / collapse.** Groups start expanded. Collapse state is ephemeral
  (not URL-synced). The source's `groupBy` state serializes to the URL
  (`?groupBy=`) like sort and filters; a `groupBy` prop overrides it (`null`
  forces grouping off).
* **Whole result set.** A grouped body renders every filtered row
  (`allFilteredRows`), not just the current page. Groups appear in the order
  their first row appears in the sorted rows.
* **Selection.** When row checkboxes are enabled, each group header exposes a
  tri-state checkbox over its leaf rows.

## Options

| Prop / field                | Type                                                            | Default | Description                                                                                 |
| --------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `groupBy`                   | `string \| null`                                                | —       | Column key to group by; its presence arms grouping (still requires a frontend data source). |
| `onGroupByChange`           | `(groupBy: string \| null) => void`                             | —       | Controlled change channel; falls back to `source.setGroupBy`.                               |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Per-group cells — **same signature as `summaryRow`**. Omit for headers without subtotals.   |
| `collapsedGroupIds`         | `readonly string[]`                                             | —       | Controlled collapsed group keys (ephemeral — not URL-synced).                               |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —       | Controlled collapse channel; uncontrolled mode uses internal state.                         |
| `labels`                    | `TableLabels`                                                   | English | Override `expandGroup`, `collapseGroup`, and `groupCount` for header controls.              |

## Notes

* Bucketing uses the column's `sortValue` when present, otherwise a path lookup
  on the column key — never the JSX `accessor`. Rows with an empty value
  collect under a `(blank)` group.
* Group keys — the ids in `collapsedGroupIds` — have the form
  `group:<groupBy>:<value>`.
* Works on desktop rows and mobile cards, LTR and RTL, with and without
  `virtualize` (virtual windows count collapsed groups as one row).
* Out of scope (by design): multi-level nesting, pivot mode, drag-to-group,
  and Excel-style aggregation pickers.
* Ant Design maps group headers onto its high-level `Table` via custom row
  rendering; every other kit renders native group header rows/cards.

The footer total the same mapper feeds is on [summary row](/adapttable/v1/summary-row/).

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/) —
rows are grouped by team with a budget subtotal per group.
