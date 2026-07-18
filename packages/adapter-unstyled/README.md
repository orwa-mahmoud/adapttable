# @adapttable/unstyled

[![@adapttable/unstyled — a headless table styled with Tailwind / shadcn](https://orwa-mahmoud.github.io/adapttable/media/demo-unstyled.gif)](https://orwa-mahmoud.github.io/adapttable/media/demo-unstyled.mp4)

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

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © Orwa Mahmoud
