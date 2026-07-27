# @adapttable/radix

[![@adapttable/radix — a Radix Themes data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=radix)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/radix)**

The **Radix Themes adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included Radix data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. Built on the headless
`@adapttable/core` engine. (Targets `@radix-ui/themes` **v3**.)

```bash
pnpm add @adapttable/radix @adapttable/core @radix-ui/themes react react-dom
```

## Quickstart

```tsx
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/radix";

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return (
    <Theme accentColor="iris">
      <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
    </Theme>
  );
}
```

Appearance follows the surrounding `<Theme>` — light/dark, accent, and radius;
pass `accentColor` to tint the table's own accents. Swap `useFrontendData` for
`useQuerySource` to drive the same table from a server-paginated query.

## Features

- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via sortable headers.
- **Filtering** — a `Popover` or `Dialog` of filters plus removable `Badge` chips, with a filter count on the trigger.
- **Selection + bulk actions** using Radix `Checkbox`es, with confirm dialogs (`bulkActions`).
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
- **States** — `Skeleton` loading, error with retry, and an empty state.
- **RTL** via `dir`; **dark mode** via the Radix Themes appearance.
- **Customisation** — `slots`, `size`, `accentColor`, `className`, injectable `confirm`, and the full headless escape hatch via `@adapttable/core`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![radix Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![radix Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![radix Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![radix Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![radix RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/radix/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
