# AdaptTable API reference — DataTable, columns, hooks

The complete public surface. Every symbol ships full TypeScript types and
JSDoc, so editor autocomplete mirrors everything below.

## `<DataTable>` props

Every adapter (`@adapttable/mantine`, `mui`, `chakra`, `antd`, `unstyled`)
exports `DataTable<TRow>`. The props below are the shared core surface
(`BaseDataTableProps`); kit-specific extras follow in
[Adapter extras](#adapter-extras).

### Data

| Prop     | Type                    | Default | Description                                                                                                              |
| -------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `source` | `TableSource<TRow>`     | —       | Data + state contract from `useFrontendData` / `useBackendData`; adapters make it optional when you pass `data` instead. |
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

| Prop                | Type                                | Default     | Description                                                                                                                                 |
| ------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `filters`           | `FilterDef<TRow>[] \| ReactNode`    | —           | Declarative array (the adapter builds the form) or JSX (you draw it); column `filter` shorthands merge in, a same-key `filters` entry wins. |
| `filtersMode`       | `"popover" \| "drawer"`             | `"popover"` | Popover anchors a light card under the Filters button (no backdrop); drawer slides in a side panel with one.                                |
| `filterLabels`      | `Record<string, ChipLabelResolver>` | —           | Per-filter-key chip label resolvers (derived automatically by declarative filters).                                                         |
| `extraChips`        | `ActiveFilterChip[]`                | —           | Extra chips driven by non-URL state, merged with the derived chips.                                                                         |
| `activeFilterCount` | `number`                            | chip count  | Override the active-filter count badge.                                                                                                     |
| `onClearFilters`    | `() => void`                        | —           | Clear-filters handler used by the panel + chip strip (built-in `clearExtras` fallback otherwise).                                           |
| `hideSearch`        | `boolean`                           | `false`     | Disable the built-in search box.                                                                                                            |
| `searchPlaceholder` | `string`                            | —           | Placeholder for the search input.                                                                                                           |

### Selection & actions

| Prop                | Type                              | Default          | Description                                                                 |
| ------------------- | --------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `rowActions`        | `RowAction<TRow>[]`               | —                | Trailing per-row actions (icon buttons on desktop, card buttons on mobile). |
| `bulkActions`       | `BulkAction[]`                    | —                | Bulk actions — providing these turns on row selection.                      |
| `selectionGetId`    | `(row: TRow) => string`           | `rowKey`         | Selection id extractor when it must differ from `rowKey`.                   |
| `selectedIds`       | `readonly string[]`               | —                | Controlled selection; apply `onSelectionChange` requests to your own state. |
| `onSelectionChange` | `(selectedIds: string[]) => void` | —                | Selection observer (uncontrolled) or change-request handler (controlled).   |
| `confirm`           | `ConfirmHandler`                  | `window.confirm` | Confirmation handler for actions that declare a `confirm` block.            |

### Appearance & chrome

| Prop                  | Type                                                            | Default         | Description                                                                                         |
| --------------------- | --------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `tableLabel`          | `string`                                                        | —               | Accessible label for the table.                                                                     |
| `labels`              | `TableLabels`                                                   | English         | Pre-translated label overrides; missing keys fall back to English defaults.                         |
| `dir`                 | `"ltr" \| "rtl"`                                                | `"ltr"`         | Text direction.                                                                                     |
| `locale`              | `string`                                                        | —               | Active locale tag (e.g. `"ar"`, `"ar-EG"`) driving per-column `i18n` data-path resolution.          |
| `density`             | `"comfortable" \| "compact"`                                    | `"comfortable"` | Row density; each adapter maps it to its kit's table size.                                          |
| `isMobile`            | `boolean`                                                       | viewport        | Force the mobile layout instead of resolving from the viewport.                                     |
| `toolbar`             | `ReactNode`                                                     | —               | Inline toolbar slot for custom controls (view toggles, export buttons, …).                          |
| `skeletonRows`        | `number`                                                        | page size       | Number of skeleton rows while loading.                                                              |
| `stickyHeader`        | `boolean`                                                       | `false`         | Keep the desktop table header sticky while scrolling.                                               |
| `stickyTop`           | `number`                                                        | `0`             | Sticky toolbar top offset in px (for app headers above the table).                                  |
| `scrollToTopOnChange` | `boolean`                                                       | `true`          | Scroll back to the table when search/filter/page changes.                                           |
| `scrollTopGap`        | `number`                                                        | `8`             | Extra gap below sticky chrome when scrolling back.                                                  |
| `rowClassName`        | `(row: TRow, index: number) => string \| undefined`             | —               | Conditional per-row class, appended on desktop rows and mobile cards alike.                         |
| `renderRowDetail`     | `(row: TRow) => ReactNode`                                      | —               | Row expansion: its presence enables the expand chevron; multiple rows may be open, keyed by row id. |
| `summaryRow`          | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —               | Map the current page's rows to per-column footer summary cells.                                     |

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

| Prop            | Type                             | Default       | Description                                                                                                                                             |
| --------------- | -------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`           | `string`                         | —             | Unique id (required); also the backend `sortBy` value and — absent `accessor`/`Cell` — the row's dot-path for the cell value.                           |
| `header`        | `ReactNode`                      | humanized key | Header content; omit it and the header derives from `key` (`"hiredAt"` → "Hired At").                                                                   |
| `group`         | `string`                         | —             | Presentational header group: contiguous same-group columns render under one spanning header cell.                                                       |
| `i18n`          | `Record<string, string>`         | —             | Per-locale data paths for the column's value (`{ key: "nameEn", i18n: { ar: "nameAr" } }`); cell, client-side sort and filter follow the resolved path. |
| `filter`        | `ColumnFilter<TRow>`             | —             | Declarative filter for this column: a bare type (`"dateRange"`) or a definition without `key`/`label`.                                                  |
| `Cell`          | `ComponentType<CellProps<TRow>>` | —             | Component rendered per row (receives `{ row, rowIndex }`); define at module level so its identity is stable.                                            |
| `accessor`      | `(row: TRow) => ReactNode`       | —             | Lightweight alternative to `Cell`; returns cell content.                                                                                                |
| `sortValue`     | `(row: TRow) => SortableValue`   | —             | Primitive extractor used by the client-side sort comparator; unused for server-sorted data.                                                             |
| `sortable`      | `boolean`                        | `false`       | Enable sorting for this column.                                                                                                                         |
| `width`         | `number \| string`               | —             | Column width passed through to the rendered header/cell.                                                                                                |
| `align`         | `"start" \| "center" \| "end"`   | `"start"`     | Text alignment within the cell.                                                                                                                         |
| `mobileLabel`   | `string`                         | `header`      | Label used on mobile card layouts; falls back to a string `header`.                                                                                     |
| `hideOnMobile`  | `boolean`                        | `false`       | Hide this column entirely on mobile layouts.                                                                                                            |
| `hideOnDesktop` | `boolean`                        | `false`       | Hide this column entirely on desktop layouts.                                                                                                           |
| `meta`          | `Record<string, unknown>`        | —             | Arbitrary metadata adapters (or your own code) may read back.                                                                                           |

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

| Prop            | Type                                            | Default     | Available on                     | Description                                                                                                                       |
| --------------- | ----------------------------------------------- | ----------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `data`          | `readonly TRow[]`                               | —           | all                              | Frontend tier: raw rows the table filters/sorts/pages; with `onQueryChange` it is the current server page.                        |
| `total`         | `number`                                        | —           | all                              | Server tier: total row count across all pages (drives the pager).                                                                 |
| `loading`       | `boolean`                                       | —           | all                              | Server tier: a request is in flight.                                                                                              |
| `onQueryChange` | `(query: TableQuery, info: { signal }) => void` | —           | all                              | Server tier: fired with the consolidated query whenever it changes (mount included); fetch and hand back `data` + `total`.        |
| `urlKey`        | `string`                                        | —           | all                              | Namespace for this table's URL params (`urlKey="left"` → `left.q`, `left.page`, …).                                               |
| `urlAdapter`    | `UrlStateAdapter`                               | History API | all                              | URL-state backend for the `data`/`onQueryChange` tiers (router adapter, `createMemoryAdapter()` in tests).                        |
| `urlSync`       | `boolean`                                       | `true`      | all                              | `false` keeps all state in memory — the address bar never changes, any `urlAdapter` is ignored.                                   |
| `savedViews`    | `UseSavedViewsOptions`                          | —           | all                              | Mounts a saved-views toolbar menu; `adapter`/`urlKey` default to the table's own, so usually only `storageKey` is needed.         |
| `slots`         | `{ skeleton?, empty? }`                         | —           | all                              | Replace sub-components (loading skeleton, empty state).                                                                           |
| `classNames`    | `DataTableClassNames`                           | —           | mantine, chakra, radix, unstyled | Per-part class overrides — five parts on Mantine/Chakra/Radix (`root`/`toolbar`/`table`/`card`/`footer`), every part on unstyled. |
| `className`     | `string`                                        | —           | mui, antd                        | Class name applied to the root wrapper.                                                                                           |
| `animate`       | `boolean`                                       | `false`     | all                              | Animate rows/cards on mount (dependency-free; honors reduced motion).                                                             |
| `size`          | kit-specific union                              | —           | mui, chakra, antd, radix         | Explicit kit table size, overriding the size derived from `density` (chakra default `"md"`; radix `"2"`, compact `"1"`).          |
| `colorScheme`   | `string`                                        | —           | chakra                           | Chakra color scheme for primary accents (buttons, badges).                                                                        |
| `accentColor`   | `RadixAccentColor`                              | —           | radix                            | Radix accent color for primary controls (buttons, badges, active page).                                                           |
| `bordered`      | `boolean`                                       | `false`     | antd                             | Render the table with cell borders.                                                                                               |
| `virtualHeight` | `number`                                        | `480`       | antd                             | Vertical scroll height used when `virtualize` is true.                                                                            |
| `virtualWidth`  | `number`                                        | `960`       | antd                             | Horizontal scroll width used when `virtualize` is true.                                                                           |
| `emptyState`    | `ReactNode`                                     | —           | unstyled                         | Empty-state node override (`slots.empty` alias wins when both are set).                                                           |
| `loadingState`  | `ReactNode`                                     | —           | unstyled                         | Loading-state node override (`slots.skeleton` alias wins when both are set).                                                      |

Each adapter also re-exports the core source builders and types, so one
import path covers everything.

## Headless hooks

All from `@adapttable/core`.

### Data sources

- `useFrontendData<TRow>(options): TableSource<TRow>` — in-memory source:
  filters, sorts, and slices a raw array from URL state.
- `useBackendData<TRow, TParams, TPage>(options): TableSource<TRow>` — wraps
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

Notable non-hook helpers: `rowsToCsv` / `downloadCsv` (CSV export from your
column defs), `sortRows` / `sortRowsMulti` / `compareValues` / `nextSort`,
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

## Other packages

- `@adapttable/i18n` — `getLabels(locale)`, `getDirection(locale)`,
  `isRtlLocale(locale)`, `hasLocale(locale)`, `primarySubtag(locale)`,
  `RTL_LANGUAGES`, `locales` and the ten presets (`en`, `ar`, `de`, `es`,
  `fr`, `he`, `it`, `ja`, `pt`, `zh`) — see [i18n & RTL](./i18n-rtl.md).
- `@adapttable/cli` — binary `adapttable init [--force]`; programmatic
  `detectKit`, `choosePackageManager`, `installCommand`, `scaffoldFiles`,
  `runInit`.
