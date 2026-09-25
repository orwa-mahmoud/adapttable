# @adapttable/mantine

[![@adapttable/mantine — a Mantine data table built on AdaptTable](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/filtering.gif)](https://adapttable.orwamahmoud.com/react/demo/?kit=mantine)

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[🚀 Live demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Get started](https://adapttable.orwamahmoud.com/react/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from mantine-datatable? See the [migration guide](https://adapttable.orwamahmoud.com/react/migrate-from-mantine-datatable/)._

The **Mantine adapter** for [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a batteries-included React data table with sorting, filtering, URL-synced
state, selection + bulk actions, RTL, dark mode, and optional entrance
animation. Built on the headless `@adapttable/core` engine.

```bash
pnpm add @adapttable/mantine @adapttable/core @mantine/core @mantine/hooks react react-dom
```

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

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

- **Automatic mobile cards** — below the mobile breakpoint every row renders as a Mantine `Card` (same filters, search, selection and URL state) and infinite scroll replaces the pager; tune per column with `mobileLabel` / `hideOnMobile`, pin either layout with `forceMobile`. [See it flip live](https://adapttable.orwamahmoud.com/react/demo/mantine/mobile-cards/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **Global search box** — debounced; matches each row's searchable text on client data and hands the term to the backend on a server tier. Turn it off with `searchable={false}`.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Sorting** via accessible header controls.
- **Filtering** — compose `filters(...)` for a `Drawer` or anchored `Popover`
  plus removable chips and a trigger count. A nested AND/OR filter tree uses
  the same panel.
- **Header filters** (`headerFilters()`) — a funnel in each filtered column's header opens the same field as the Filters panel, bound to the same state, URL params and chips.
- **Custom filter types** (`filterTypes([...])`) — register a `FilterTypeSpec` with its own widget, operators and predicate; it gets the form field, header funnel, URL params and chips.
- **Selection + bulk actions** using Mantine `Checkbox`es, composed with `bulkActions(...)`.
- **Row actions** with optional confirm, `isHidden` / `isDisabled` per row.
- **Row expansion** — inline detail panels via `rowDetail(...)`.
- **Nested tables** (`nestedTable(...)`) — a full `DataTable` with its own columns, sorting and paging inside an expanded row.
- **Inline cell editing** (`editing(handler)` + `editable` columns) — text, number and select
  editors; Enter commits, Escape cancels, Tab moves on. Omit the handler and no cell opens.
- **Row reordering** (`rowReorder(handler)`) — drag handle, Space-lift keyboard, dataset-relative indices.
- **Row pinning** (`rowPinning(...)`) — sticky top and bottom rows outside the virtual window.
- **Pinned summary rows** (`pinnedSummaryRows(...)`) — host-owned totals stuck outside sort, filter, grouping, pagination and selection, including on grouped and tree tables.
- **Row and column spanning** (`cellSpan(...)`) — one cell list per row; covered cells are omitted.
- **Full-width and separator rows** (`extraRows(...)`) — host-injected slots spliced in by `beforeRowId`.
- **Row styling and heights** (`rowAppearance(...)`) — conditional inline style and per-row height.
- **Keyboard cell navigation** (`cellNavigation()`) — one tab stop, arrow keys,
  ARIA grid semantics and screen-reader announcements. It is also the gate for
  cell-range selection, clipboard copy/paste of a range, and the fill handle.
- **Row grouping** (`grouping(...)` or `groupingPanel(...)`) — one column key or an ordered list to nest, with per-group aggregates.
- **Aggregation** — a footer `summaryRow`, group subtotals from `aggregatable` columns, and built-in or custom `aggregate()` operations; totals recompute from the filtered rows.
- **Pivot tables** — rows, columns and measures with subtotals, from the optional
  `@adapttable/core/pivot` entry.
- **Tree data** (`tree(...)`) — hierarchical rows with expand/collapse, on desktop and on cards.
- **Column management** — show/hide, reorder, pin (sticky) and resize, plus collapsible column groups.
- **Sparkline columns** (`@adapttable/react/sparkline`) — bar, line and area as inline SVG. The base bundle never pays for it.
- **PDF export and print layout** (`@adapttable/core/pdf`) — optional entry; `pdfWriter()` on `exportCsv`, `printTable` for the browser dialog.
- **Formula engine** (`@adapttable/core/formula`) — spreadsheet formulas over rows and aggregates; circular refs report `#CYCLE!`.
- **Feature composition** (`features={[rowReorder(fn)]}`) from `@adapttable/mantine/row-reorder`-style subpaths — the import is the switch, and `standardFeatures()` on the `/preset` entry is the one-import path. Host plugins share the same `setup(host)` surface.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **CSV export** (`exportCsv(...)`) — current page, the full filtered set, or the
  selected rows; choose the columns, or hand the whole thing to your backend.
- **XLSX export** (`@adapttable/core/xlsx`) — optional entry; `xlsxWriter()` on `exportCsv` writes a real `.xlsx` workbook with no extra dependency.
- **Command palette and context menus** (`commandPalette()`, `contextMenu()`) — Cmd/Ctrl+K opens a searchable list of table actions; right-click opens a menu for the header, row or cell.
- **View controls** — `densityChooser()`, `fullscreen()`, `print(...)`, `statusBar()`, `selectionStats()`, `sidePanel(...)` and `undoRedoButtons()`, each an opt-in toolbar control from its own subpath.
- **Virtualization** (`virtualize(...)`) — opt-in row/card windowing for very large lists.
- **Pagination** — numbered `Pagination`, or infinite scroll (auto by device).
- **SSR & server components** — renders with no DOM; the client boundary is already in the build, so it drops straight into the Next.js App Router. [Docs](https://adapttable.orwamahmoud.com/react/ssr-rsc/).
- **States** — `Skeleton` loading, error with retry, and an empty state.
- **RTL** via `dir`; **dark mode** via Mantine's color scheme.
- **Customisation** — `slots`, `classNames`, custom `toolbar`, injectable `confirm`, optional entrance animation (`animate`, honours `prefers-reduced-motion`), and the full headless escape hatch via `@adapttable/react`.

## See it work

Each clip is the real adapter, recorded on the live demo.

**Row grouping** — group rows by a column with per-group subtotals

![mantine Row grouping](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![mantine Inline cell editing](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![mantine Filtering](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![mantine Column management](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/column-management.gif)

**RTL / Arabic** — the whole table mirrors, not just the text

![mantine RTL / Arabic](https://adapttable.orwamahmoud.com/media/adapters/mantine/parts/rtl.gif)

## Documentation

[Getting started](https://adapttable.orwamahmoud.com/react/getting-started/) · [Live demo](https://adapttable.orwamahmoud.com/react/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://adapttable.orwamahmoud.com/react/comparison/)

- **Data** — [client vs server tiers](https://adapttable.orwamahmoud.com/data-tiers/) · [pagination & infinite scroll](https://adapttable.orwamahmoud.com/react/pagination/) · [URL-synced state](https://adapttable.orwamahmoud.com/react/url-state/)
- **Interaction** — [filtering](https://adapttable.orwamahmoud.com/react/filtering/) · [sorting](https://adapttable.orwamahmoud.com/react/sorting/) · [selection & bulk actions](https://adapttable.orwamahmoud.com/react/selection/) · [row expansion](https://adapttable.orwamahmoud.com/react/row-expansion/) · [inline cell editing](https://adapttable.orwamahmoud.com/react/cell-editing/)
- **Columns** — [show/hide · reorder · pin · resize](https://adapttable.orwamahmoud.com/react/column-management/) · [row grouping & aggregates](https://adapttable.orwamahmoud.com/react/row-grouping/) · [CSV export](https://adapttable.orwamahmoud.com/react/customization/#csv-export)
- **More** — [i18n & RTL](https://adapttable.orwamahmoud.com/react/i18n-rtl/) · [virtualization](https://adapttable.orwamahmoud.com/react/virtualization/) · [customization](https://adapttable.orwamahmoud.com/react/customization/) · [API](https://adapttable.orwamahmoud.com/react/api/) · [FAQ](https://adapttable.orwamahmoud.com/faq/)

## License

[MIT](../../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
