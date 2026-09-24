# React table row and column spanning

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — add `cellSpan(...)` from `@adapttable/mantine/cell-span` to `features`. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [merge cells in Mantine](https://adapttable.orwamahmoud.com/react/demo/mantine/rows/) — Team is written once down the people who share it. Person stays its own cell. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

A span is a rectangle. The origin cell carries `colSpan` / `rowSpan`; every
covered neighbour is omitted from that row's cell list, so every kit maps one
list instead of `columns.map`. Spanning is the `cellSpan` feature: without it
the list is one cell per column and nothing extra renders, even when a column
sets `colSpan` / `rowSpan`.

By default the origin is painted like a spreadsheet merge: **centered
content, one fill** across the whole span (`data-cell-span` is
`"colSpan x rowSpan"`, e.g. `"1x5"`). That is `cellSpan(getCellSpan, "merged")`,
the default. Pass `"plain"` as the second argument for geometry only — same chrome as a 1×1 cell — if you want
to draw a calendar-style bar yourself. Override the fill with
`--adapttable-cell-span-fill`, or the unstyled `cellSpan` class hook.

```tsx
import { DataTable } from "@adapttable/mantine";
import { cellSpan } from "@adapttable/mantine/cell-span";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    cellSpan(({ column, row, sectionRows, sectionRowIndex }) => {
      if (column.key !== "team") return undefined;
      if (sectionRows[sectionRowIndex - 1]?.team === row.team) return undefined;
      let rowSpan = 1;
      while (sectionRows[sectionRowIndex + rowSpan]?.team === row.team) {
        rowSpan += 1;
      }
      return rowSpan > 1 ? { rowSpan } : undefined;
    }),
  ]}
/>;
```

A column that always spans can say so on the definition:

```tsx
{ key: "team", header: "Team", accessor: (row) => row.team, rowSpan: 2 }
```

The table honours it once `cellSpan` is composed. With no per-cell rule,
pass one that defers to the columns: `features={[cellSpan(() => undefined)]}`.

The callback's value wins per side: a side it leaves unset, or an
`undefined` return, falls back to `column.colSpan` / `column.rowSpan`. Spans clamp to the remaining grid.
They clip at a **column pin** boundary (a pinned cell and a scrolling cell
cannot share one `<td>`) and at the **column window**: a span that starts
off-screen continues on the first visible column it covers.

Arrow keys skip a covered cell. CSV / XLSX write the origin value once and
leave covered cells empty.

## Mobile and the URL

Cards are a list of fields, not a grid — they ignore geometry and still
show every column. Spans are derived from data, so there is nothing to
put in the URL or a saved view.

Row spans stay inside one tbody. Consecutive teammates in visual order
(pinned top, then scroll, then pinned bottom) stay one merge — pinning a
Core person to the floor does not split Core into two cells. Kits render
those rows in the same tbody so HTML can express the span; a sticky pin
and a `rowSpan` taller than one row paint on top of each other, so the
sticky offset is skipped while any body cell spans more than one row.
The row still moves to the top or floor.
