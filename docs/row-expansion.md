# React table expandable rows — detail panels with keyboard support

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

▶ **See it working:** [nested tables in Mantine](https://orwa-mahmoud.github.io/adapttable/demo/mantine/nested-tables/) — open a row onto another table, not a blank panel. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

Render a detail panel under any row by composing `rowDetail(render)` from
`@adapttable/<kit>/row-detail`. To put a whole table in the panel instead, the
same subpath exports `nestedTable(...)` — see
[a real table under a row](./tree-data.md#a-real-table-under-a-row).

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { rowDetail } from "@adapttable/mantine/row-detail";

interface Order {
  id: string;
  customer: string;
  total: number;
  items: string[];
}

const data: Order[] = [
  { id: "1", customer: "Aisha", total: 240, items: ["Desk", "Lamp"] },
  { id: "2", customer: "Jonas", total: 90, items: ["Chair"] },
  { id: "3", customer: "Mei", total: 410, items: ["Monitor", "Dock", "Cable"] },
];

export function Orders() {
  return (
    <DataTable
      data={data}
      columns={[{ key: "customer", sortable: true }, { key: "total" }]}
      rowKey={(r) => r.id}
      features={[
        rowDetail((row: Order) => (
          <ul>
            {row.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )),
      ]}
    />
  );
}
```

## How it works

- Composing `rowDetail(render)` adds a leading expand chevron on desktop
  rows and a detail section on mobile cards — no extra flag. The second
  argument, `defaultExpandedRowIds`, opens those rows on the first render; after
  that the reader's toggles own the set.
- **Multiple rows may be open at once.** Expansion is keyed by row id, so an
  open panel survives sorting and paging: a row that leaves the page simply
  re-opens when it returns.
- The chevron carries `aria-expanded` plus the `expandRow` / `collapseRow`
  labels (defaults "Expand row" / "Collapse row"; the i18n presets translate
  them).
- Ant Design maps the contract onto its **native** `expandable` API
  (`expandedRowKeys` / `expandedRowRender`), with a custom expand icon so the
  `labels.expandRow` / `labels.collapseRow` contract still applies instead of
  antd's ConfigProvider locale.
- The state lives in a headless hook, `useRowExpansion()` — use it for custom
  markup: `{ expandedIds, isExpanded(id), toggle(id) }`.

## Options

`rowDetail(renderRowDetail, defaultExpandedRowIds?)`:

| Argument                | Type                     | Default | Description                                                 |
| ----------------------- | ------------------------ | ------- | ----------------------------------------------------------- |
| `renderRowDetail`       | `(row: TRow) => unknown` | —       | Detail-panel renderer.                                      |
| `defaultExpandedRowIds` | `readonly string[]`      | —       | Row ids whose panel starts open. Later toggles own the set. |

Related `DataTable` props:

| Prop     | Type                    | Default | Description                                                              |
| -------- | ----------------------- | ------- | ------------------------------------------------------------------------ |
| `labels` | `TableLabels`           | English | Override `expandRow` / `collapseRow` for the chevron's accessible label. |
| `rowKey` | `(row: TRow) => string` | —       | Already required; expansion state is keyed by this id.                   |

## Notes

- Works with the `virtualize()` feature. A table cannot nest a detail panel inside the row it
  belongs to, so the two are separate elements — the window measures them
  **together**, and an open panel reports its real height instead of its row's.
  A panel that grows later (an image loading, a nested table opening) corrects
  the height as it happens.
- The detail cell spans the full row width, including selection, actions, and
  the expansion column itself.
- Kits with native expand affordances keep their own look; only the labels
  are unified through `labels`.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
