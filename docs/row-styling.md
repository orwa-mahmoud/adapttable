# React table row styling and heights

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — add `rowAppearance({ rowStyle, rowHeight })` from `@adapttable/mantine/row-appearance` to `features`. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [the all-options demo](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — turn **Row style** on.

`rowAppearance` takes three options: `rowClassName` appends a class, and
`rowStyle` / `rowHeight` set inline style and height. Each is a function of
`(row, index)` (`rowHeight` also takes a number), applied to desktop rows and
mobile cards alike. Without the feature nothing is set.

```tsx
import { DataTable } from "@adapttable/mantine";
import { rowAppearance } from "@adapttable/mantine/row-appearance";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    rowAppearance({
      rowStyle: (row) =>
        row.overdue ? { backgroundColor: "var(--overdue)" } : undefined,
      rowHeight: (row) => (row.tall ? 72 : 48),
    }),
  ]}
/>;
```

A number `rowHeight` is every row. A function is per row. Height wins when
`rowStyle` also names `height` — `rowHeight` is the dedicated override.

Pass a light fill and a dark fill — AdaptTable does not pick those colours.
`light-dark()` follows the page `color-scheme` (and RTL uses logical
properties, so `text-align: start` is already the extra's alignment):

```tsx
rowAppearance({
  rowStyle: (row) =>
    row.overdue
      ? {
          backgroundColor:
            "light-dark(oklch(0.93 0.08 95), oklch(0.38 0.07 85))",
        }
      : undefined,
});
```

CSS variables that flip under the host's dark class work the same way.

The row virtualizer's `estimateSize` reads the same value, so a
variable-height table still windows. `measureElement` stays authoritative
for what the browser actually laid out.

Style and height are functions of the row, not table state — nothing goes
in the URL or a saved view.
