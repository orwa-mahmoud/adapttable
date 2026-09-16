# @adapttable/core

[![AdaptTable — one headless engine: the same table re-rendered through Mantine, MUI, Chakra, Ant Design, Radix, shadcn, and Tailwind](https://orwa-mahmoud.github.io/adapttable/media/core/tour.gif)](https://orwa-mahmoud.github.io/adapttable/demo/)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from TanStack Table? See the [migration guide](https://orwa-mahmoud.github.io/adapttable/migrate-from-tanstack-table/)._

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
  React and adapter layers render cards below the mobile breakpoint. [Docs](https://orwa-mahmoud.github.io/adapttable/mobile/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Pagination** — paged or infinite scroll via `paginationMode`; server sources
  report their own totals, client sources derive them.
- **SSR & server components** — the engine has no DOM dependency; the React
  binding supplies the client boundary for the Next.js App Router.
  [Docs](https://orwa-mahmoud.github.io/adapttable/ssr-rsc/).
- **A React-free half** (`@adapttable/core/query`) — the filter-tree and pivot
  URL codecs on their own, so a route handler can decode a shared link in a
  process with no React installed.
- **Sorting** — comparator resolution and multi-key `sortValue`; React turns
  the result into accessible header state.
- **Filtering** — filter model, operators and counts, including a nested AND/OR
  filter tree; adapters render the forms and chips.
- **Selection + bulk actions** — selected ids and the bulk-action contract;
  adapters render tri-state controls and dialogs.
- **Row actions** — contracts for visibility, disabled state and confirmation;
  adapters own the controls.
- **Row expansion** — state behind the React binding's `rowDetail(...)` feature.
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
- **Virtualization** (`virtualize(...)`) — row/card windowing for very large lists.
- **RTL** and i18n-agnostic labels — pass `labels` or a `t` function.
- **Framework-neutral** — no components, styling, React or UI-kit imports.

## See it work

One dataset, re-rendered by each adapter — these clips are the cross-kit tour.

**Row grouping** — group rows by a column with per-group subtotals

![row-grouping](https://orwa-mahmoud.github.io/adapttable/media/core/parts/row-grouping.gif)

**Inline cell editing** — double-click a cell; text, number and select editors

![cell-editing](https://orwa-mahmoud.github.io/adapttable/media/core/parts/cell-editing.gif)

**Filtering** — type a bound and the table answers as you type

![filtering](https://orwa-mahmoud.github.io/adapttable/media/core/parts/filtering.gif)

**Column management** — show, hide, reorder, pin and resize

![column-management](https://orwa-mahmoud.github.io/adapttable/media/core/parts/column-management.gif)

**RTL** — the whole table mirrors, not just the text

![rtl](https://orwa-mahmoud.github.io/adapttable/media/core/parts/rtl.gif)

## Documentation

[Getting started](https://orwa-mahmoud.github.io/adapttable/getting-started/) · [Live demo](https://orwa-mahmoud.github.io/adapttable/demo/) · [Comparison vs ag-Grid · MUI X · TanStack](https://orwa-mahmoud.github.io/adapttable/comparison/)

- **Data** — [client vs server tiers](https://orwa-mahmoud.github.io/adapttable/data-tiers/) · [pagination & infinite scroll](https://orwa-mahmoud.github.io/adapttable/pagination/) · [URL-synced state](https://orwa-mahmoud.github.io/adapttable/url-state/)
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/) · [row reordering](https://orwa-mahmoud.github.io/adapttable/row-reordering/) · [row pinning](https://orwa-mahmoud.github.io/adapttable/row-pinning/) · [pinned summary rows](https://orwa-mahmoud.github.io/adapttable/pinned-summary-rows/) · [row and column spanning](https://orwa-mahmoud.github.io/adapttable/row-spanning/) · [full-width and separator rows](https://orwa-mahmoud.github.io/adapttable/full-width-rows/) · [row styling and heights](https://orwa-mahmoud.github.io/adapttable/row-styling/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [sparkline columns](https://orwa-mahmoud.github.io/adapttable/sparkline/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
