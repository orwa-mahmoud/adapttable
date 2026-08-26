# @adapttable/antd

[![@adapttable/antd — an Ant Design data table built on AdaptTable](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/filtering.gif)](https://orwa-mahmoud.github.io/adapttable/demo/?kit=antd)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/antd)**

The **Ant Design adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included antd data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, and dark mode. It drives antd's
high-level `<Table>` from the headless `@adapttable/core` engine, so you get
the antd look-and-feel wired to a shareable, server-or-client data source.

```bash
pnpm add @adapttable/antd @adapttable/core antd react react-dom
```

## Quickstart

```tsx
import { DataTable, useFrontendData, type ColumnDef } from "@adapttable/antd";

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
  return <DataTable source={source} columns={columns} rowKey={(r) => r.id} />;
}
```

Wrap your app in antd's `ConfigProvider` to control the theme (including
`theme.darkAlgorithm`) and `direction="rtl"`, as usual. Swap `useFrontendData`
for `useQuerySource` to drive the table from a server-paginated query — the
component doesn't change.

## Features

- **Automatic mobile cards** — a horizontally-scrollable `<Table>` on desktop becomes a `Card` + `Descriptions` list below the mobile breakpoint (same filters, search, selection and URL state); tune per column with `mobileLabel` / `hideOnMobile`, pin either layout with `forceMobile`. [See it flip live](https://orwa-mahmoud.github.io/adapttable/demo/mantine/mobile-cards/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via native antd `<Table>` header sort carets.
- **Filtering** — a `Drawer` or `Popover` of filters plus removable `Tag` chips, with a filter count on the trigger. Nested AND/OR filter tree in the same panel.
- **Selection + bulk actions** using antd `Checkbox`es (with indeterminate select-all), with confirm dialogs (`bulkActions`).
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
  ARIA grid semantics and screen-reader announcements.
- **Row grouping** (`groupBy`) with per-group aggregates sharing the `summaryRow` mapper.
- **Pivot tables** — rows, columns and measures with subtotals, from the optional
  `@adapttable/core/pivot` entry.
- **Tree data** (`getChildren` / `getParentId`) — hierarchical rows with expand/collapse, on desktop and on cards.
- **Column management** — show/hide, reorder, pin (sticky) and resize, plus collapsible column groups.
- **Sparkline columns** (`@adapttable/core/sparkline`) — bar, line and area as inline SVG. The base bundle never pays for it.
- **PDF export and print layout** (`@adapttable/core/pdf`) — optional entry; `pdfWriter()` on `exportCsv`, `printTable` for the browser dialog.
- **Formula engine** (`@adapttable/core/formula`) — spreadsheet formulas over rows and aggregates; circular refs report `#CYCLE!`.
- **Feature composition** (`features={[rowReorder(fn)]}`) from `@adapttable/antd/row-reorder`-style subpaths. Enabling props still work until v3; no bundle saving yet. Host plugins share the same `setup(host)` surface.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **CSV export** (`exportCsv`) — current page, the full filtered set, or the
  selected rows; choose the columns, or hand the whole thing to your backend.
- **Virtualization** (`virtualize`) — opt-in row/card windowing for very large lists.
- **Pagination** — antd `Pagination` with page-size changer, or infinite scroll (IntersectionObserver auto-load plus a "Load more" fallback).
- **SSR & server components** — renders with no DOM; the client boundary is already in the build, so it drops straight into the Next.js App Router. [Docs](https://orwa-mahmoud.github.io/adapttable/ssr-rsc/).
- **States** — antd `Skeleton` (honouring `skeletonRows`), `Alert` error with retry, and `Empty`.
- **RTL** via `dir`-aware logical column alignment; **dark mode** via antd's algorithm.
- **Customisation** — `slots` (skeleton, empty), `className`, `size`, `bordered`, injectable `confirm`, and the full headless escape hatch via `@adapttable/core`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![antd Row grouping](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![antd Inline cell editing](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![antd Filtering](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![antd Column management](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![antd RTL / Arabic](https://orwa-mahmoud.github.io/adapttable/media/adapters/antd/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
