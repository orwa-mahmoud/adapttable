# @adapttable/core

[![AdaptTable — one headless engine: the same table re-rendered through Mantine, MUI, Chakra, Ant Design, Radix, shadcn, and Tailwind](https://adapttable.orwamahmoud.com/media/core/tour.gif)](https://adapttable.orwamahmoud.com/react/demo/)

**[📖 Documentation](https://adapttable.orwamahmoud.com/)** · **[🚀 Live demo](https://adapttable.orwamahmoud.com/react/demo/)** · **[Get started](https://adapttable.orwamahmoud.com/react/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from TanStack Table? See the [migration guide](https://adapttable.orwamahmoud.com/react/migrate-from-tanstack-table/)._

The **framework-neutral engine** behind [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
state, models, query codecs and the unified client/server `TableSource`
contract, with no React or UI-kit imports in its graph.

```bash
pnpm add @adapttable/core
```

You usually want a styled adapter on top (`@adapttable/mantine`,
`@adapttable/mui`, `@adapttable/chakra`, `@adapttable/unstyled`). Reach for
`@adapttable/react` when you want hooks and prop-getters to render your own
markup.

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

## Features

Core supplies the state, data transforms and contracts behind the complete
table surface below. React hooks, keyboard wiring and rendered controls live
in `@adapttable/react` and the kit adapters.

- **Automatic mobile cards** — core preserves one row/state model while the
  React and adapter layers render cards below the mobile breakpoint. [Docs](https://adapttable.orwamahmoud.com/react/mobile/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **Global search** — the committed term, its `q` URL param and the default searchable-text projection (`engineSearchText`); adapters render the search box.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Pagination** — paged or infinite scroll via `paginationMode`; server sources
  report their own totals, client sources derive them.
- **SSR & server components** — the engine has no DOM dependency; the React
  binding supplies the client boundary for the Next.js App Router.
  [Docs](https://adapttable.orwamahmoud.com/react/ssr-rsc/).
- **A React-free half** (`@adapttable/core/query`) — the filter-tree and pivot
  URL codecs on their own, so a route handler can decode a shared link in a
  process with no React installed.
- **Sorting** — comparator resolution and multi-key `sortValue`; React turns
  the result into accessible header state.
- **Filtering** — filter model, operators and counts, including a nested AND/OR
  filter tree; adapters render the forms and chips.
- **Header filters** — the filter chrome model behind `headerFilters()`; adapters draw the header funnel.
- **Custom filter types** — the `FilterTypeSpec` registry behind `FILTER_TYPES`: widget, operators, predicate, chips and URL params per type.
- **Selection + bulk actions** — selected ids and the bulk-action contract;
  adapters render tri-state controls and dialogs.
- **Row actions** — contracts for visibility, disabled state and confirmation;
  adapters own the controls.
- **Row expansion** — state behind the React binding's `rowDetail(...)` feature.
- **Nested tables** — the React layer's `nestedTable(...)` renders a full kit `DataTable` inside an expanded row.
- **Inline cell editing** — state behind `editing(handler)` and `editable` columns; text, number and select
  editors, keyboard commit/cancel, Tab advance. Omit the handler and no cell opens.
- **Row reordering** — `rowReorder(handler)`; Space-lift keyboard, dataset-relative indices.
- **Row pinning** — `rowPinning(...)`; sticky top and bottom rows.
- **Pinned summary rows** — `pinnedSummaryRows({ top, bottom })`; host-owned totals outside the row model.
- **Row and column spanning** — the model behind `cellSpan(...)`.
- **Full-width and separator rows** — `extraRows`.
- **Row styling and heights** — the model behind `rowAppearance(...)`.
- **Keyboard cell navigation** — core state supports the React layer's
  `cellNavigation()` feature, which adds ARIA grid semantics, arrow-key
  movement and screen-reader announcements.
- **Row grouping** — model support for `grouping(...)` and `groupingPanel(...)`.
- **Aggregation** — `aggregate()`, `aggregatable` column operations and the aggregation model behind footer and group totals, including custom operations.
- **Pivot tables** — rows, columns and measures with subtotals and collapsible
  groups, from the optional `@adapttable/core/pivot` entry.
- **Tree data** — the hierarchy model behind `tree(...)`.
- **Column management** — show/hide, reorder, pin (sticky) and resize state, plus collapsible column groups.
- **Sparkline columns** — the React layer's `@adapttable/react/sparkline`
  renders bar, line and area charts as inline SVG.
- **PDF export and print layout** (`@adapttable/core/pdf`) — optional entry; `pdfWriter()` on `exportCsv`, `printTable` for the browser dialog.
- **Formula engine** (`@adapttable/core/formula`) — spreadsheet formulas over rows and aggregates; circular refs report `#CYCLE!`.
- **Live row patches** (`@adapttable/core/stream`) — wire parsing and socket
  connection without React; `useRowPatchStream` lives at `@adapttable/react/stream`.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **Feature composition foundations** — framework-neutral state and contracts power the
  factories exposed by `@adapttable/react/features` and each kit subpath.
  Host plugins use the same `TableFeature` / `setup(host)` surface.
- **CSV export** (`exportCsv(...)`) — current page, the full filtered set, or the
  selected rows; choose the columns, or hand the whole thing to your backend.
- **XLSX export** (`@adapttable/core/xlsx`) — optional entry; `xlsxWriter()` on `exportCsv` writes a real `.xlsx` workbook with no extra dependency.
- **Command palette and context menus** — the `Command` / `ContextMenuItem` model and the built-in `tableCommands` / `filterCommands`; adapters render `commandPalette()` and `contextMenu()`.
- **View controls** — localized labels for density, fullscreen, print, status bar and side panel; the React layer and adapters own the toolbar controls.
- **Virtualization** (`virtualize(...)`) — row/card windowing for very large lists.
- **RTL** and i18n-agnostic labels — pass `labels` or a `t` function.
- **Framework-neutral** — no components, styling, React or UI-kit imports.

## See it work

One dataset, re-rendered by each adapter — these clips are the cross-kit tour.

**Row grouping** — group rows by a column with per-group subtotals

![row-grouping](https://adapttable.orwamahmoud.com/media/core/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![cell-editing](https://adapttable.orwamahmoud.com/media/core/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![filtering](https://adapttable.orwamahmoud.com/media/core/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![column-management](https://adapttable.orwamahmoud.com/media/core/parts/column-management.gif)

**RTL** — the whole table mirrors, not just the text

![rtl](https://adapttable.orwamahmoud.com/media/core/parts/rtl.gif)

## Documentation

[Getting started](https://adapttable.orwamahmoud.com/react/getting-started/) · [Live demo](https://adapttable.orwamahmoud.com/react/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://adapttable.orwamahmoud.com/react/comparison/)

- **Data** — [client vs server tiers](https://adapttable.orwamahmoud.com/data-tiers/) · [pagination & infinite scroll](https://adapttable.orwamahmoud.com/react/pagination/) · [URL-synced state](https://adapttable.orwamahmoud.com/react/url-state/)
- **Interaction** — [filtering](https://adapttable.orwamahmoud.com/react/filtering/) · [sorting](https://adapttable.orwamahmoud.com/react/sorting/) · [selection & bulk actions](https://adapttable.orwamahmoud.com/react/selection/) · [row expansion](https://adapttable.orwamahmoud.com/react/row-expansion/) · [inline cell editing](https://adapttable.orwamahmoud.com/react/cell-editing/) · [row reordering](https://adapttable.orwamahmoud.com/react/row-reordering/) · [row pinning](https://adapttable.orwamahmoud.com/react/row-pinning/) · [pinned summary rows](https://adapttable.orwamahmoud.com/react/pinned-summary-rows/) · [row and column spanning](https://adapttable.orwamahmoud.com/react/row-spanning/) · [full-width and separator rows](https://adapttable.orwamahmoud.com/react/full-width-rows/) · [row styling and heights](https://adapttable.orwamahmoud.com/react/row-styling/)
- **Columns** — [show/hide · reorder · pin · resize](https://adapttable.orwamahmoud.com/react/column-management/) · [sparkline columns](https://adapttable.orwamahmoud.com/react/sparkline/) · [row grouping & aggregates](https://adapttable.orwamahmoud.com/react/row-grouping/) · [CSV export](https://adapttable.orwamahmoud.com/react/customization/#csv-export)
- **More** — [i18n & RTL](https://adapttable.orwamahmoud.com/react/i18n-rtl/) · [virtualization](https://adapttable.orwamahmoud.com/react/virtualization/) · [customization](https://adapttable.orwamahmoud.com/react/customization/) · [API](https://adapttable.orwamahmoud.com/react/api/) · [FAQ](https://adapttable.orwamahmoud.com/faq/)

## License

[MIT](../../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
