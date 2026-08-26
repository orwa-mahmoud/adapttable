# @adapttable/core

[![AdaptTable — one headless engine: the same table re-rendered through Mantine, MUI, Chakra, Ant Design, Radix, shadcn, and Tailwind](https://orwa-mahmoud.github.io/adapttable/media/core/tour.gif)](https://orwa-mahmoud.github.io/adapttable/demo/)

**[📖 Documentation](https://orwa-mahmoud.github.io/adapttable/)** · **[🚀 Live demo](https://orwa-mahmoud.github.io/adapttable/demo/)** · **[Get started](https://orwa-mahmoud.github.io/adapttable/getting-started/)** · **[⚡ Try in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine)**

_Migrating from TanStack Table? See the [migration guide](https://orwa-mahmoud.github.io/adapttable/migrate-from-tanstack-table/)._

The **headless engine** behind [AdaptTable](https://github.com/orwa-mahmoud/adapttable) —
a UI-agnostic React data table. Zero UI-kit imports: state, hooks,
prop-getters, and a unified client/server `TableSource` contract.

```bash
pnpm add @adapttable/core react
```

You usually want a styled adapter on top (`@adapttable/mantine`,
`@adapttable/mui`, `@adapttable/chakra`, `@adapttable/unstyled`). Reach for
`@adapttable/core` directly when you want to render your own markup with full
control via prop-getters.

## Features

- **Automatic mobile cards** — the engine resolves the layout by viewport and every adapter renders rows as cards below the mobile breakpoint, state intact; `forceMobile`, `mobileLabel` and `hideOnMobile` tune it. [Docs](https://orwa-mahmoud.github.io/adapttable/mobile/).
- **Client or server data** through one `TableSource` contract — same props either way.
- **URL-synced** search / sort / filters / page — shareable, deep-linkable links.
- **Pagination** — paged or infinite scroll via `paginationMode`; server sources
  report their own totals, client sources derive them.
- **SSR & server components** — renders with no DOM; the client boundary is
  already in the build, so it drops straight into the Next.js App Router.
  [Docs](https://orwa-mahmoud.github.io/adapttable/ssr-rsc/).
- **A React-free half** (`@adapttable/core/query`) — the filter-tree and pivot
  URL codecs on their own, so a route handler can decode a shared link in a
  process with no React installed.
- **Sorting** — comparator resolution, multi-key `sortValue`, accessible header state.
- **Filtering** — filter model, operators, chips and counts; bring your own predicate. Nested AND/OR filter tree.
- **Selection + bulk actions** — ids, tri-state select-all, and the bulk-action contract.
- **Row actions** with optional confirm, `isHidden` / `isDisabled` per row.
- **Row expansion** — detail-panel state via `renderRowDetail`.
- **Inline cell editing** — `onCellEdit` plus `editable` columns; text, number and select
  editors, keyboard commit/cancel, Tab advance. Omit the handler and no cell opens.
- **Row reordering** — `onRowReorder`; Space-lift keyboard, dataset-relative indices.
- **Row pinning** — `pinnedRowIds` / `onPinnedRowIdsChange`; sticky top and bottom rows.
- **Row and column spanning** — `getCellSpan` / `column.colSpan` / `column.rowSpan`.
- **Full-width and separator rows** — `extraRows`.
- **Row styling and heights** — `rowStyle`, `rowHeight`.
  Grouping and trees refuse it. Omit the handler and no handle renders.
- **Keyboard cell navigation** (`cellNavigation`) — one tab stop, arrow keys,
  ARIA grid semantics and screen-reader announcements.
- **Row grouping** — `groupBy` with per-group aggregates sharing the `summaryRow` mapper.
- **Pivot tables** — rows, columns and measures with subtotals and collapsible
  groups, from the optional `@adapttable/core/pivot` entry.
- **Tree data** — `getChildren` / `getParentId`, hierarchical rows with their own expansion state.
- **Column management** — show/hide, reorder, pin (sticky) and resize state, plus collapsible column groups.
- **Sparkline columns** — `@adapttable/core/sparkline`; bar, line and area as inline SVG.
- **PDF export and print layout** (`@adapttable/core/pdf`) — optional entry; `pdfWriter()` on `exportCsv`, `printTable` for the browser dialog.
- **Formula engine** (`@adapttable/core/formula`) — spreadsheet formulas over rows and aggregates; circular refs report `#CYCLE!`.
- **Live row patches** (`@adapttable/core/stream`) — `useRowPatchStream` binds a WebSocket or SSE to the rows you already own.
- **Saved views** — name a filter/sort/column arrangement and switch between them.
- **Feature composition** (`features={[rowReorder(fn)]}`) from `@adapttable/core/features` or a kit subpath. Host plugins use the same `TableFeature` / `setup(host)` surface. Enabling props still work until v3; no bundle saving yet.
- **CSV export** (`exportCsv`) — current page, the full filtered set, or the
  selected rows; choose the columns, or hand the whole thing to your backend.
- **Virtualization** (`virtualize`) — row/card windowing for very large lists.
- **RTL** and i18n-agnostic labels — pass `labels` or a `t` function.
- **Headless** — hooks and prop-getters only. No components, no styling, no UI-kit imports.

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
- **Interaction** — [filtering](https://orwa-mahmoud.github.io/adapttable/filtering/) · [sorting](https://orwa-mahmoud.github.io/adapttable/sorting/) · [selection & bulk actions](https://orwa-mahmoud.github.io/adapttable/selection/) · [row expansion](https://orwa-mahmoud.github.io/adapttable/row-expansion/) · [inline cell editing](https://orwa-mahmoud.github.io/adapttable/cell-editing/) · [row reordering](https://orwa-mahmoud.github.io/adapttable/row-reordering/) · [row pinning](https://orwa-mahmoud.github.io/adapttable/row-pinning/) · [row and column spanning](https://orwa-mahmoud.github.io/adapttable/row-spanning/) · [full-width and separator rows](https://orwa-mahmoud.github.io/adapttable/full-width-rows/) · [row styling and heights](https://orwa-mahmoud.github.io/adapttable/row-styling/)
- **Columns** — [show/hide · reorder · pin · resize](https://orwa-mahmoud.github.io/adapttable/column-management/) · [sparkline columns](https://orwa-mahmoud.github.io/adapttable/sparkline/) · [row grouping & aggregates](https://orwa-mahmoud.github.io/adapttable/row-grouping/) · [CSV export](https://orwa-mahmoud.github.io/adapttable/customization/#csv-export)
- **More** — [i18n & RTL](https://orwa-mahmoud.github.io/adapttable/i18n-rtl/) · [virtualization](https://orwa-mahmoud.github.io/adapttable/virtualization/) · [customization](https://orwa-mahmoud.github.io/adapttable/customization/) · [API](https://orwa-mahmoud.github.io/adapttable/api/) · [FAQ](https://orwa-mahmoud.github.io/adapttable/faq/)

## License

[MIT](../../LICENSE) © [Orwa Mahmoud](https://orwamahmoud.com)
