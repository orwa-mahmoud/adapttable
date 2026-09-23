# React table full-width and separator rows

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — add `extraRows([...])` from `@adapttable/mantine/extra-rows` to `features`. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [the all-options demo](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — turn **Extra attached to a person** on.

A separator is a thin rule. A full-width row is one cell that spans the
table. Both are host-injected slots in the same `kind`-tagged list grouping
already uses. Without the `extraRows` feature nothing is inserted.

```tsx
import { DataTable } from "@adapttable/mantine";
import { extraRows } from "@adapttable/mantine/extra-rows";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    extraRows([
      { key: "s", kind: "separator", beforeRowId: "2" },
      {
        key: "note",
        kind: "fullWidth",
        render: () => <em>Shipped Friday.</em>,
      },
    ]),
  ]}
/>;
```

`beforeRowId` is a data-row id. Omit it to append after the last data row.
Several extras that share a target keep the host's order. A named extra
stays in front of that person through drag-reorder and pin — it is its
own full-width row, with its own height, not folded into the person
below. When a Team (or any) row span would paint through that extra, the
extra sits on top of the spanned column so the note stays whole. The
extra uses the `backgroundColor` / `background` that
`rowAppearance({ rowStyle })` gives that person (light and dark are whatever
you passed) — AdaptTable does not pick a colour of its own.

```tsx
features={[
  extraRows([
    {
      key: "note",
      kind: "fullWidth",
      beforeRowId: ada.id,
      render: () =>
        `Attached to ${ada.name} — drag or pin them and this extra comes along.`,
    },
  ]),
]}
```

The slots join the grouping entry list when grouping is on, so they window
with the groups. On a flat or tree table they splice into the rendered
body. Mobile cards keep the same slots: a rule between cards, or a
full-width note.

Extras are content, not table state — nothing goes in the URL or a saved
view.
