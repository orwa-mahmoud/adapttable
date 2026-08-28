# @adapttable/chakra

[![@adapttable/chakra — a Chakra UI data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=chakra)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/chakra)**

The **Chakra UI adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included Chakra data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. Built on the headless
`@adapttable/core` engine. (Targets Chakra UI **v3**.)

```bash
pnpm add @adapttable/chakra @adapttable/core @chakra-ui/react @emotion/react react react-dom
```

## Quickstart

```tsx
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/chakra";

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

export function People({ data }: { data: Person[] }) {
  const source = useFrontendData({ data, columns });
  return (
    <ChakraProvider value={defaultSystem}>
      <DataTable source={source} columns={columns} rowKey={(r) => r.id} />
    </ChakraProvider>
  );
}
```

Dark mode follows Chakra's color mode; pass `accentColor` to tint accents.
Swap `useFrontendData` for `useQuerySource` to drive the same table from a
server-paginated query.

## Features

- **Automatic mobile cards** — below the mobile breakpoint every row renders as a Chakra card (same filters, search, selection and URL state) and infinite scroll replaces the pager; tune per column with `mobileLabel` / `hideOnMobile`, pin either layout with `forceMobile`. [See it flip live](https://orwa-mahmoud.github.io/adapttable/demo/mantine/mobile-cards/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via sortable headers.
- **Filtering** — a `Drawer` or `Popover` of filters plus removable `Tag` chips, with a filter count on the trigger. Nested AND/OR filter tree in the same panel.
- **Selection + bulk actions** using Chakra `Checkbox`es, with confirm dialogs (`bulkActions`).
- **Row actions** with optional confirm, `isHidden` / `isDisabled` per row.
- **Row expansion** — inline detail panels via `renderRowDetail`.
- **Inline cell editing** (`onCellEdit` + `editable` columns) — text, number and select
  editors; Enter commits, Escape cancels, Tab moves on. Omit the handler and no cell opens.
- **Row reordering** (`onRowReorder`) — drag handle, Space-lift keyboard, dataset-relative indices. Grouping and trees refuse it.
- **Row pinning** (`pinnedRowIds` / `onPinnedRowIdsChange`) — sticky top and bottom rows outside the virtual window. Grouping and trees refuse it.
- **Row and column spanning** (`getCellSpan`) — one cell list per row; covered cells are omitted.
- **Full-width and separator rows** (`extraRows`) — host-injected slots spliced in by `beforeRowId`.
- **Row styling and heights** (`rowStyle`, `rowHeight`) — conditional inline style and per-row height.
- **Keyboard cell navigation** (`cellNavigation`) — one tab stop, arrow keys,
  ARIA grid semantics and screen-reader announcements. It is also the gate for
  cell-range selection, clipboard copy/paste of a range, and the fill handle.
- **Row grouping** (`groupBy`) — one column key or an ordered list to nest, with per-group aggregates sharing the `summaryRow` mapper.
- **Pivot tables** — rows, columns and measures with subtotals, from the optional
  `@adapttable/core/pivot` entry.
- **Tree data** (`getChildren` / `getParentId`) — hierarchical rows with expand/collapse, on desktop and on cards.
- **Column management** — show/hide, reorder, pin (sticky) and resize, plus collapsible column groups.
- **Sparkline columns** (`@adapttable/core/sparkline`) — bar, line and area as inline SVG. The base bundle never pays for it.
- **PDF export and print layout** (`@adapttable/core/pdf`) — optional entry; `pdfWriter()` on `exportCsv`, `printTable` for the browser dialog.
- **Formula engine** (`@adapttable/core/formula`) — spreadsheet formulas over rows and aggregates; circular refs report `#CYCLE!`.
- **Feature composition** (`features={[rowReorder(fn)]}`) from `@adapttable/chakra/row-reorder`-style subpaths. Enabling props still work until v3; no bundle saving yet. Host plugins share the same `setup(host)` surface.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **CSV export** (`exportCsv`) — current page, the full filtered set, or the
  selected rows; choose the columns, or hand the whole thing to your backend.
- **Virtualization** (`virtualize`) — opt-in row/card windowing for very large lists.
- **Pagination** — prev/next pagination, or infinite scroll (auto by device).
- **SSR & server components** — renders with no DOM; the client boundary is already in the build, so it drops straight into the Next.js App Router. [Docs](https://orwa-mahmoud.github.io/adapttable/ssr-rsc/).
- **States** — `Skeleton` loading, `Alert` error with retry, and an empty state.
- **RTL** via `dir`; **dark mode** via Chakra's color mode.
- **Customisation** — `slots`, `className`, `size`, injectable `confirm`, and the full headless escape hatch via `@adapttable/core`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![chakra Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![chakra Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![chakra Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![chakra Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![chakra RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/chakra/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
