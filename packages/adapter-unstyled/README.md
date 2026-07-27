# @adapttable/unstyled

[![@adapttable/unstyled — a headless table styled with Tailwind / shadcn](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=tailwind)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/unstyled)**

The **headless, unstyled** adapter for [AdaptTable](https://github.com/orwa-mahmoud/adapttable).
Renders semantic HTML with `data-adapttable-part` + `data-*` state hooks
and per-part `className` overrides — style it with **Tailwind**, **shadcn/ui**,
or your own CSS. Ships zero styles.

```bash
pnpm add @adapttable/unstyled @adapttable/core react react-dom
```

## Quickstart

```tsx
import {
  DataTable,
  useFrontendData,
  type ColumnDef,
} from "@adapttable/unstyled";

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      classNames={{
        table: "w-full text-sm",
        headerCell: "text-left font-medium text-zinc-500 px-3 py-2",
        row: "border-b hover:bg-zinc-50 data-[selected]:bg-blue-50",
        cell: "px-3 py-2",
      }}
    />
  );
}
```

## Features

- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via sortable headers.
- **Filtering** — a drawer or popover of filters plus removable removable chips, with a filter count on the trigger.
- **Selection + bulk actions** using plain `<input type="checkbox">`, with confirm dialogs (`bulkActions`).
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
- **RTL** via `dir`; **dark mode** is whatever your CSS says.
- **Customisation** — `classNames` for every part, `slots`, injectable `confirm` — zero opinions about styling, and the full headless escape hatch via `@adapttable/core`.

## Styling hooks

Every node carries:

- `data-adapttable-part="…"` — `root`, `toolbar`, `search-field`,
  `search-icon`, `search`, `filters-button`, `filters-icon`, `column-menu`,
  `table`, `row`, `cell`, `header-cell`, `sort-button`, `chips`, `chip`,
  `bulk-bar`, `footer`, `empty`, `loading`, `error`, `card`, …
- `data-*` state — `data-selected` on selected rows/cards, `data-sorted`
  (`asc`/`desc`) on the active header, `data-mobile` on the root, and
  `data-density` (`comfortable`/`compact`) on the root. The adapter ships no
  density styles — drive spacing yourself, e.g.
  `[data-density="compact"] [data-adapttable-part="cell"] { padding: 4px 8px; }`.
- A per-part `className` from the `classNames` prop.

Target them with attribute selectors (`[data-adapttable-part="row"]`),
Tailwind data variants (`data-[selected]:bg-blue-50`), or class overrides.

The leading search/funnel glyphs render as inline `currentColor` SVGs in the
`search-icon` / `filters-icon` slots, so you can restyle or hide them via the
`searchIcon` / `filtersIcon` class names (or the matching `data-adapttable-part`
selectors). `SearchIcon` and `FiltersIcon` are also exported for reuse.

## Empty / loading overrides

Replace the empty-state or first-load skeleton with the top-level
`emptyState` / `loadingState` props, or with the cross-adapter `slots` alias —
whichever your other adapters already use:

```tsx
<DataTable
  source={source}
  columns={columns}
  rowKey={(r) => r.id}
  slots={{ empty: <MyEmpty />, skeleton: <MySkeleton /> }}
/>
```

`slots.empty` / `slots.skeleton` take precedence when both forms are supplied
(`slots.empty ?? emptyState`, `slots.skeleton ?? loadingState`).

Everything else — client/server data, URL state, sorting, filtering,
selection + bulk actions, RTL (`dir`), auto desktop/mobile — works the same
as the other adapters, on the headless `@adapttable/core` engine.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![unstyled Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![unstyled Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![unstyled Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![unstyled Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![unstyled RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/unstyled/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
