# AdaptTable API reference — DataTable, columns, hooks

The complete public surface. Every symbol ships full TypeScript types and
JSDoc, so editor autocomplete mirrors everything below.

## `<DataTable>` props

Every adapter (`@adapttable/mantine`, `mui`, `chakra`, `antd`, `radix`, `base-ui`, `shadcn`, `unstyled`)
exports `DataTable<TRow>`. The props below are the shared core surface
(`BaseDataTableProps`); kit-specific extras follow in
[Adapter extras](#adapter-extras).

### Data

| Prop     | Type                    | Default | Description                                                                                                              |
| -------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `source` | `TableSource<TRow>`     | —       | Data + state contract from `useFrontendData` / `useQuerySource`; adapters make it optional when you pass `data` instead. |
| `rowKey` | `(row: TRow) => string` | —       | Stable React key extractor for a row (required).                                                                         |

### Columns & layout

| Prop                    | Type                                | Default | Description                                                                                        |
| ----------------------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `columns`               | `ColumnDef<TRow>[]`                 | —       | Column definitions (required) — see [ColumnDef](#columndef).                                       |
| `enableColumnMenu`      | `boolean`                           | `false` | Render the built-in "Columns" menu (show/hide, pin, reorder).                                      |
| `resizableColumns`      | `boolean`                           | `false` | Enable drag/keyboard column-resize handles.                                                        |
| `columnLayout`          | `ColumnLayoutState`                 | —       | Controlled column layout (hidden/order/pinned/widths).                                             |
| `onColumnLayoutChange`  | `(next: ColumnLayoutState) => void` | —       | Change handler for the controlled column layout.                                                   |
| `defaultColumnLayout`   | `Partial<ColumnLayoutState>`        | —       | Initial column layout for the uncontrolled mode.                                                   |
| `maxHeight`             | `number`                            | —       | Fixed-height scroll box (px) enabling sideways scrolling + column pinning; omit for page scroll.   |
| `multiSort`             | `boolean`                           | `false` | Shift-click (or shift-Enter) on a header adds the column to the sort chain (asc → desc → removed). |
| `sortByOptions`         | `SortByOption[]`                    | —       | Options for a mobile sort-by select.                                                               |
| `mobileIdentityColumns` | `number`                            | `3`     | Leading desktop-visible columns kept on mobile even if `hideOnMobile`.                             |

### Filters & search

| Prop                | Type                                | Default     | Description                                                                                                                                                    |
| ------------------- | ----------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`           | `FilterDef<TRow>[] \| ReactNode`    | —           | Declarative array (the adapter builds the form) or JSX (you draw it); column `filter` shorthands merge in, a same-key `filters` entry wins.                    |
| `filtersMode`       | `"popover" \| "drawer"`             | `"popover"` | Popover anchors a light card under the Filters button (no backdrop); drawer slides in a side panel with one.                                                   |
| `filterLabels`      | `Record<string, ChipLabelResolver>` | —           | Per-filter-key chip label resolvers. Declarative `filters` derive them automatically; needed only for hand-drawn JSX filters (or to override a derived label). |
| `extraChips`        | `ActiveFilterChip[]`                | —           | Extra chips driven by non-URL state, merged with the derived chips.                                                                                            |
| `activeFilterCount` | `number`                            | chip count  | Override the active-filter count badge.                                                                                                                        |
| `onClearFilters`    | `() => void`                        | —           | Clear-filters handler used by the panel + chip strip (built-in `clearExtras` fallback otherwise).                                                              |
| `searchable`        | `boolean`                           | `true`      | Render the built-in search box; pass `false` to hide it.                                                                                                       |
| `searchPlaceholder` | `string`                            | —           | Placeholder for the search input.                                                                                                                              |

### Selection & actions

| Prop                | Type                              | Default          | Description                                                                                                                                                                                                    |
| ------------------- | --------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowActions`        | `RowAction<TRow>[]`               | —                | Trailing per-row actions (icon buttons on desktop, card buttons on mobile).                                                                                                                                    |
| `bulkActions`       | `BulkAction[]`                    | —                | Bulk actions — providing these turns on row selection.                                                                                                                                                         |
| `selectionGetId`    | `(row: TRow) => string`           | `rowKey`         | Selection id extractor when it must differ from `rowKey`.                                                                                                                                                      |
| `selectedIds`       | `readonly string[]`               | —                | Controlled selection; apply `onSelectionChange` requests to your own state.                                                                                                                                    |
| `onSelectionChange` | `(selectedIds: string[]) => void` | —                | Selection observer (uncontrolled) or change-request handler (controlled).                                                                                                                                      |
| `confirm`           | `ConfirmHandler`                  | `window.confirm` | Confirmation handler for actions that declare a `confirm` block. Where no dialog exists (SSR, some webviews), the default DENIES the action and dev-warns — pass your own handler for dialogless environments. |

### Appearance & chrome

| Prop                        | Type                                                            | Default         | Description                                                                                                                                                                                                                                |
| --------------------------- | --------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tableLabel`                | `string`                                                        | —               | Accessible label for the table.                                                                                                                                                                                                            |
| `labels`                    | `TableLabels`                                                   | English         | Pre-translated label overrides; missing keys fall back to English defaults.                                                                                                                                                                |
| `dir`                       | `"ltr" \| "rtl"`                                                | `"ltr"`         | Text direction.                                                                                                                                                                                                                            |
| `locale`                    | `string`                                                        | —               | Active locale tag (e.g. `"ar"`, `"ar-EG"`) driving per-column `i18n` data-path resolution.                                                                                                                                                 |
| `density`                   | `"comfortable" \| "compact"`                                    | `"comfortable"` | Row density; each adapter maps it to its kit's table size.                                                                                                                                                                                 |
| `forceMobile`               | `boolean`                                                       | viewport        | Force the mobile layout instead of resolving from the viewport.                                                                                                                                                                            |
| `toolbar`                   | `ReactNode`                                                     | —               | Inline toolbar slot for custom controls (view toggles, etc.).                                                                                                                                                                              |
| `exportCsv`                 | `boolean \| { filename?: string; scope?: "page" \| "all" }`     | `false`         | Opt-in Export CSV toolbar button. `true` → `export.csv` + current page; `scope: "all"` uses the full filtered set when the source provides it — server sources without `allFilteredRows` fall back to the current page with a dev warning. |
| `error`                     | `Error \| null`                                                 | `null`          | Forwarded error to display in the table's error state (retry via the source's `refetch`).                                                                                                                                                  |
| `skeletonRows`              | `number`                                                        | page size       | Number of skeleton rows while loading.                                                                                                                                                                                                     |
| `stickyHeader`              | `boolean`                                                       | `false`         | Keep the desktop table header sticky while scrolling.                                                                                                                                                                                      |
| `stickyTop`                 | `number`                                                        | `0`             | Sticky toolbar top offset in px (for app headers above the table).                                                                                                                                                                         |
| `scrollToTopOnChange`       | `boolean`                                                       | `true`          | Scroll back to the table when search/filter/page changes.                                                                                                                                                                                  |
| `scrollTopGap`              | `number`                                                        | `8`             | Extra gap below sticky chrome when scrolling back.                                                                                                                                                                                         |
| `rowClassName`              | `(row: TRow, index: number) => string \| undefined`             | —               | Conditional per-row class, appended on desktop rows and mobile cards alike.                                                                                                                                                                |
| `renderRowDetail`           | `(row: TRow) => ReactNode`                                      | —               | Row expansion: its presence enables the expand chevron; multiple rows may be open, keyed by row id.                                                                                                                                        |
| `onCellEdit`                | `(row: TRow, key: string, nextValue: unknown) => void`          | —               | Inline cell editing: its presence enables editors on columns with `editable`; the table never mutates rows — your handler applies the change.                                                                                              |
| `summaryRow`                | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —               | Map the current page's rows to per-column footer summary cells.                                                                                                                                                                            |
| `groupBy`                   | `string \| null`                                                | —               | Single-level row grouping by column key; frontend tier only (server sources devWarn and ignore). Omit and grouping stays dormant.                                                                                                          |
| `onGroupByChange`           | `(groupBy: string \| null) => void`                             | —               | Controlled `groupBy` channel; falls back to `source.setGroupBy`. URL-synced when the source uses URL state.                                                                                                                                |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —               | Per-group aggregate cells — **same signature as `summaryRow`**. Called with each group's leaf rows.                                                                                                                                        |
| `collapsedGroupIds`         | `readonly string[]`                                             | —               | Controlled collapsed group keys (ephemeral — not URL-synced).                                                                                                                                                                              |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —               | Controlled collapse channel; uncontrolled mode uses internal state.                                                                                                                                                                        |

### Virtualization

| Prop                  | Type      | Default | Description                                                            |
| --------------------- | --------- | ------- | ---------------------------------------------------------------------- |
| `virtualize`          | `boolean` | `false` | Virtualize long infinite lists.                                        |
| `estimateRowSize`     | `number`  | `56`    | Desktop row-size estimate in px.                                       |
| `estimateCardSize`    | `number`  | `132`   | Mobile card-size estimate in px.                                       |
| `virtualOverscan`     | `number`  | `8`     | Extra rows/cards rendered before and after the virtual window.         |
| `virtualScrollMargin` | `number`  | `0`     | Scroll margin for window virtualization, usually sticky chrome height. |

### URL & persistence

URL props (`urlSync`, `urlKey`, `urlAdapter`, `savedViews`) and the `data` /
`onQueryChange` tiers live on the adapter components, not the core prop
surface — see [Adapter extras](#adapter-extras) and
[URL-synced state](./url-state.md).

### Callbacks

| Prop           | Type                              | Default | Description                                                                                        |
| -------------- | --------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `onRowClick`   | `(row: TRow) => void`             | —       | Row activation on click/Enter; interactive children (actions, checkboxes, links) never trigger it. |
| `onRowsChange` | `(rows: readonly TRow[]) => void` | —       | Called whenever the materialized source rows change.                                               |
| `prefetch`     | `(row: TRow) => void`             | —       | Hover-prefetch callback fired on desktop row mouse-enter.                                          |

## ColumnDef

| Prop            | Type                                                | Default       | Description                                                                                                                                             |
| --------------- | --------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`           | `string`                                            | —             | Unique id (required); also the backend `sortBy` value and — absent `accessor`/`Cell` — the row's dot-path for the cell value.                           |
| `header`        | `ReactNode`                                         | humanized key | Header content; omit it and the header derives from `key` (`"hiredAt"` → "Hired At").                                                                   |
| `group`         | `string`                                            | —             | Presentational header group: contiguous same-group columns render under one spanning header cell.                                                       |
| `i18n`          | `Record<string, string>`                            | —             | Per-locale data paths for the column's value (`{ key: "nameEn", i18n: { ar: "nameAr" } }`); cell, client-side sort and filter follow the resolved path. |
| `filter`        | `ColumnFilter<TRow>`                                | —             | Declarative filter for this column: a bare type (`"dateRange"`) or a definition without `key`/`label`.                                                  |
| `Cell`          | `ComponentType<CellProps<TRow>>`                    | —             | Component rendered per row (receives `{ row, rowIndex }`); define at module level so its identity is stable.                                            |
| `accessor`      | `(row: TRow) => ReactNode`                          | —             | Lightweight alternative to `Cell`; returns cell content.                                                                                                |
| `sortValue`     | `(row: TRow) => SortableValue`                      | —             | Primitive extractor used by the client-side sort comparator; unused for server-sorted data.                                                             |
| `sortable`      | `boolean`                                           | `false`       | Enable sorting for this column.                                                                                                                         |
| `width`         | `number \| string`                                  | —             | Column width passed through to the rendered header/cell.                                                                                                |
| `align`         | `"start" \| "center" \| "end"`                      | `"start"`     | Text alignment within the cell.                                                                                                                         |
| `mobileLabel`   | `string`                                            | `header`      | Label used on mobile card layouts; falls back to a string `header`.                                                                                     |
| `hideOnMobile`  | `boolean`                                           | `false`       | Hide this column entirely on mobile layouts.                                                                                                            |
| `hideOnDesktop` | `boolean`                                           | `false`       | Hide this column entirely on desktop layouts.                                                                                                           |
| `editable`      | `boolean \| ((row: TRow) => boolean)`               | —             | Opt-in cell editing for this column (still requires table-level `onCellEdit`; omit both and nothing changes).                                           |
| `editor`        | `"text" \| "number" \| { type: "select"; options }` | `"text"`      | Widget for the active cell when `editable` is set.                                                                                                      |
| `editValue`     | `(row: TRow) => string`                             | —             | Draft seed when display formatting differs from the value you want to edit.                                                                             |
| `meta`          | `Record<string, unknown>`                           | —             | Arbitrary metadata adapters (or your own code) may read back.                                                                                           |

## FilterDef

| Prop          | Type                     | Default         | Description                                                                                                                           |
| ------------- | ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `key`         | `string`                 | —               | State key in the filter bag and the `f_<key>` URL param (required); doubles as the row's dot-path for the client-side predicate.      |
| `type`        | `FilterType`             | —               | The widget shape (required): `"text" \| "select" \| "multiSelect" \| "dateRange" \| "numberRange"`.                                   |
| `label`       | `string`                 | humanized `key` | Widget + chip label.                                                                                                                  |
| `options`     | `FilterOptionsSource`    | —               | Choices for `select`/`multiSelect`: a static `FilterOption[]`, `"auto"` (distinct frontend values, capped at 50), or an async loader. |
| `getValue`    | `(row: TRow) => unknown` | `key` as path   | Row-value extractor for the client-side predicate.                                                                                    |
| `placeholder` | `string`                 | —               | Placeholder for text-like inputs.                                                                                                     |

Range types persist two inclusive state keys: `dateRange` →
`${key}From`/`${key}To`, `numberRange` → `${key}Min`/`${key}Max`. The range
widgets are operator-first (Equal / At least / At most / Between; dates: On /
On or after / On or before / Between) — headless: `readRangeWidget`,
`writeRangeWidget`, `RANGE_OPS`.

## Adapter extras

Props beyond the core surface, with per-kit availability.

| Prop            | Type                                            | Default     | Available on                              | Description                                                                                                                                                                             |
| --------------- | ----------------------------------------------- | ----------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`          | `readonly TRow[]`                               | —           | all                                       | Frontend tier: raw rows the table filters/sorts/pages; with `onQueryChange` it is the current server page.                                                                              |
| `total`         | `number`                                        | —           | all                                       | Server tier: total row count across all pages (drives the pager).                                                                                                                       |
| `loading`       | `boolean`                                       | —           | all                                       | Server tier: a request is in flight.                                                                                                                                                    |
| `onQueryChange` | `(query: TableQuery, info: { signal }) => void` | —           | all                                       | Server tier: fired with the consolidated query whenever it changes (mount included); fetch and hand back `data` + `total`.                                                              |
| `urlKey`        | `string`                                        | —           | all                                       | Namespace for this table's URL params (`urlKey="left"` → `left.q`, `left.page`, …).                                                                                                     |
| `urlAdapter`    | `UrlStateAdapter`                               | History API | all                                       | URL-state backend for the `data`/`onQueryChange` tiers (router adapter, `createMemoryAdapter()` in tests).                                                                              |
| `urlSync`       | `boolean`                                       | `true`      | all                                       | `false` keeps all state in memory — the address bar never changes, any `urlAdapter` is ignored.                                                                                         |
| `savedViews`    | `UseSavedViewsOptions`                          | —           | all                                       | Mounts a saved-views toolbar menu; `adapter`/`urlKey` default to the table's own, so usually only `storageKey` is needed.                                                               |
| `slots`         | `{ skeleton?, empty? }`                         | —           | all                                       | Replace sub-components (loading skeleton, empty state).                                                                                                                                 |
| `classNames`    | `DataTableClassNames`                           | —           | mantine, chakra, radix, base-ui, unstyled | Per-part class overrides — five parts on Mantine/Chakra/Radix/Base UI (`root`/`toolbar`/`table`/`card`/`footer`), every part on unstyled.                                               |
| `className`     | `string`                                        | —           | mui, antd                                 | Class name applied to the root wrapper.                                                                                                                                                 |
| `animate`       | `boolean`                                       | `false`     | all                                       | Animate rows/cards on mount (dependency-free; honors reduced motion).                                                                                                                   |
| `size`          | kit-specific union                              | —           | mui, chakra, antd, radix                  | Explicit kit table size, overriding the density mapping (comfortable/compact → chakra `"md"`/`"sm"`, radix & base-ui `"2"`/`"1"`, mui `"medium"`/`"small"`, antd `"middle"`/`"small"`). |
| `colorScheme`   | `string`                                        | —           | chakra                                    | Chakra color scheme for primary accents (buttons, badges).                                                                                                                              |
| `accentColor`   | kit accent union                                | —           | radix, base-ui                            | Accent color for primary controls (buttons, badges, active page).                                                                                                                       |
| `bordered`      | `boolean`                                       | `false`     | antd                                      | Render the table with cell borders.                                                                                                                                                     |
| `emptyState`    | `ReactNode`                                     | —           | unstyled                                  | Empty-state node override (`slots.empty` alias wins when both are set).                                                                                                                 |
| `loadingState`  | `ReactNode`                                     | —           | unstyled                                  | Loading-state node override (`slots.skeleton` alias wins when both are set).                                                                                                            |

Each adapter also re-exports the core source builders and types, so one
import path covers everything.

## Headless hooks

All from `@adapttable/core`.

### Data sources

- `useFrontendData<TRow>(options): TableSource<TRow>` — in-memory source:
  filters, sorts, and slices a raw array from URL state.
- `useQuerySource<TRow, TParams, TPage>(options): TableSource<TRow>` — wraps
  your `useInfiniteQuery`-style hook into the same contract.
- `useServerData<TRow>(options): TableSource<TRow>` — hand-rolled-fetch
  server tier: emits one consolidated `TableQuery` per change, aborting
  superseded requests via `AbortSignal`.
- `useTableData<TRow>(options): { source, runtime }` — tier resolution
  (source ▸ server ▸ frontend) plus the declarative filter runtime; what
  every adapter calls internally.

### URL state & persistence

- `useTableUrlState(options?): UseTableUrlStateResult` — page / limit /
  search / sort / extra-filter bag in the query string, with setters
  (`setPage`, `setSearch`, `setSort`, `toggleSortLevel`, `setExtra`,
  `setExtras`, `clearExtras`, `clearAll`).
- `useColumnLayoutUrlState(options?): { layout, onLayoutChange }` —
  URL-persisted column layout (hidden / order / pinned / widths).
- `useColumnLayoutStorageState(options): { layout, onLayoutChange }` — the
  localStorage counterpart (user preference rather than shareable link).
- `useSavedViews(options): { views, save, apply, remove }` — named snapshots
  of this table's URL params, persisted to storage.
- `createHistoryAdapter()` / `createMemoryAdapter(initial?)` /
  `getHistoryAdapter()` → `UrlStateAdapter`.

### Rendering & orchestration

- `useDataTable<TRow>(options): UseDataTableResult<TRow>` — derived state +
  prop-getters: `getTableProps`, `getHeaderRowProps`, `getHeaderCellProps`,
  `getSortButtonProps`, `getRowProps`, `getCellProps`,
  `getSearchInputProps`.
- `useTableChrome<TRow>(props): TableChrome<TRow>` — shared adapter
  orchestration: layout, confirm, chips, body region (`emptyVariant`,
  `isRefreshing`), `clearFilters`, footer.
- `useChromeBodyData(chrome, props): ChromeBodyData<TRow>` — body data-flow
  wiring: window virtualization + the infinite-scroll sentinel.
- `useColumnLayout(options): UseColumnLayoutResult<TRow>` — headless
  visibility / order / pinning / width state (`visibleColumns`,
  `toggleVisible`, `move`, `setPinned`, `setWidth`, `pinOffset`, `reset`).
- `useSearchInput(...)` — debounced search-input state behind
  `getSearchInputProps`.
- `useSelection(options): SelectionState` — page-scoped selection with
  select-all and cross-page "all matching".
- `useRowExpansion(): RowExpansionState` — multi-open row expansion keyed by
  row id.
- `useActiveFilterChips(options)` / `useExtraChips(options)` — removable
  chips from URL filter state / from non-URL state.
- `useFilterOptions(def): { options, loading }` — resolves static, `"auto"`,
  and async filter-option sources for custom forms.
- `useBulkActionRunner(options): BulkActionRunner` — runs bulk actions
  through the confirm handler.
- `useColumnDragState()` — drag-reorder state for custom column menus.
- `useHorizontalOverflow()` — scroll-overflow detection for pinned-column
  affordances.
- `useFilterTriggerToggle()` / `useChromeScrollReset()` — filter-trigger
  open state / scroll reset on query change.

### Utilities

- `useTableVirtualization(options): TableVirtualization` — headless row/card
  windowing: page scroll by default, element scroll inside a `maxHeight` box.
- `useInfiniteScroll(options)` — IntersectionObserver sentinel ref that
  auto-loads the next page in infinite mode.
- `useScrollToTableTop(options)` — sticky-chrome-aware scroll restoration.
- `useDebounce(value, ms)`, `useMediaQuery(query)`, `useIsMobile()`,
  `usePrefersReducedMotion()`, `useColorScheme(preference)`.

Notable non-hook helpers: `rowsToCsv` / `downloadCsv` / `downloadTableCsv`
(CSV export — or pass `exportCsv` on `<DataTable>` for a built-in button),
`sortRows` / `sortRowsMulti` / `compareValues` / `nextSort`,
`computePagination`, `headerGroupRow`, `columnMenuRows` +
`columnRowDragProps` / `columnDropProps` / `columnReorderKeyProps` /
`columnResizeHandleProps` (RTL-aware), `pinnedCellStyle` / `edgePinStyle` /
`PIN_Z`, `tableMinWidth` / `resolveColumnWidth` / `parsePxWidth`,
`rowClickProps`, `resolveFilterDefs` / `buildFilterRuntime` /
`filterPredicate` / `materializeAutoOptions` / `clearedFilterExtras`,
`mergeProps`, `stableKey`, `getPath`, `humanizeKey`, `resolveLabels` /
`defaultLabels`, `pageSizeOptions`, and the constants `DEFAULT_LIMIT` (25),
`PAGE_SIZE_OPTIONS`, `SEARCH_DEBOUNCE_MS` (300), `AUTO_OPTIONS_LIMIT` (50),
`ACTIONS_COLUMN_KEY` (`"actions"`).

## Types

| Type                                                                | What it is                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `TableSource<TRow>`                                                 | The uniform data + state contract a table consumes (rows, total, loading flags, state read/write).           |
| `TableQuery`                                                        | The consolidated server-tier query: `page`, `limit`, `search`, `sortBy`, `sortDir`, `sortLevels`, `filters`. |
| `TableQueryParams`                                                  | Baseline query params a backend list endpoint receives.                                                      |
| `PaginatedResponse<TRow>`                                           | Standard envelope: `items`, `total`, `page`, `limit`, `hasNext`.                                             |
| `ColumnLayoutState`                                                 | `{ hidden, order, pinned, widths }` — the column-layout shape.                                               |
| `TableLabels`                                                       | Every string the table renders; all keys optional, English defaults fill gaps.                               |
| `RowAction<TRow>` / `BulkAction`                                    | Action definitions with `disabledReason`, `isHidden`, optional `confirm` wiring.                             |
| `BulkActionContext`                                                 | `{ allMatching, total }` — scope handed to a bulk action handler.                                            |
| `ActionConfirm<TArg>`                                               | Confirmation dialog wiring (`title`, `message`, `confirmLabel`, `danger`).                                   |
| `ConfirmHandler` / `ConfirmRequest`                                 | The injectable confirmation seam (`(request) => void`).                                                      |
| `ActiveFilterChip` / `ChipLabelResolver`                            | One removable chip (`key`, `label`, `onRemove`) / value → chip-label function.                               |
| `UrlStateAdapter`                                                   | The router seam: `getSearch()`, `setSearch(search, { push? })`, `subscribe(onChange)`.                       |
| `SavedView`                                                         | `{ name, search }` — one captured view.                                                                      |
| `FilterDef` / `FilterType` / `FilterOption` / `FilterOptionsSource` | The declarative filter surface (see [FilterDef](#filterdef)).                                                |
| `CellProps<TRow>`                                                   | `{ row, rowIndex }` — what a `Cell` component receives.                                                      |
| `SortDirection` / `SortLevel`                                       | `"asc" \| "desc"` / one entry in the multi-sort chain.                                                       |
| `Direction`                                                         | `"ltr" \| "rtl"`.                                                                                            |
| `ColorScheme`                                                       | `"light" \| "dark" \| "auto"`.                                                                               |
| `PaginationMode`                                                    | `"infinite" \| "paged" \| "auto"` (`"auto"` resolves by viewport: mobile → infinite).                        |
| `FilterValue` / `ExtraFilters`                                      | One URL-round-tripped filter value / the keyed bag of them.                                                  |
| `SortableValue`                                                     | Comparable primitive returned by a sort-value extractor.                                                     |
| `SortByOption`                                                      | `{ value, label }` for the mobile sort-by select.                                                            |

## Development warnings

Misconfiguration warns once per message in development (silent in
production):

- no data tier, or both `source` and `data`/`onQueryChange` provided;
- duplicate column keys (sorting, selection, and column layout all target keys);
- unresolvable sorts (no matching column, or a non-primitive accessor without `sortValue`);
- a column `filter` whose key is also defined in the `filters` array (the array wins);
- `options: "auto"` on a tier with no full dataset, and async options that fail to load;
- two tables sharing a URL namespace without distinct `urlKey`s;
- `virtualize` combined with `renderRowDetail` (detail panels are unmeasured sibling rows).

## Companion types

Every documented hook and component exports its option/result/prop types
under predictable names — `useFoo` ships `UseFooOptions` (and
`UseFooResult` where the return type is named), a component `Foo` ships
`FooProps` — and each companion follows its owner's stability tier. The
full set: `UseDataTableOptions`, `UseFrontendDataOptions`,
`UseServerDataOptions`, `UseTableDataOptions` / `UseTableDataResult`,
`UseTableUrlStateOptions`, `UseSavedViewsResult`, `UseSelectionOptions`,
`UseColumnLayoutOptions`, `UseColumnLayoutStorageStateOptions` /
`UseColumnLayoutStorageStateResult`, `UseColumnLayoutUrlStateOptions` /
`UseColumnLayoutUrlStateResult`, `UseActiveFilterChipsOptions`,
`UseExtraChipsOptions`, `UseBulkActionRunnerOptions`,
`UseBulkBarStateOptions`, `UseInfiniteScrollOptions`,
`UseScrollToTableTopOptions`, `UseTableVirtualizationOptions`,
`MountStaggerOptions`.

## The adapter contract

Everything the eight built-in adapters consume from `@adapttable/core`
crosses the same public surface a ninth adapter would use — there are no
private channels. This tier is aimed at adapter authors; app code rarely
needs it.

**Orchestration.** `useDataTableShell(props, renderAutoForm)` is the whole
shared engine behind a batteries-included `<DataTable>` — it resolves the
data tier, builds the declarative-filter runtime, wires the chrome, and
returns the `tableProps` / `toolbarProps` bundles. `DataTableShellProps`
is its kit-agnostic prop surface and `DataModeProps` the discriminated
`mode` union inside it (`mode="server"` requires `onQueryChange` at
compile time). `tableRenderModel(props)` / `TableRenderModel` derive the
shared render prelude from `SharedTableRenderProps`; `TableBodyRegion`
names which body region renders (desktop rows, mobile cards);
`VirtualTableRow` is one materialized virtual row/card entry.
`useResolvedAdapter` resolves the URL backend the way the shell does;
`PageSelector` projects a fetched page to rows and an optional total, and
`InfiniteQueryLike` is the minimal `useInfiniteQuery` shape
`useQuerySource` reads (structural — TanStack Query stays a type-only
peer).

**Render plumbing.** The prop-getter payload types (`TableElementProps`,
`RowElementProps`, `CellElementProps`, `SearchInputElementProps`,
`SortButtonElementProps`, `RowClickProps`) name what `useDataTable`'s
getters and `rowClickProps` return. Pinning: `PinSide` / `PinnedSide` /
`PinOffset` / `PinLeads` describe the layout, `nextPinSide` cycles a
column's pin, `pinActionLabel` labels the action, and
`pinnedDataCellStyle` / `pinnedEdgeCellStyle` / `pinnedColumnWidth` /
`PinnedCellStyle` compute direction-aware sticky styles. Pager math:
`paginationSlots` / `paginationItems` build the windowed pager model
(`PaginationSlot`, `PaginationItem`, `PaginationInfo`). Column chrome:
`ColumnMenuChromeProps`, `ColumnMenuRow`, `ColumnMenuLabels`,
`ColumnDragState`, `ColumnDragRowAttrs`, `ColumnDropProps`,
`ColumnRowDragProps`, `ColumnReorderKeyProps`,
`ColumnResizeHandleProps` and `COLUMN_DND_MIME` power the column menu's
reorder/resize/pin rows. Toolbar glue: `SearchInputState` (debounced
search binding), `FilterTriggerToggle` (popover/drawer trigger
handlers). Editing/grouping glue: `focusEditorOnMount`,
`rowEditingSignature`, `HeaderGroupCell` and `headerGroupRow`. Shared
utilities: `logicalAlign` (logical → physical alignment),
`shallowEqualByKeys`, `resolveVirtualRows`, `SHARED_DESKTOP_ROW_KEYS`,
`DEFAULT_CARD_SIZE_PX`, `useKeyedVirtualization` / `KeyedVirtualization`
(virtualize an opaque keyed list, e.g. grouped entries),
`useMountStagger` (the `animate` stagger), and the inline icon set
(`FiltersIcon`, `SearchIcon`, `EyeIcon`, `GripIcon`, `PinIcon`,
`ExpandChevron`, `sortArrow`).

**Bulk actions.** `useBulkBarState` / `BulkBarState` /
`BulkBarChromeProps` derive everything a bulk-action toolbar renders
(selected ids, in-flight action, the "select all matching" banner);
`BulkActionOutcome` is a run's result and `bulkActionErrorMessage` its
failure text.

**Misc helpers.** `deriveSortByOptions` builds mobile "Sort by" options
from sortable columns; `resolveColumns` fills declarative column
defaults (humanized headers, locale-resolved accessors);
`resolveDisabledReason` normalizes a row action's `disabled`;
`useSummaryCells` maps a `summaryRow` builder over the visible columns;
`ResolvedPaginationMode` is `paginationMode` after `"auto"` resolves;
`TableLayout` names which layout is rendering (desktop table or mobile
cards); `TableStateMutators` is the setter half shared by `TableSource`
and `useTableUrlState` — the same mutations exist whether state lives in
the URL, in memory, or behind a server query;
`localizedColumnPath`, `normalizeLocaleTag` and `resolveLocaleTag` are
the shared locale-resolution algorithm (see [i18n & RTL](./i18n-rtl.md)).

## Other packages

- `@adapttable/i18n` — `getLabels(locale)`, `getDirection(locale)`,
  `isRtlLocale(locale)`, `hasLocale(locale)`, `primarySubtag(locale)`,
  `RTL_LANGUAGES`, `locales` (keyed by `LocaleKey`) and the seventeen
  presets (`en`, `ar`, `de`, `es`, `fr`, `he`, `it`, `ja`, `pt`, `zh`,
  … including `zhTW`) — see [i18n & RTL](./i18n-rtl.md).
- `@adapttable/cli` — binary `adapttable init [--force]`; programmatic
  `detectKit`, `choosePackageManager`, `installCommand`, `scaffoldFiles`,
  `runInit` plus the pieces they compose: `KITS` / `KitInfo` / `SHADCN`
  describe the detectable kits, `packagesFor` and `mergeDependencies`
  compute what to install, `starterComponent` / `ScaffoldFile` /
  `STARTER_PATH` describe the scaffold, `PackageManager` names the
  supported managers, `InitError` is the typed failure, and
  `InitOptions` / `InitResult` / `InitIO` parameterize `runInit` for
  testing.
- **Adapter packages** — each exports its `DataTable` with `DataTableProps`,
  `DataTableSlots` and `SavedViewsMenuProps` (plus the shared core
  re-exports); Radix and Base UI export their accent unions
  (`RadixAccentColor`, `BaseUiAccentColor`); Mantine also exports its
  chrome as reusable components (`ActiveFilterChips`, `AutoFilterForm`,
  `EmptyState`, `ErrorState`, `PaginationFooter`, `TableSkeleton`, each
  with a `…Props` companion: `ActiveFilterChipsProps`,
  `AutoFilterFormProps`, `EmptyStateProps`, `ErrorStateProps`,
  `PaginationFooterProps`, `TableSkeletonProps`); unstyled and shadcn
  export their building blocks (`FilterPanel` / `FilterPanelProps`,
  `FilterPopover` / `FilterPopoverProps`, `AutoFilterForm`, the `cx`
  class joiner) and shadcn additionally ships `shadcnClassNames`, the
  preset map behind its default look.
