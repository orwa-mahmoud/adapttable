# React table expandable rows & detail panels

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

Render a detail panel under any row by passing `renderRowDetail` — its
presence is the whole API.

## Example

```tsx
import { DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, shadcn, unstyled

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
      renderRowDetail={(row) => (
        <ul>
          {row.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    />
  );
}
```

## How it works

- Passing `renderRowDetail(row)` enables a leading expand chevron on desktop
  rows and a detail section on mobile cards — no extra flag.
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

| Prop              | Type                       | Default | Description                                                              |
| ----------------- | -------------------------- | ------- | ------------------------------------------------------------------------ |
| `renderRowDetail` | `(row: TRow) => ReactNode` | —       | Detail-panel renderer; its presence enables expansion.                   |
| `labels`          | `TableLabels`              | English | Override `expandRow` / `collapseRow` for the chevron's accessible label. |
| `rowKey`          | `(row: TRow) => string`    | —       | Already required; expansion state is keyed by this id.                   |

## Notes

- Not recommended with `virtualize`: desktop detail panels render as
  unmeasured sibling rows, so virtual scroll heights can drift (a dev-mode
  warning fires). Prefer paged data with row details.
- The detail cell spans the full row width, including selection, actions, and
  the expansion column itself.
- Kits with native expand affordances keep their own look; only the labels
  are unified through `labels`.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
