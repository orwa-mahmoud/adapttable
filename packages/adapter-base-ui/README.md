# @adapttable/base-ui

[![@adapttable/base-ui — a Base UI data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=base-ui)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)**

The **Base UI adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included Base UI data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. Built on the headless
`@adapttable/core` engine. (Targets [`@base-ui/react`](https://base-ui.com/) **^1.6**.)

```bash
pnpm add @adapttable/base-ui @adapttable/core @base-ui/react react react-dom
```

Import the adapter styles once in your app entry (or rely on the side-effect import from `@adapttable/base-ui`):

```ts
import "@adapttable/base-ui/styles.css";
```

## Quickstart

```tsx
import {
  DataTable,
  useFrontendData,
  type ColumnDef,
} from "@adapttable/base-ui";

interface Person {
  id: string;
  name: string;
  email: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "email", header: "Email", accessor: (r) => r.email },
];

export function PeopleTable({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

Behavior lives in `@adapttable/core`; this package only renders Base UI primitives
(Popover, Drawer, Select, Checkbox, Tooltip, Button, Input) plus minimal chrome CSS.

## Features

- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via sortable headers.
- **Filtering** — a `Popover` or `Dialog` of filters plus removable chips, with a filter count on the trigger.
- **Selection + bulk actions** using Base UI `Checkbox`es, with confirm dialogs (`bulkActions`).
- **Row actions** with optional confirm, `isHidden` / `isDisabled` per row.
- **Row expansion** — inline detail panels via `renderRowDetail`.
- **Inline cell editing** (`onCellEdit` + `editable` columns) — text, number and select
  editors; Enter commits, Escape cancels, Tab moves on. Omit the handler and no cell opens.
- **Row grouping** (`groupBy`) with per-group aggregates sharing the `summaryRow` mapper.
- **Column management** — show/hide, reorder, pin (sticky) and resize, from a built-in menu.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **CSV export** (`exportCsv`) — current page or the full filtered set.
- **Virtualization** (`virtualize`) — opt-in row/card windowing for very large lists.
- **Pagination** — numbered pagination, or infinite scroll (auto by device).
- **Responsive** — desktop table ↔ mobile cards by viewport (or force `forceMobile`).
- **States** — skeleton loading, error with retry, and an empty state.
- **RTL** via `dir`; **dark mode** follows your theme tokens.
- **Customisation** — `slots`, `className`, injectable `confirm` — Base UI ships unstyled, so every part is yours, and the full headless escape hatch via `@adapttable/core`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![base-ui Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![base-ui Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![base-ui Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![base-ui Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![base-ui RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/base-ui/parts/rtl.gif)

## Links

- [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)
- [Documentation](https://orwa-mahmoud.github.io/adapttable/)
- [StackBlitz starter](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/base-ui)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
