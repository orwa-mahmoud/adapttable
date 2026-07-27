# @adapttable/mantine

[![@adapttable/mantine — a Mantine data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=mantine)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from mantine-datatable? See the [migration guide](https://orwa-mahmoud.github.io/adapttable/migrate-from-mantine-datatable/)._

The **Mantine adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included React data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, dark mode, and optional entrance
animation. Built on the headless `@adapttable/core` engine.

```bash
pnpm add @adapttable/mantine @adapttable/core @mantine/core @mantine/hooks react react-dom
```

## Quickstart

```tsx
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import {
  DataTable,
  useFrontendData,
  type ColumnDef,
} from "@adapttable/mantine";

interface Person {
  id: string;
  name: string;
  city: string;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return (
    <MantineProvider>
      <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
    </MantineProvider>
  );
}
```

Swap `useFrontendData` for `useQuerySource` to drive the same table from a
server-paginated `useInfiniteQuery` — nothing else changes.

## Features

- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via accessible header controls.
- **Filtering** — a `Drawer` or anchored `Popover` of filters plus removable chips (`filters` + `filterLabels`), with a filter count on the trigger.
- **Selection + bulk actions** using Mantine `Checkbox`es, with confirm dialogs (`bulkActions`).
- **Row actions** with optional confirm, `isHidden` / `isDisabled` per row.
- **Row expansion** — inline detail panels via `renderRowDetail`.
- **Inline cell editing** (`onCellEdit` + `editable` columns) — text, number and select
  editors; Enter commits, Escape cancels, Tab moves on. Omit the handler and no cell opens.
- **Row grouping** (`groupBy`) with per-group aggregates sharing the `summaryRow` mapper.
- **Column management** — show/hide, reorder, pin (sticky) and resize, from a built-in menu.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **CSV export** (`exportCsv`) — current page or the full filtered set.
- **Virtualization** (`virtualize`) — opt-in row/card windowing for very large lists.
- **Pagination** — numbered `Pagination`, or infinite scroll (auto by device).
- **Responsive** — desktop table ↔ mobile cards by viewport (or force `forceMobile`).
- **States** — `Skeleton` loading, error with retry, and an empty state.
- **RTL** via `dir`; **dark mode** via Mantine's color scheme.
- **Customisation** — `slots`, `classNames`, custom `toolbar`, injectable `confirm`, optional entrance animation (`animate`, honours `prefers-reduced-motion`), and the full headless escape hatch via `@adapttable/core`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![mantine Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![mantine Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![mantine Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![mantine Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![mantine RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/mantine/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
