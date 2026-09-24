---
title: "React table summary row — footer totals (v1)"
description: "Add a footer summary row to a React data table: map the current
  rows to per-column totals, averages or counts, drawn in every UI kit adapter."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table summary row — footer
      totals","item":"https://adapttable.orwamahmoud.com/v1/react/summary-row/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og.png
slug: v1/react/summary-row
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/v1/react/getting-started/#try-it-in-stackblitz)

Pass `summaryRow` and the table renders one footer row whose cells line up
under their columns. You compute the values: the function receives the rows
the table renders and returns a node per column key. On mobile the same
result closes the card list as a summary card.

## Example

```tsx
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Project {
  id: string;
  name: string;
  owner: string;
  budget: number;
}

const projects: Project[] = [
  { id: "1", name: "Atlas", owner: "Ada", budget: 42000 },
  { id: "2", name: "Beacon", owner: "Alan", budget: 18500 },
  { id: "3", name: "Comet", owner: "Grace", budget: 27250 },
];

const columns: ColumnDef<Project>[] = [
  { key: "name" },
  { key: "owner" },
  { key: "budget", align: "end" },
];

function summarize(rows: readonly Project[]) {
  const total = rows.reduce((sum, row) => sum + row.budget, 0);
  return {
    name: `${rows.length} projects`,
    budget: <strong>{total.toLocaleString("en-US")}</strong>,
  };
}

export function Projects() {
  return (
    <DataTable
      data={projects}
      columns={columns}
      rowKey={(r) => r.id}
      summaryRow={summarize}
    />
  );
}
```

## How it works

* `summaryRow` is a plain mapper:
  `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>`. Each key
  of the result is a column key; its value renders in that column's footer
  cell. There are no built-in aggregate functions — sums, averages, counts
  and formatting are ordinary code in the mapper.
* **Which rows it receives** — the rows the body renders: the current page
  or loaded slice (`source.rows`). With [row grouping](/v1/react/row-grouping/)
  active, it receives the leaf rows of the grouped body; rows inside
  collapsed groups are not rendered and are not passed. With
  [virtualization](/v1/react/virtualization/) on, it still receives the whole
  slice, not only the rows in the scroll window.
* **Desktop** — one extra row after the data rows. Keys missing from the
  result render empty cells, so alignment holds. The leading expand and
  selection columns and the trailing row-actions column get empty pad cells.
* **Mobile** — a trailing summary card after the last card. It lists label →
  value for each visible column the result covers; columns without a
  summary value are skipped. Labels come from `mobileLabel`, else a string
  `header`, else the key.
* `groupAggregates` (per-group cells on group header rows) takes the **same
  signature**, so one mapper can serve both:
  `summaryRow={summarize} groupAggregates={summarize}`.

## Options

| Prop              | Type                                                            | Default | Description                                                               |
| ----------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `summaryRow`      | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Maps the rendered rows to per-column footer cells. Omit for no footer.    |
| `groupAggregates` | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —       | Per-group cells on group header rows, called with each group's leaf rows. |

## Per adapter

| Adapter                | Desktop                                                                                                       | Mobile                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `@adapttable/mantine`  | `Table.Tfoot` row; cells take the column's alignment and render semibold and dimmed.                          | Trailing `Card` with label / value pairs.                       |
| `@adapttable/mui`      | `TableFooter` row; cells follow the column's `align`.                                                         | Trailing outlined `Card`.                                       |
| `@adapttable/chakra`   | `Table.Footer` row; cells follow the column's `align`.                                                        | Trailing outline `Card`.                                        |
| `@adapttable/antd`     | antd's native `summary` slot: one `Table.Summary.Row`, padded for antd's injected expand / selection columns. | Trailing `Card` holding a one-column `Descriptions` list.       |
| `@adapttable/radix`    | Last row of `Table.Body`, marked `data-summary`; cells follow the column's `align`.                           | Trailing `Card`.                                                |
| `@adapttable/base-ui`  | Last row of `Table.Body`, marked `data-summary`; cells follow the column's `align`.                           | Trailing `Card`.                                                |
| `@adapttable/unstyled` | `<tfoot>` with parts `summary` / `summary-row` / `summary-cell` and matching `classNames` slots.               | Trailing `<li>` with part `summary-card` (`summaryCard` slot).  |
| `@adapttable/shadcn`   | The `@adapttable/unstyled` markup under shadcn's class map.                                                   | The `@adapttable/unstyled` markup.                              |

In the unstyled and shadcn adapters the mobile card skips keys whose value
is `null` or `undefined`; the other adapters skip `undefined` only.

## Notes

* The summary row is not part of a [CSV export](/v1/react/csv-export/); the file
  contains data rows only.
* The argument is always the rendered rows. For totals over the whole
  filtered set, compute them inside the mapper from a frontend source's
  `allFilteredRows` or from your own data.

## Related

* [Row grouping](/v1/react/row-grouping/) — `groupAggregates`, the per-group counterpart
* [Columns](/v1/react/columns/) — `align`, `mobileLabel`, `hideOnMobile`
* [Customization](/v1/react/customization/) — the `summary`, `summaryRow`, `summaryCell` and `summaryCard` slots
* [Pagination](/v1/react/pagination/) — what "the current page" means per mode
* [API reference](/v1/react/api/)
