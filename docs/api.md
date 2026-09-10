# AdaptTable API reference — DataTable, columns, hooks

The complete public surface. Every symbol ships full TypeScript types and
JSDoc, so editor autocomplete mirrors everything below.

## `<DataTable>` props

Every adapter (`@adapttable/mantine`, `mui`, `chakra`, `antd`, `radix`, `base-ui`, `shadcn`, `unstyled`)
exports `DataTable<TRow>`. The props below are the shared core surface
(`BaseDataTableProps`); kit-specific extras follow in
[Adapter extras](#adapter-extras).

### Data

| Prop       | Type                            | Default | Description                                                                                                                                                                 |
| ---------- | ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`   | `TableSource<TRow>`             | —       | Data + state contract from `useFrontendData` / `useQuerySource`; adapters make it optional when you pass `data` instead.                                                    |
| `rowKey`   | `(row: TRow) => string`         | —       | Stable React key extractor for a row (required).                                                                                                                            |
| `features` | `readonly TableFeature<TRow>[]` | —       | Compose opt-in features from `@adapttable/<kit>/<feature>` subpaths. The import is the switch, and the only way to arm a feature. See [feature composition](./features.md). |

Feature factory options are not `DataTable` props. For example, compose
`columnMenu()`, `filters(defs)`, `editing(save)` or `virtualize()` in
`features`; each feature page documents its options.

### Interactive row grouping

Each kit exports `groupingPanel` from
`@adapttable/<kit>/grouping-panel`:

```tsx
import { groupingPanel } from "@adapttable/mantine/grouping-panel";

groupingPanel();
groupingPanel(["team", "status"], extras);
```

`groupingPanel(groupBy?, extras?)` owns the ordinary grouping row model,
group-header renderers, and the kit-native panel. The optional first argument
is a column key or ordered list; the second is `GroupingExtras<TRow>`. Use
plain `grouping()` only for code-fixed grouping with no interactive panel.
When `columnMenu()` is also composed, its menu model adds Group by/Ungroup and
per-column aggregation choices.

### Columns & layout

| Prop                    | Type                                  | Default | Description                                                                                                                                               |
| ----------------------- | ------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `columns`               | `ColumnInput<TRow>[]`                 | —       | Leaf `ColumnDef`s and optional `ColumnGroupDef` parents — see [ColumnDef](#columndef) and [column groups](./column-groups.md).                            |
| `columnLayout`          | `ColumnLayoutState`                   | —       | Controlled column layout (hidden/order/pinned/widths).                                                                                                    |
| `onColumnLayoutChange`  | `(next: ColumnLayoutState) => void`   | —       | Change handler for the controlled column layout.                                                                                                          |
| `defaultColumnLayout`   | `Partial<ColumnLayoutState>`          | —       | Initial column layout for the uncontrolled mode.                                                                                                          |
| `onColumnRename`        | `(key: string, name: string) => void` | —       | Host persistence channel for a `renameable` column's accepted display name; stable keys never change.                                                     |
| `maxHeight`             | `number`                              | —       | Fixed-height scroll box (px) enabling sideways scrolling + column pinning; omit for page scroll.                                                          |
| `sortByOptions`         | `SortByOption[]`                      | —       | Options for a mobile sort-by select.                                                                                                                      |
| `responsivePriority`    | `number`                              | —       | How readily this column is given up when the table is too narrow. Priority 1 is kept longest; omitting it means never dropped. See [mobile](./mobile.md). |
| `mobileIdentityColumns` | `number`                              | `3`     | Leading desktop-visible columns kept on mobile even if `hideOnMobile`.                                                                                    |

### Filters & search

| Prop                        | Type                                | Default     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filtersMode`               | `"popover" \| "drawer" \| "header"` | `"popover"` | Container for a composed `filters()` feature. Popover: anchored card, no backdrop. Drawer: panel + backdrop. Header: per-column icons; hides the Filters button unless the AND/OR tree is on (`toolbarShowsFilters`).                                                                                                                                                                                                                                                                                      |
| `closeHeaderFilterOnSelect` | `boolean`                           | `false`     | Close a header-filter overlay after a finished single-control write (a select/boolean value, or a valueless operator such as "Is empty"). Off by default — picking an operator on a field that still has a value input does not dismiss. Outside click and Escape always close. `useHeaderFilterOverlay` / `bindHeaderFilterDismiss` / `headerFilterFieldIsComplete` / `usePointerDismiss` / `HeaderFilterSessionProps` / `HeaderFilterOpenProvider` / `HeaderFilterOpenContext` / `HeaderFilterOpenHost`. |
| `filterLabels`              | `Record<string, ChipLabelResolver>` | —           | Per-filter-key chip label resolvers. Declarative `filters()` definitions derive them automatically; needed only for hand-drawn JSX filters (or to override a derived label).                                                                                                                                                                                                                                                                                                                               |
| `extraChips`                | `ActiveFilterChip[]`                | —           | Extra chips driven by non-URL state, merged with the derived chips.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `activeFilterCount`         | `number`                            | chip count  | Override the active-filter count badge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `onClearFilters`            | `() => void`                        | —           | Clear-filters handler used by the panel + chip strip (built-in `clearExtras` fallback otherwise).                                                                                                                                                                                                                                                                                                                                                                                                          |
| `searchable`                | `boolean`                           | `true`      | Render the built-in search box; pass `false` to hide it.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `searchPlaceholder`         | `string`                            | —           | Placeholder for the search input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### Selection & actions

| Prop                | Type                              | Default          | Description                                                                                                                                                                                                               |
| ------------------- | --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowActionsLayout`  | `RowActionsLayout`                | `"buttons"`      | How the trailing actions column renders. Omit or `"buttons"` keeps today's horizontal strip. `"menu"` collapses visible actions into a 3-dot menu using each kit's own Menu. Ignored when `renderRowActions` is set.      |
| `renderRowActions`  | `RowActionsRenderer<TRow>`        | —                | Replace the trailing actions cell (desktop and mobile cards). Receives the resolved action list (host + built-in duplicate / delete / pin). The column still only appears when there are row actions or row-mode editing. |
| `selectionGetId`    | `(row: TRow) => string`           | `rowKey`         | Selection id extractor when it must differ from `rowKey`.                                                                                                                                                                 |
| `selectedIds`       | `readonly string[]`               | —                | Controlled selection; apply `onSelectionChange` requests to your own state.                                                                                                                                               |
| `onSelectionChange` | `(selectedIds: string[]) => void` | —                | Selection observer (uncontrolled) or change-request handler (controlled).                                                                                                                                                 |
| `confirm`           | `ConfirmHandler`                  | `window.confirm` | Confirmation handler for actions that declare a `confirm` block. Where no dialog exists (SSR, some webviews), the default DENIES the action and dev-warns — pass your own handler for dialogless environments.            |

### Appearance & chrome

| Prop                        | Type                                                            | Default         | Description                                                                                                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tableLabel`                | `string`                                                        | —               | Accessible label for the table.                                                                                                                                                                                                   |
| `labels`                    | `TableLabels`                                                   | English         | Pre-translated label overrides; missing keys fall back to English defaults.                                                                                                                                                       |
| `dir`                       | `"ltr" \| "rtl"`                                                | `"ltr"`         | Text direction.                                                                                                                                                                                                                   |
| `locale`                    | `string`                                                        | —               | Active locale tag (e.g. `"ar"`, `"ar-EG"`) driving per-column `i18n` data-path resolution.                                                                                                                                        |
| `density`                   | `"comfortable" \| "compact"`                                    | `"comfortable"` | Row density; each adapter maps it to its kit's table size. With `densityChooser()` composed, omit this to let the feature own uncontrolled state; pass it to control density and pair with `onDensityChange` to observe requests. |
| `renderCard`                | `(row, card) => ReactNode`                                      | —               | Replace a mobile card's body; the shell keeps selection, actions and expansion. See [mobile](./mobile.md).                                                                                                                        |
| `mobileBreakpoint`          | `number`                                                        | `768`           | Width (px) at or below which the card layout takes over. See [mobile](./mobile.md).                                                                                                                                               |
| `forceMobile`               | `boolean`                                                       | viewport        | Force the mobile layout instead of resolving from the viewport.                                                                                                                                                                   |
| `toolbar`                   | `ReactNode`                                                     | —               | Inline toolbar slot for custom controls (view toggles, etc.).                                                                                                                                                                     |
| `error`                     | `Error \| null`                                                 | `null`          | Forwarded error to display in the table's error state (retry via the source's `refetch`).                                                                                                                                         |
| `skeletonRows`              | `number`                                                        | page size       | Number of skeleton rows while loading.                                                                                                                                                                                            |
| `stickyHeader`              | `boolean`                                                       | `false`         | Keep the desktop table header sticky while scrolling.                                                                                                                                                                             |
| `stickyToolbar`             | `boolean`                                                       | `stickyHeader`  | Keep search and page-size pinned with the header on page-scroll tables. Pass `false` to let the toolbar scroll away.                                                                                                              |
| `stickyTop`                 | `number`                                                        | `0`             | Inset in px for the sticky header (and the sticky toolbar) so they clear an app bar.                                                                                                                                              |
| `scrollToTopOnChange`       | `boolean`                                                       | `true`          | Scroll back to the table when search/filter/page changes.                                                                                                                                                                         |
| `scrollTopGap`              | `number`                                                        | `8`             | Extra gap below sticky chrome when scrolling back.                                                                                                                                                                                |
| `isCellFlashing`            | `(rowId: string, columnKey: string) => boolean`                 | —               | Mark cells a patch just changed (`data-flash` on the cell and on the matching card value). Pair with `useChangedCellFlash` from `@adapttable/core/stream`. Omit and nothing is marked. See [realtime](./realtime.md).             |
| `onEditStart`               | `EditEventHandler<TRow>`                                        | —               | Observe an editor opening (cell, row or batch). Cannot change the outcome.                                                                                                                                                        |
| `onEditCancel`              | `EditEventHandler<TRow>`                                        | —               | Observe a cancel. Not fired when a successful commit merely closes the editor.                                                                                                                                                    |
| `onEditCommit`              | `EditEventHandler<TRow>`                                        | —               | Observe a value reaching the host, after parse and validation.                                                                                                                                                                    |
| `onValidationFail`          | `EditEventHandler<TRow>`                                        | —               | Observe a validator refusing a value; the editor stays open.                                                                                                                                                                      |
| `onEditError`               | `EditEventHandler<TRow>`                                        | —               | Observe a save promise rejecting.                                                                                                                                                                                                 |
| `onEditConflict`            | `EditConflictHandler<TRow>`                                     | —               | A row changed under an open editor. Return `"keep"` or `"take"`; omit and `editConflictPolicy` decides.                                                                                                                           |
| `editConflictPolicy`        | `"keep" \| "take" \| "ask"`                                     | `"ask"`         | What to do when the host does not choose. `"ask"` surfaces Keep mine / Take theirs.                                                                                                                                               |
| `rowVersion`                | `(row: TRow) => string \| number`                               | —               | Host version of a row. Any change under an open editor is a conflict, not only the edited column.                                                                                                                                 |
| `summaryRow`                | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —               | Map the current page's rows to per-column footer summary cells.                                                                                                                                                                   |
| `tableFooter`               | `ReactNode`                                                     | —               | Free slot under the table, above the pager. Not the column-aligned summary row.                                                                                                                                                   |
| `onGroupByChange`           | `(groupBy: readonly string[]) => void`                          | —               | Notified after a grouping change, with the keys as a list. The chrome always applies the change itself; take full control via `source.setGroupBy`.                                                                                |
| `groupAggregates`           | `(rows: readonly TRow[]) => Partial<Record<string, ReactNode>>` | —               | Per-group aggregate cells — **same signature as `summaryRow`**. Called with each group's leaf rows.                                                                                                                               |
| `collapsedGroupIds`         | `readonly string[]`                                             | —               | Controlled collapsed group keys (ephemeral — not URL-synced).                                                                                                                                                                     |
| `onCollapsedGroupIdsChange` | `(ids: string[]) => void`                                       | —               | Controlled collapse channel; uncontrolled mode uses internal state.                                                                                                                                                               |

### Virtualization

| Prop                  | Type     | Default | Description                                                    |
| --------------------- | -------- | ------- | -------------------------------------------------------------- |
| `estimateRowSize`     | `number` | `56`    | Desktop row-size estimate in px.                               |
| `estimateCardSize`    | `number` | `132`   | Mobile card-size estimate in px.                               |
| `virtualOverscan`     | `number` | `8`     | Extra rows/cards rendered before and after the virtual window. |
| `virtualScrollMargin` | `number` | —       | Override for the measured window-mode list offset.             |

### URL & persistence

URL props (`urlSync`, `urlKey`, `urlAdapter`) and the `data` /
`onQueryChange` tiers live on the adapter components, not the core prop
surface — see [Adapter extras](#adapter-extras) and
[URL-synced state](./url-state.md). The two tiers are typed as `DataModeProps`,
and the server one's callback is `TableQueryHandler`: the consolidated query
plus the `AbortSignal` for the request it starts.

### Callbacks

| Prop           | Type                              | Default | Description                                                                                        |
| -------------- | --------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `onRowClick`   | `(row: TRow) => void`             | —       | Row activation on click/Enter; interactive children (actions, checkboxes, links) never trigger it. |
| `onRowsChange` | `(rows: readonly TRow[]) => void` | —       | Called whenever the materialized source rows change.                                               |
| `prefetch`     | `(row: TRow) => void`             | —       | Hover-prefetch callback fired on desktop row mouse-enter.                                          |

## Feature composition

`features={[rowReorder(fn, options)]}` from `@adapttable/<kit>/row-reorder` (or the
`@adapttable/<kit>/features` barrel, or `@adapttable/core/features`). The
import is the switch, and it is the only way in — see
[feature composition](./features.md) and, for a v2 table,
[upgrading from v2](./migrate-from-v2.md).

Types: `TableFeature` · `TableFeatureHost` · `FeaturePatch` ·
`FeatureApplyInput`. The merge is `applyTableFeatures`. Live registration is
`setup(host)` on the same `TableFeature`: `registerFilterType`,
`extendFilterType`, `registerEditor`, `registerAggregator`, `registerWriter`,
`registerColumnMenuAction`, `registerPanel`, `registerCommand`,
`registerContextMenuItems`, `onDispose`. Adapters run this through
`useTableFeatures`. The host belongs to that table: `featureHostOf` /
`rememberFeatureHost` thread it into chrome, `FeatureHostProvider` /
`useFeatureHost` hand it to hooks in the tree, and `bindFeatureHostFn`
scopes a mapper (summary, group aggregates) to the table that invoked it.
`RowOf<P>` derives the row type from a wrapper's `rowKey` prop so adapter
feature hosts retain the consumer's row contract.

A feature whose behaviour is a hook carries a `provider` instead —
`FeatureProviderContribution`, whose component receives
`FeatureProviderProps` and wraps the table. `FeatureProviders` nests them in
feature-id order. It publishes through `FeatureStateScope` under a
`FeatureStateKey` from `featureStateKey`, and anything below reads it with
`useFeatureState`. A provider sits above the chrome, so it reads the live rows
and labels through `useTableRuntime` (`TableRuntime`, `TableRuntimeView`) rather than being handed
them (`featureIds()`, optional `query` for page/search/sort); chrome offers them with `usePublishTableRuntime`. A feature also fills
named positions: `renders` is a list of `FeatureRender` entries, each pairing a
`FeatureSlotKey` from `featureSlotKey` with what to draw — built with
`slotRender`, which keeps the props typed — chrome asks through `FeatureSlot`,
and the positions themselves are named constants: `STATUS_BAR` (the footer
strip, filled by `statusBar` or `selectionStats` from
`@adapttable/<kit>/status-bar` — a single slot, so the pair share one element
and it draws once), `FIND_BAR` (`findInTable` from
`@adapttable/<kit>/find-in-table`), `BATCH_EDIT_BAR` (`batchEditing` from
`@adapttable/<kit>/batch-editing`), `COMMAND_PALETTE` (`commandPalette` from
`@adapttable/<kit>/command-palette`), `CONTEXT_MENU` (`contextMenu` from
`@adapttable/<kit>/context-menu`), `SIDE_PANEL` (`sidePanel` from
`@adapttable/<kit>/side-panel`), `COLUMN_MENU` (`columnMenu` from
`@adapttable/<kit>/column-menu`), `BULK_BAR` (`bulkActions` from
`@adapttable/<kit>/bulk-actions`), and `ACTIVE_FILTER_CHIPS` plus
`FILTERS_FORM` (`filters` from `@adapttable/<kit>/filters` — one feature
fills both the chip strip and the panel body). And
`useFeatureSlotFilled` says whether anyone answered. All from
`@adapttable/core/adapter`; see [feature composition](./features.md).

Column-name controls stay kit-owned through `ColumnMenuSlotProps.onRenameColumn`
and the optional `COLUMN_HEADER_RENAME` render slot
(`ColumnHeaderRenameSlotProps`).
`useColumnRenameEditor` (`UseColumnRenameEditorOptions` in,
`ColumnRenameEditorState` out) centralizes trim/validation, Escape cancellation,
focus restoration and the commit announcement without drawing an input in core.
`SharedTableRenderProps.onRenameColumn` carries the same commit channel to
semantic-table header controls; Ant Design intentionally uses the menu path.

Adapter authors bind those slots without copying feature lifecycle through
`createAdapterEditingFeatures`, `createAdapterFiltersFeature`,
`createAdapterGroupingFeature`, `createAdapterRowDetailFeatures`,
`createAdapterRowReorderFeature`, `createAdapterContextMenuFeature`,
`createAdapterCommandPaletteFeature` and
`createAdapterAgentApprovalFeature`. Each accepts kit-owned
`AdapterFeatureComponent`s and returns ordinary feature factories. Their
contracts are `AdapterEditingComponents` — whose `EditableCell` is handed
`EditableCellRenderProps`, the slot's props with the display already worked
out from the row, the column's `Cell` or its accessor, so no kit repeats that
rule — `AdapterEditingFeatures`,
`AdapterFiltersComponents`, `AdapterFiltersFeature`,
`AdapterGroupingComponents`, `AdapterGroupingFeature`,
`AdapterRowDetailComponents`, `AdapterRowDetailFeatures`,
`AdapterRowReorderComponents`, `AdapterRowReorderFeature`,
`AdapterContextMenuFeature` and `AdapterCommandPaletteFeature`; normalized
`AdapterContextMenuProps` / `AdapterCommandPaletteProps` types keep the seam
typed. `createAdapterStandardFeatures` takes
`AdapterStandardFeatureFactories` and returns a `StandardFeaturesFactory`
using `StandardFeatureOptions`; individual feature imports remain independent.
`ContextMenuLiveGate` and `OptionalSidePanel` are the two invariant root-layout
helpers. None imports a kit or belongs on the app-facing core entry.

Chrome asks for the rest of a kit's parts the same way, one slot per part.
Around a cell: `EDITABLE_CELL` (`EditableCellSlotProps`, the editor and the
dirty mark), `FILL_HANDLE` (`FillHandleCellSlotProps`), `EXPAND_TOGGLE`
(`ExpandToggleSlotProps`), `TREE_CELL` and `TREE_TOGGLE`, `COLUMN_SELECT`,
`COLUMN_GROUP_TOGGLE` and `FILTER_HEADER`. Around a row: `ROW_EDIT_ACTIONS`,
`ROW_REORDER_HANDLE`, `ROW_REORDER_BUTTONS` and `ROW_REORDER_ANNOUNCER`,
`GROUP_HEADER_ROW` (`GroupHeaderRowSlotProps`) and its mobile card
`GROUP_HEADER_CARD` (`GroupHeaderCardSlotProps`). Around the table:
`TOOLBAR_EXTRAS` (`ToolbarExtrasSlotProps` — undo/redo, export, print,
density, fullscreen), `SAVED_VIEWS` (`SavedViewsSlotProps`),
`GRID_FOCUS_ANNOUNCER`, the filter surfaces `FILTER_POPOVER` / `FILTER_DRAWER`
(`FilterOverlaySlotProps`) with `FiltersFormSlotProps` and
`ActiveFilterChipsSlotProps`, and `CHROME_BODY` (`ChromeBodySlotProps`), which
`virtualize` fills with the windowed body a plain table never downloads —
`ChromeBodyGate` is what asks for it, falling back to the plain body. A kit
that assembles its own table body — antd renders through its own `<Table>` —
asks `KEYED_WINDOW` (`KeyedWindowSlotProps`) for a window over a keyed list
instead, so the virtualizer stays behind the same import there too.
A kit dresses a core feature with its own parts through `extendFeature`.
The heavy pieces of body assembly a feature can replace — cell spanning, extra
rows, the resize handle — are typed as `AssemblyFns`, and `virtualize` takes
`VirtualizeOptions`.

A feature whose behaviour is a hook rather than a component fills a **live**
slot instead: the hook mounts inside the table and hands its state back down,
so a table that never imported the feature never carries it. Chrome-shaped
state arrives through `ChromeExtrasGate` (`ChromeExtraSlotProps`) —
`COLUMN_LAYOUT_LIVE`, `FILTER_CHIPS_LIVE`, `GROUPING_LIVE`, `TREE_LIVE`,
`SELECTION_LIVE`, `ROW_ACTIONS_LIVE`, `PINNING_LIVE`, `EXPANSION_LIVE` and
`EDITING_LIVE` — and interaction state through `HistoryLiveGate`
(`EDIT_HISTORY_LIVE`, `EditHistoryLiveSlotProps`) and `ShellLiveGate`:
`FIND_LIVE` (`FindLiveSlotProps`), `CELL_NAV_LIVE` (`CellNavLiveSlotProps`),
`EXPORT_LIVE` (`ExportLiveSlotProps`), `FULLSCREEN_LIVE`
(`FullscreenLiveSlotProps`), `SELECTION_STATS_LIVE`
(`SelectionStatsLiveSlotProps`), `COMMAND_PALETTE_LIVE` and
`CONTEXT_MENU_LIVE` (`ContextMenuLiveSlotProps`). An unfilled live slot passes
an inert stand-in through, so the same chrome renders either way.

Factories: `feature` (ad-hoc) · `rowReorder` · `rowPinning` · `cellSpan` ·
`extraRows` · `rowAppearance` · `rowDetail` · `nestedTable` · `editing` ·
`rowEditing` · `batchEditing` · `editHistory` · `dirtyIndicators` ·
`grouping` · `tree` · `virtualize` · `columnMenu` · `resizableColumns` ·
`collapsibleColumnGroups` · `exportCsv` · `cellNavigation` · `findInTable` ·
`fullscreen` · `commandPalette` · `contextMenu` · `sidePanel` · `bulkActions` ·
`filters` · `filterTypes` · `headerFilters` · `savedViews` · `selectionStats` ·
`densityChooser` · `print` · `statusBar` · `undoRedoButtons` · `multiSort` ·
`fitColumns` · `columnSelectionCheckbox`.

Kit `/pivot` re-exports `PivotPanel` plus the `@adapttable/core/pivot` engine.

## ColumnDef

| Prop             | Type                                                 | Default       | Description                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `key`            | `string`                                             | —             | Unique id (required); also the backend `sortBy` value and — absent `accessor`/`Cell` — the row's dot-path for the cell value.                                                                                                                                            |
| `header`         | `ReactNode`                                          | humanized key | Header content; omit it and the header derives from `key` (`"hiredAt"` → "Hired At").                                                                                                                                                                                    |
| `renderHeader`   | `(ctx: ColumnHeaderContext<TRow>) => ReactNode`      | —             | Replace the header caption. The cell still owns sort, resize and the menu; `ctx.controller` exposes them.                                                                                                                                                                |
| `renderFooter`   | `(ctx: ColumnFooterContext<TRow>) => ReactNode`      | —             | Replace one summary-row cell. `value` is the `summaryRow` result for this key.                                                                                                                                                                                           |
| `headerTooltip`  | `string`                                             | —             | Native tooltip on the header caption.                                                                                                                                                                                                                                    |
| `renameable`     | `boolean`                                            | `false`       | Offer the kit-native Rename column action when the table also has `onColumnRename`.                                                                                                                                                                                      |
| `headerActions`  | `ReactNode`                                          | —             | Host controls after the caption, before the resize handle.                                                                                                                                                                                                               |
| `group`          | `string \| readonly string[]`                        | —             | Presentational header group shortcut. A string is one level; a path stacks rows. Contiguous same-path columns merge; a reorder splits the group. Prefer a `ColumnGroupDef` with `children` when the group has collapse options. See [column groups](./column-groups.md). |
| `groupShow`      | `ColumnGroupShow` (`"open" \| "closed" \| "always"`) | `"open"`      | When this leaf sits under a collapsible group: expanded only, collapsed only, or both.                                                                                                                                                                                   |
| `i18n`           | `Record<string, string>`                             | —             | Per-locale data paths for the column's value (`{ key: "nameEn", i18n: { ar: "nameAr" } }`); cell, client-side sort and filter follow the resolved path.                                                                                                                  |
| `filter`         | `ColumnFilter<TRow>`                                 | —             | Declarative filter for this column: a bare type (`"dateRange"`) or a definition without `key`/`label`.                                                                                                                                                                   |
| `Cell`           | `ComponentType<CellProps<TRow>>`                     | —             | Component rendered per row (receives `{ row, rowIndex }`); define at module level so its identity is stable.                                                                                                                                                             |
| `accessor`       | `(row: TRow) => ReactNode`                           | —             | Lightweight alternative to `Cell`; returns cell content.                                                                                                                                                                                                                 |
| `sortValue`      | `(row: TRow) => SortableValue`                       | —             | Primitive extractor used by the client-side sort comparator; unused for server-sorted data.                                                                                                                                                                              |
| `exportValue`    | `(row: TRow) => unknown`                             | —             | Value written to a CSV export when the file should carry something other than the formatted cell (a number rather than `"$1,240.00"`).                                                                                                                                   |
| `formatValue`    | `(row: TRow) => string`                              | derived       | The cell as plain text, for contexts that cannot render JSX — screen-reader announcements, `aria-label`, tooltips, the clipboard.                                                                                                                                        |
| `parseValue`     | `(draft: string, row: TRow) => unknown`              | —             | Turns an edited draft into the value committed by `editing()`. See [cell editing](./cell-editing.md).                                                                                                                                                                    |
| `sortable`       | `boolean`                                            | `false`       | Enable sorting for this column.                                                                                                                                                                                                                                          |
| `colSpan`        | `number \| ((row: TRow) => number)`                  | `1`           | Columns this cell covers. Covered neighbours are omitted. See [row and column spanning](./row-spanning.md).                                                                                                                                                              |
| `rowSpan`        | `number \| ((row: TRow) => number)`                  | `1`           | Rows this cell covers. Stays inside one tbody.                                                                                                                                                                                                                           |
| `width`          | `number \| string`                                   | —             | Column width passed through to the rendered header/cell.                                                                                                                                                                                                                 |
| `align`          | `"start" \| "center" \| "end"`                       | `"start"`     | Text alignment within the cell.                                                                                                                                                                                                                                          |
| `mobileLabel`    | `string`                                             | `header`      | Label used on mobile card layouts; falls back to a string `header`.                                                                                                                                                                                                      |
| `hideOnMobile`   | `boolean`                                            | `false`       | Hide this column entirely on mobile layouts.                                                                                                                                                                                                                             |
| `hideOnDesktop`  | `boolean`                                            | `false`       | Hide this column entirely on desktop layouts.                                                                                                                                                                                                                            |
| `lockPosition`   | `boolean`                                            | `false`       | Gray out the column menu's reorder grip.                                                                                                                                                                                                                                 |
| `lockVisibility` | `boolean`                                            | `false`       | Gray out the column menu's show/hide control.                                                                                                                                                                                                                            |
| `lockWidth`      | `boolean`                                            | `false`       | Gray out resize and per-column auto-size.                                                                                                                                                                                                                                |
| `lockPin`        | `boolean`                                            | `false`       | Gray out the column menu's pin control.                                                                                                                                                                                                                                  |
| `editable`       | `boolean \| ((row: TRow) => boolean)`                | —             | Opt-in cell editing for this column (requires the `editing()` feature; omit either and nothing changes).                                                                                                                                                                 |
| `editor`         | `"text" \| "number" \| { type: "select"; options }`  | `"text"`      | Widget for the active cell when `editable` is set.                                                                                                                                                                                                                       |
| `editValue`      | `(row: TRow) => string`                              | —             | Draft seed when display formatting differs from the value you want to edit.                                                                                                                                                                                              |
| `meta`           | `Record<string, unknown>`                            | —             | Arbitrary metadata adapters (or your own code) may read back.                                                                                                                                                                                                            |

## ColumnGroupDef

A parent header with `children`. Collapse options live here, not on the table.

| Prop              | Type                           | Default    | Description                                                                                             |
| ----------------- | ------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------- |
| `header`          | `string`                       | —          | Caption on the spanning header cell, and the group's id.                                                |
| `children`        | `ColumnInput<TRow>[]`          | —          | Nested groups or leaf columns.                                                                          |
| `collapsedKey`    | `string`                       | —          | Leaf `key` to keep when this group is collapsed. Omit with `collapsedRender` omitted for an arrow stub. |
| `collapsedRender` | `(row: TRow) => ReactNode`     | —          | Cell shown for every row while collapsed. Takes precedence over `collapsedKey`.                         |
| `marryChildren`   | `boolean`                      | `true`     | Keep these children adjacent through reorder. The flat `group` shortcut still splits on drag.           |
| `align`           | `"start" \| "center" \| "end"` | `"center"` | Spanning header alignment. Omit and it stays `"center"` — the previous hardcoded look.                  |
| `headerTooltip`   | `string`                       | —          | Optional native tooltip. The collapse chevron does not show one.                                        |

`ColumnInput<TRow>` is `ColumnDef<TRow> \| ColumnGroupDef<TRow>`. See
[column groups](./column-groups.md).

## FilterDef

| Prop          | Type                     | Default         | Description                                                                                                                      |
| ------------- | ------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `key`         | `string`                 | —               | State key in the filter bag and the `f_<key>` URL param (required); doubles as the row's dot-path for the client-side predicate. |
| `column`      | `string`                 | `key`           | Column the header filter row places this widget under, when the bag key and the column key differ.                               |
| `type`        | `string`                 | —               | Built-in `FilterType` or a custom type registered by `filterTypes()`.                                                            |
| `label`       | `string`                 | humanized `key` | Widget + chip label.                                                                                                             |
| `options`     | `FilterOptionsSource`    | —               | Choices for `select`/`multiSelect`/`checklist` labels: a static `FilterOption[]`, `"auto"`, or an async loader.                  |
| `getValue`    | `(row: TRow) => unknown` | `key` as path   | Row-value extractor for the client-side predicate.                                                                               |
| `placeholder` | `string`                 | —               | Placeholder for text-like inputs.                                                                                                |

Range types persist two inclusive state keys: `dateRange` →
`${key}From`/`${key}To`, `numberRange` → `${key}Min`/`${key}Max`. Every
operator-first widget also writes `f_<key>Op` (`TEXT_OPS` / `NUMBER_OPS` /
`DATE_OPS`) so the comparison survives the URL and Saved Views. Headless:
`readRangeWidget`, `writeRangeWidget`, `writeRangeFilter`,
`useTextFilterWidget`, `useRangeFilterWidget`, `useBooleanFilterWidget`.
A `boolean` filter is any / true / false (`f_<key>=true|false`); omitting
the param is any. A `dateRange` `relative` operator stores a token
(`today`, `last:7`, …) in `${key}From` — never a resolved calendar day —
and `resolveRelativeRange` is the only place that token becomes a window.
An AND/OR tree lives in `ft=1.{…}` (`parseFilterTree` /
`serializeFilterTree`); the frontend ANDs it with the flat bag, and a
server that sets `supports.filterTree` receives `query.filterTree`.
Each adapter mounts `FilterTreeBuilder` (`FilterTreeBuilderProps`) as
the panel UI over that tree — kit controls, same part names. The
shared layout (no form controls) is `FilterTreeChrome` /
`FilterTreeChromeProps` / `FilterTreeClassNames` / `FilterTreeSlots` /
`FilterTreeSelectProps` / `FilterTreeInputProps` /
`FilterTreeButtonProps` / `FilterTreeDisclosureProps` / `FilterTreeOption` on
`@adapttable/core/adapter`.
`filterDefs` lets the chrome label tree chips. A `checklist` filter is
the Excel-style distinct-values widget (`ChecklistFilter` /
`ChecklistFilterProps` / `useChecklistFilter` / `collectChecklistValues`);
adapters draw it. The shared layout is `ChecklistChrome` /
`ChecklistChromeProps` / `ChecklistClassNames` / `ChecklistSlots` /
`ChecklistSearchProps` / `ChecklistButtonProps` /
`ChecklistCheckboxProps`. It prefers `source.facets` (own-filter
excluded via `computeFilterFacets` / `rowsExcludingFilter` /
`FacetMap` / `FacetCounts`) and falls back to `allFilteredRows`. A
server that sets `supports.facets` receives `query.facets` and returns
the same map on the page (`PaginatedResponse.facets`,
`PageSelector.facets`). Without either surface the widget stays hidden.
`headerFilters()` selects `filtersMode="header"` (`resolveFilterMode` /
`FilterChromeMode` / `toolbarShowsFilters`): each adapter mounts a
per-column filter icon (`FilterHeaderTrigger`) on the same extra bag and
hides the toolbar Filters button unless `source.setFilterTree` is set, so
the AND/OR tree still has a chrome. The shared layout is `FilterHeaderChrome`
/ `FilterHeaderControlChrome` / `FilterHeaderChromeProps` /
`FilterHeaderControlChromeProps` / `FilterHeaderClassNames` /
`FilterHeaderSlots` / `FilterHeaderSearchProps` / `FilterHeaderSelectProps`
/ `FilterHeaderRangeProps` / `FilterHeaderMultiProps` / `FilterHeaderOption`
on `@adapttable/core/adapter`. Helpers `filterDefForColumn` /
`headerFilterStickTop` stay on core. Nested kit dropdowns (Select, DatePicker)
are not "outside" — the overlay stays open until a true outside click, Escape,
or (when `closeHeaderFilterOnSelect` is on) a finished single-control write
(`useHeaderFilterOverlay` / `bindHeaderFilterDismiss` /
`headerFilterFieldIsComplete` / `usePointerDismiss` /
`HeaderFilterSessionProps` / `HeaderFilterOpenProvider` /
`HeaderFilterOpenContext` / `HeaderFilterOpenHost`). Desktop only. Never stacked with the
popover or drawer.
`filterTypes()` merges `FilterTypeSpec`s onto `defaultFilterRegistry`
(`builtInFilterSpecs` / `resolveFilterRegistry` / `createFilterRegistry` /
`emptyFilterRegistry`). A spec supplies widget (`FilterWidgetKind`),
operators, predicate, chips, tree projection, and optional `render`
(`FilterWidgetRenderProps`). `FilterTypeRegistry.register` / `extend` and the
`filterTypes` prop are not v3 APIs — register with
`TableFeatureHost.registerFilterType` / `extendFilterType` in
`feature.setup(host)`, or `features={[filterTypes(specs)]}`. Lookups:
`filterTypeSpec` / `filterWidgetKind` / `filterTypeOps` /
`filterTypeDefaultOp` / `renderRegisteredFilter`.

## Adapter extras

Props beyond the core surface, with per-kit availability.

| Prop                        | Type                                                 | Default        | Available on                              | Description                                                                                                                                                                                               |
| --------------------------- | ---------------------------------------------------- | -------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data`                      | `readonly TRow[]`                                    | —              | all                                       | Frontend tier: raw rows the table filters/sorts/pages; with `onQueryChange` it is the current server page.                                                                                                |
| `total`                     | `number`                                             | —              | all                                       | Server tier: total row count across all pages (drives the pager).                                                                                                                                         |
| `loading`                   | `boolean`                                            | —              | all                                       | Server tier: a request is in flight.                                                                                                                                                                      |
| `onQueryChange`             | `(query: TableQuery, info: { signal, key }) => void` | —              | all                                       | Server tier: fired with the consolidated query whenever it changes (mount included); fetch and hand back `data` + `total`. `info.key` identifies the request.                                             |
| `responseKey`               | `string`                                             | —              | all                                       | Server tier: the `onQueryChange` `info.key` the current `data` answers, so aggregate metadata belongs to the rows on screen.                                                                              |
| `aggregates`                | `readonly QueryAggregate[]`                          | —              | all                                       | Server tier: aggregates to send as `query.aggregates`; requires `supports.aggregates`. Reader overrides layer over these.                                                                                 |
| `supports`                  | `QuerySupport`                                       | —              | all                                       | Server tier: capabilities this endpoint answers. `supports.facets` unlocks `query.facets`.                                                                                                                |
| `facetKeys`                 | `readonly string[]`                                  | checklist keys | all                                       | Server tier: keys sent as `query.facets`. Defaults to every `checklist` definition.                                                                                                                       |
| `facets`                    | `FacetMap`                                           | —              | all                                       | Server tier: distinct-value counts from the last fetch, surfaced on the source for the checklist.                                                                                                         |
| `closeHeaderFilterOnSelect` | `boolean`                                            | `false`        | all                                       | Close a header-filter overlay after a finished single-control write. Off by default so an operator pick on a multi-input field stays open.                                                                |
| `urlKey`                    | `string`                                             | —              | all                                       | Namespace for this table's URL params (`urlKey="left"` → `left.q`, `left.page`, …).                                                                                                                       |
| `urlAdapter`                | `UrlStateAdapter`                                    | History API    | all                                       | URL-state backend for the `data`/`onQueryChange` tiers (router adapter, `createMemoryAdapter()` in tests).                                                                                                |
| `urlSync`                   | `boolean`                                            | `true`         | all                                       | `false` keeps all state in memory — the address bar never changes, any `urlAdapter` is ignored.                                                                                                           |
| `slots`                     | `{ skeleton?, empty?, noResults?, error? }`          | —              | all                                       | Replace sub-components. `empty` covers both empty states; `noResults` overrides just the filtered one; `error` takes a node or a `(state) => node` receiving the error and its retry (see customization). |
| `classNames`                | `DataTableClassNames`                                | —              | mantine, chakra, radix, base-ui, unstyled | Per-part class overrides — five parts on Mantine/Chakra/Radix/Base UI (`root`/`toolbar`/`table`/`card`/`footer`), every part on unstyled.                                                                 |
| `className`                 | `string`                                             | —              | mui, antd                                 | Class name applied to the root wrapper.                                                                                                                                                                   |
| `animate`                   | `boolean`                                            | `false`        | all                                       | Animate rows/cards on mount (dependency-free; honors reduced motion).                                                                                                                                     |
| `size`                      | kit-specific union                                   | —              | chakra, antd, radix, base-ui, bootstrap   | Explicit kit table size, overriding the density mapping. MUI uses `density`; the listed kits retain native values density cannot express.                                                                 |
| `accentColor`               | kit accent union (chakra: `string`)                  | —              | chakra, radix, base-ui                    | Accent color for primary controls (buttons, badges, active page).                                                                                                                                         |
| `bordered`                  | `boolean`                                            | `false`        | antd                                      | Render the table with cell borders.                                                                                                                                                                       |

Mantine also publishes the spacing its density mapping uses, as
`DENSITY_SPACING` (`DensitySpacing`) from `@adapttable/mantine/density`, so a
host can match its own chrome to the table's rows.

Each adapter also re-exports the core source builders and types, so one
import path covers everything.

## Headless hooks

All from `@adapttable/core`.

### Data sources

- `useFrontendData<TRow>(options): TableSource<TRow>` — in-memory source:
  filters, sorts, and slices a raw array from URL state. Pass
  `filterTreeFn` (usually `evaluateFilterTree`) to apply an AND/OR tree.
  `getRowId` (default `defaultFrontendRowId`) matches `applyRowPatches`
  so a `rowPatchLog` can continue the live incremental view.
- `useQuerySource<TRow, TParams, TPage>(options): TableSource<TRow>` — wraps
  your `useInfiniteQuery`-style hook into the same contract.
- `useServerData<TRow>(options): TableSource<TRow>` — hand-rolled-fetch
  server tier: emits one consolidated `TableQuery` per change, aborting
  superseded requests via `AbortSignal`.
- `useTableData<TRow>(options): { source, runtime }` — tier resolution
  (source ▸ server ▸ frontend) plus the declarative filter runtime; what
  every adapter calls internally.

### URL state & persistence

- **The codecs themselves**, for reading and writing the query string without
  a table — see [URL state](./url-state.md#reading-and-writing-the-params-yourself).
  `parseTableUrlState(search)` reads a whole query string;
  `updateTableUrlState(search, patch)` returns the next one;
  `applyTableUrlState` / `captureTableUrlState` move that state on and off a
  live table. Per param: `PARAM_PAGE`, `PARAM_LIMIT`, `PARAM_SEARCH`,
  `PARAM_FIND`, `PARAM_SORT_BY`, `PARAM_SORT_DIR`, `PARAM_GROUP_BY`,
  `PARAM_GROUP_AGGREGATES`, `PARAM_COL_HIDDEN`, `PARAM_DENSITY`,
  `PARAM_FORMULA`, `PARAM_PIVOT`, with `readPage`, `readLimit`, `readSortDir`,
  `readSortLevels` / `writeSortLevels`, `readColumnLayout` /
  `writeColumnLayout`, `readExtra` / `writeExtra`, `readFilterTreeParam` /
  `writeFilterTreeParam`, and `readRowPins` / `writeRowPins`.
- `useTableUrlState(options?): UseTableUrlStateResult` — page / limit /
  search / sort / grouping / group-aggregation overrides / extra-filter bag in
  the query string, with setters
  (`setPage`, `setSearch`, `setSort`, `toggleSortLevel`, `setExtra`,
  `setExtras`, `setFilterTree`, `setGroupBy`,
  `setGroupAggregateOverrides`, `clearExtras`, `clearAll`). Group keys use
  `groupBy`; overrides use `groupAgg`.
- `useColumnLayoutUrlState(options?): { layout, onLayoutChange }` —
  URL-persisted column layout (hidden / order / pinned / widths / names).
- `useColumnLayoutStorageState(options): { layout, onLayoutChange }` — the
  localStorage counterpart (user preference rather than shareable link).
- `useSavedViews(options: UseSavedViewsOptions): { views, save, apply, remove }`
  — named snapshots of this table's URL params, persisted to storage.
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
- `useVirtualChromeBodyData(chrome, props): ChromeBodyData<TRow>` — body
  data-flow wiring: window virtualization + the infinite-scroll sentinel.
  `usePlainChromeBodyData` is the same shape without the virtualizer, for a
  table that never composed `virtualize`; `VirtualItemMeta` is one windowed
  entry and `virtualColumnSpan` is the span a windowed row's spacer cells
  cover.
- `useDataTableShell(props, renderAutoForm): DataTableShellResult<TRow>` —
  the whole adapter shell in one call: resolved tier, chrome, and the
  `DataTableShellTableProps` / `DataTableShellToolbarProps` bundles a kit
  spreads, plus `DataTableShellChromeProps` and
  `DataTableShellGroupingPanelProps`. `DataTableShellView` mounts the gates
  below it and hands back the finished view; `finishDataTableShell` folds a
  body into a shell for an adapter that assembles its own.
- `useColumnLayout(options): UseColumnLayoutResult<TRow>` — headless
  visibility / order / pinning / width / name / collapsed-group state
  (`visibleColumns`, `toggleVisible`, `move`, `setPinned`, `setWidth`,
  `setName`, `resetName`, `pinOffset`, `reset`, `toggleColumnGroup`).
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

### The neutral engine

Framework-free — see [concepts](./concepts.md#the-engine-and-why-it-has-no-react-in-it).

- `createTableEngine(options: CreateTableEngineOptions): TableEngine` — build
  an engine over in-memory rows. Filter, sort, page and group run here, with no
  React in the import graph.
- `TableEngine` — the handle: `snapshot()`, `rows(scope)`, `dispatch(op)`,
  `configure(patch)`, `invalidate(axes, next)`, `subscribe(axes, listener)`,
  `cellValue`, `rowByKey`, `rowKey`, `getColumn`, `dispose()`.
- `TableEngineReader` — the read half: `snapshot()`, `rows(scope)`,
  `rowByKey`, `cellValue`, `getColumn`. The engine is one, and so is the
  candidate below.
- `stageCandidate(patch, next?)` / `candidate` / `commitCandidate()` /
  `discardCandidate()` — a private candidate a binding builds while it renders.
  `snapshot()`, `rows()`, the revision tokens and every subscriber stay on the
  committed state until `commitCandidate()` publishes it, so a render that
  suspends or is abandoned changes nothing anyone else can read. Tokens move
  only where the columns, the rows or the view values actually differ: adopting
  a fresh `data` array or a new `rowKey` closure is not news. Any other write —
  a `dispatch`, an `invalidate` — takes the candidate with it. React hosts get
  this through `useTableEngine` and `useFrontendData` and never call it.
- `TableSnapshot` — query state plus `page` (the page actually shown),
  `requestedPage`, `lastPage`, `total` and `revisions`.
- `TableOperation` — a person's action: `setSort`, `setSearch`, `setPage`,
  `setLimit`, `setFilters`, `setGroupBy`, `setSelection`.
- `TableRowScope` — `"page"`, `"visible"` or `"full"`.
- `TableRevisions` / `TableRevisionAxis` — the four counters (`data`, `view`,
  `schema`, `policy`) and the axis names you subscribe to.
- `cellValue(row, column, locale?)` — resolve one cell's value, following a
  column's `i18n` path.
- `createNeutralTable(engine, tableId, binding?): NeutralTable` — wrap an
  engine as the shape `@adapttable/ai` reads: rows, revisions, and an
  `operations` map of what is wired right now. `NeutralTableBinding` is how a
  host supplies the visible rows and that map.
- `devWarn(message)` — development-only warning, printed once per message.

### The builder tier

`@adapttable/react/adapter` publishes what the eight kits are made of, for
anyone wiring a ninth. App code rarely reaches for these; each is here because
an adapter or a plugin genuinely needs it.

| Name                                                                                                                                     | What it is                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTableEngine(options)`                                                                                                                | Subscribe a React tree to one `TableEngine`. Two calls are two isolated tables.                                                                                                    |
| `revisionToken(revisions)`                                                                                                               | Collapse the four revision counters into one comparable string.                                                                                                                    |
| `engineSearchText(row)` / `cellSortValue` / `resolveColumnPath`                                                                          | The engine's default searchable text, its sort-value resolution, and a column's `i18n` path.                                                                                       |
| `FeatureRegistration` / `NeutralFeatureHost` / `currentFeatureHost()` / `runWithFeatureHost`                                             | How a feature registers with the host, and the ambient host a registration runs against.                                                                                           |
| `collectFeatureNotices(input)` / `CollectFeatureNoticesInput`                                                                            | The dev-time notices a table raises when a feature is asked for something it cannot do.                                                                                            |
| `groupedEntriesForStrategy(options)` / `GroupedEntriesForStrategyOptions` / `groupingComputationKind` / `GroupingComputationKind`        | Which grouping computation a view needs, and the entries it produces.                                                                                                              |
| `groupingDragKey` / `moveGroupingKey` / `moveGroupingKeyBy` / `removeGroupingKey` / `hasGroupingColumnDrag` / `GROUPING_COLUMN_DND_MIME` | Reordering the grouping panel's keys by pointer or keyboard.                                                                                                                       |
| `EMPTY_COLUMN_LAYOUT` / `applyColumnOrder` / `applyColumnNames` / `declaredColumnLayout` / `declaredColumnName`                          | The column-layout value and the pure functions that move it.                                                                                                                       |
| `MIN_COLUMN_WIDTH` / `MAX_COLUMN_WIDTH` / `FALLBACK_PIN_WIDTH`                                                                           | Resize clamps, and the width a pin assumes when a column declares none.                                                                                                            |
| `responsiveColumns(...)` / `ResponsiveColumns` / `ResponsiveFit`                                                                         | Which columns survive at a given width, and what had to be dropped.                                                                                                                |
| `flattenReactColumnTree` / `resolveNeutralColumnHeaders` / `columnLetter`                                                                | Flatten a grouped column tree, resolve neutral headers, and the spreadsheet letter for an index.                                                                                   |
| `resolveAssembly(...)`                                                                                                                   | The desktop table assembly a kit renders from.                                                                                                                                     |
| `readEditableCellValue` / `stepEditableCell`                                                                                             | Read the value under an editable cell, and step the editor to the next one.                                                                                                        |
| `contextMenuItems(...)` / `ContextMenuModelOptions`                                                                                      | The context-menu model, before a kit draws it.                                                                                                                                     |
| `RowPinLookup` / `RowReorderDigest`                                                                                                      | Pin membership by row id, and the memo digest a reorder compares.                                                                                                                  |
| `FilterEngine` / `FILTER_ENGINE_IMPL` / `FILTER_PREFIX` / `withFilterType` / `isEmptyFilterValue` / `applyFilterExtends`                 | The filter engine behind the declarative filters, its param prefix, and the helpers that extend it.                                                                                |
| `applyQuerySupport` / `applyGroupLeafSelection` / `appendByKey`                                                                          | Narrow a query to what an endpoint supports, apply a leaf selection, append keyed entries.                                                                                         |
| `DEFAULT_ROW_SIZE_PX` / `MOBILE_BREAKPOINT_PX` / `VIRTUAL_OVERSCAN` / `MAX_LIMIT`                                                        | The row-height estimate, the mobile breakpoint, the virtualizer overscan, and the page-size ceiling.                                                                               |
| `CssProperties` / `ElementRef` / `isRtlElement` / `isBrowser` / `safeLocalStorage` / `safeSheetName` / `resetDevWarnings`                | Style and environment helpers: a style object, a ref that may be a callback, direction, environment probes, a spreadsheet-safe sheet name, and the dev-warning reset a test calls. |
| `AgentHttpError` / `openAiToolNameMap` / `FakeSocket`                                                                                    | The HTTP bridge's structured failure, the reversible OpenAI tool-name map, and the in-memory socket the realtime tests drive.                                                      |

### Utilities

- `useTableVirtualization(options): TableVirtualization` — headless row/card
  windowing: page scroll by default, element scroll inside a `maxHeight` box.
- `useInfiniteScroll(options)` — IntersectionObserver sentinel ref that
  auto-loads the next page in infinite mode.
- `useScrollToTableTop(options)` — sticky-chrome-aware scroll restoration.
- `useDebounce(value, ms)`, `useMediaQuery(query)`, `useIsMobile()`,
  `usePrefersReducedMotion()`, `useColorScheme(preference)`.

- `useExportHandler(handler)` — binds the Export button: makes a host-handled
  export single-flight and reports `exportBusy`. From `@adapttable/core/adapter`.

Building blocks for columns, rows and queries:

- `computed({ key, deps, value, format })` — a derived column, cached per row,
  consistent across display, sorting, filtering and export. See
  [columns](./columns.md).
- `aggregate(spec, options)` — builds the `summaryRow` / `groupAggregates`
  mapper. See [row grouping](./row-grouping.md).
- `applyRowPatches(rows, patches, getRowId)` with `insertRow` / `updateRow` /
  `upsertRow` / `removeRow` — apply changes without a refetch, preserving row
  identity. `applyRowPatchesWithLog` returns the `RowPatchLog` /
  `RowPatchEvent`s; `rowPatchLog` reads the log `applyRowPatches` attaches
  (spreading the array drops it). See [cell editing](./cell-editing.md).
- `tableQueryKey(query, options)` / `tableQueryBaseKey(query, options)` —
  stable cache keys for TanStack Query or SWR. See
  [data tiers](./data-tiers.md).

**Headless cell editing.** `useCellEditing` is the state machine (one active
cell, a draft string, the Enter/Escape/Tab flow) and returns
`CellEditingState`; `EditableCellGate` / `EditableCellGateProps` is the
activation wrapper every adapter renders, with `EditableCellControls` /
`EditableCellActivateControlProps` / `EditableCellConflictButtonProps` on
the main entry for the kit activate control and conflict / undo buttons. The
adapter entry names those three contracts `EditableCellSlots`,
`EditableCellActivateProps` and `EditableCellButtonProps`. A commit arrives as
`CellEditCommit` and the active address as `CellEditTarget`. The keyboard
vocabulary is `CellEditKeyAction` / `CellEditKeyOutcome` /
`CellEditNavigation`. A custom editor receives `EditableCellController` /
`EditableCellEditorCtrl` and an `EditableCellMode`; `EditableCellEditing` is
the bundle adapters get from the chrome. `MultiSelectEditorChrome` /
`MultiSelectEditorChromeProps` is the multi-select editor for kits whose select
holds one value — a named group of the kit's own checkboxes, filled through
`MultiSelectEditorSlots` / `MultiSelectEditorCheckboxProps`. `CellEditor` / `CellEditorOption`
describe the column's `editor` descriptor, resolved by `resolveCellEditor` and
`normalizeEditorOptions`, with drafts parsed by `parseCellEditValue`. Beyond
text, number and select it names `boolean`, `date`, `datetime`, `time` and
`multi-select`: `editorInputType` maps one to its input's `type`,
`isBooleanEditor` / `isSelectEditor` / `isMultiSelectEditor` tell them apart,
`booleanDraft` / `isDraftChecked` and `formatMultiDraft` / `readMultiDraft`
(joined by `MULTI_SEPARATOR`) are the draft shapes those two hold, and
`commitBooleanDraft` / `multiDraftFromSelect` from `@adapttable/core/adapter`
are the draft helpers the kits use for those two. Each adapter draws the
checkbox and multi-select with its own controls. A ninth kind,
`{ type: "custom", render }`, is a host's own component:
`CustomCellEditorRender` is the callback and `CustomCellEditorCtrl` what it
receives (`draft`, `setDraft`, `commit`, `cancel`, `onKeyDown`, `onBlur`,
`focusRef`, plus the validation trio), with `isCustomEditor` telling it apart.
A cell whose value moved under the draft also carries
`CustomCellEditorConflict` — the incoming value and the two ways out of it —
so an editor can put the choice inside its own surface; the table draws its
notice either way, in cell, row and batch editing alike.
`EditableColumnLike` is the minimal column shape editing reads, and
`isCellEditable` / `hasEditableColumns` are the two predicates the chrome uses.

**A save the reader can see.** `onCellEdit` may return a promise;
`useCellSaveState(options)` (`UseCellSaveStateOptions` in, `CellSaveState` out)
tracks it, exposing a `CellSaveStatus` per cell and a `FailedCellSave<TRow>` —
the previous row, the attempted value and the message — for one that rejected.
`onEditRollback` puts the row back and `formatEditError` words the failure;
`labels.undoEdit` names the control the failed cell offers.

**Editing a row as one unit.** `rowEditing` + `onRowEdit` change the commit unit
from a cell to a row: `useRowEditing(options)` (`UseRowEditingOptions` in,
`RowEditingState` out, holding `RowEditDrafts`) opens every editable field
together and hands the host one patch of what changed. `RowEditCell` (`RowEditCellProps`) and `rowEditControls`
(`RowEditControlsOptions` in, `RowEditControls` out) stay on
`@adapttable/core/adapter`. Each adapter mounts `RowEditActions`
(`RowEditActionsProps`) over `RowEditActionsChrome` /
`RowEditActionsChromeProps` / `RowEditActionsSlots` / `RowEditButtonProps`;
`labels.editRow` and `labels.saveRow` name them, as accessible names over each
kit's own pencil, check and cross; `rowEditIcons` (`RowEditIcons`) replaces a
glyph with your own node, or `false` to show the label as text. A row action
marked `editsRow`
becomes that trigger instead: `resolveRowEditTrigger(actions, rowEditing, row, rowId)`
(`RowEditTrigger` out) wires it to the row's form and reports whether the
built-in control still draws itself. An incoming row under an open form asks the
same question a cell does, of every field that moved: `useEditConflict` finds
them through `reconcileRow` (`ReconcileLiveRowEdit` in) and `isRowConflict` —
and across a batch through `reconcileBatch` (`ReconcileLiveBatchEdit` in),
`CellConflictAsk` is what one field's notice needs and `EditConflictChange`
names each field that moved,
and `rowEditConflict` (`RowEditConflict` out) tells the row's controls an
answer is outstanding.

**Changing many rows at once.** `batchEditing` + `onBatchEdit` hold every change
until one save: `useBatchEditing(options)` (`UseBatchEditingOptions` in,
`BatchEditingState` out) counts pending ROWS, marks changed cells, and produces
the `BatchRowEdit<TRow>[]` — `{ row, rowId, patch }` — the host receives in a
single call. `BatchEditCell` (`BatchEditCellProps`) renders a field per editable
cell. Each adapter mounts `BatchEditBar` (`BatchEditBarProps`) over
`BatchEditBarChrome` / `BatchEditBarChromeProps` / `BatchEditBarSlots` /
`BatchEditButtonProps`; `labels.pendingRows`, `labels.saveAll` and
`labels.cancelAll` name them.

**Lifecycle events.** `onEditStart`, `onEditCancel`, `onEditCommit`,
`onValidationFail` and `onEditError` observe a commit; they never own it. The
shared payload is `EditEvent<TRow>` (`row`, `rowId`, `columnKey`, `value`,
`previousValue`, `unit` of `EditUnit` `"cell" \| "row" \| "batch"`, optional
`error`). `EditEventHandler<TRow>` is the callback shape and `EditLifecycle<TRow>`
the five together. `useCellEditing` accepts `UseCellEditingOptions` for start
and cancel; a throw from any handler is swallowed so analytics cannot rewind a
commit. The same events fire on a mobile card — the commit unit does not change
with the layout.

**Live-update conflicts.** A refetch or a websocket that changes the row under
an open editor is a conflict, not a discard. `onEditConflict` (`EditConflictHandler<TRow>`)
receives an `EditConflict<TRow>` (`row`, `previous`, `rowId`, `columnKey`,
`draft`, `incomingValue`, `previousValue`) and may return `"keep"` or `"take"`
(`EditConflictChoice`); returning nothing defers to `editConflictPolicy`
(`EditConflictPolicy`, default `"ask"`). `"ask"` surfaces Keep mine / Take
theirs on the same channel validation already owns (`aria-describedby`,
`data-conflict`). `rowVersion` makes any version change a conflict, not only the
edited column. `useEditConflict` (`EditConflictState` in, `ReconcileLiveEdit` the
inspect input) is the headless state; `liveRowChanged` is the comparison.
`labels.editConflict`, `labels.keepMine`, `labels.takeTheirs` and
`labels.theirsValue` name the notice — `theirsValue` is the incoming cell
so Take theirs is a choice, not a blind swap.
The same notice appears on a mobile card.

**Adding, duplicating and deleting rows.** `onAddRow` puts an Add control in the
toolbar; `onDuplicateRow` and `onDeleteRow` put icon-only Duplicate row and
Delete row on every row, after the host's own `rowActions`, under the keys
`DUPLICATE_ROW_ACTION_KEY` and `DELETE_ROW_ACTION_KEY`. The labels are the
tooltip and accessible name. A delete confirms first
unless `confirmDeleteRow={false}`. `useRowMutations(options)`
(`UseRowMutationsOptions` in, `RowMutationsState` out, taking the
`RowMutationHandlers`) is the state behind them; `labels.addRow`,
`labels.duplicateRow`, `labels.deleteRow` and `labels.deleteRowConfirm` name
them, and `labels.rowActionsMenu` names the 3-dot trigger when
`rowActionsLayout="menu"`. The table stores nothing — a new row arrives through the source like any
other.

**Dirty marks.** `dirtyIndicators` turns them on;
`useDirtyCells(options)` (`UseDirtyCellsOptions` in, `DirtyCellState` out) holds
which cells hold an unconfirmed change, with `isDirty` / `isRowDirty`, a `count`,
and `confirm` / `confirmRow` / `confirmAll` for a host that settles its own state.
`rowIsDirty(editing, rowId)` from `@adapttable/core/adapter` is what a row reads.
`cellFlashAttr` / `rowFlashSignature` are the same door for `data-flash`.

**Validation gates the commit.** A column's `validate` (`CellValidator`) judges
one value; the table's `validateRow` (`RowValidator`) judges the row an edit
would produce, with `applyEdit` saying how the edit lands on it.
`useEditValidation(options)` holds the state — which cells carry a message, which
are still checking — behind `EditValidationState` (`UseEditValidationOptions` in,
`ValidationTarget` naming the cell a check is about), and
`resolveCommitValue(options)` is the row, column and parsed value a validator
sees before the host does. `editorValidationProps(ctrl)` from
`@adapttable/core/adapter` is the `aria-invalid` / `aria-describedby` /
`aria-busy` a kit's editor spreads, and `editorBusyProps(ctrl)` is just the busy
flag for a kit whose own input owns the other two. `stopEditKeys(event)` keeps
Enter, Escape and Tab inside the open editor: all three mean something to the
grid as well, and the editor is where the user is typing.
See [cell editing](./cell-editing.md).

**The grouped row model.** `buildGroupedFlatModel` turns rows into the flat
`GroupedFlatEntry` list adapters render (a group header or a leaf row);
`GroupAggregatesFn` is the per-group mapper, `groupValueKey` buckets a value,
`formatGroupLabel(value, blankLabel)` renders its header text,
`groupSelectionState` gives a group checkbox its tri-state over the group's
leaf ids, `groupRowLayout` places a group header's cells so each subtotal sits
under the column it totals (`GroupRowLayout` in, `GroupRowCell`s out) while
`groupAggregateEntries` lists just the numbers for a mobile card,
`windowGroupedEntries` slices the model to virtual window indices,
and `useGroupCollapse` / `GroupCollapseState` hold which groups are collapsed.
See [row grouping](./row-grouping.md).

**The export pipeline, stage by stage.** `resolveExportCsv` normalizes the
`exportCsv()` feature configuration, `exportableColumns` drops the synthetic actions column,
`resolveExportColumns` applies a column scope (`ExportColumnScope`),
`buildTableCsv` renders the text (`RowsToCsvOptions` controls delimiter, BOM
and formula escaping), and `makeExportCsvHandler` wires the lot to the toolbar
button. `ExportRowScope` names the row scopes — including `"range"`, the
highlighted cell rectangle — `ExportContext` carries the selection, full column
set and range those scopes need, `ExportInfo` is what the lifecycle hooks
receive. Handing an export to a backend sends an `ExportRequest`, whose
`ExportQuery` carries the view's search, filters, sort and grouping — with
`page` and `limit` undefined for `scope: "all"`, so "everything" cannot be
answered with one page. `onExportAll` instead receives an `ExportAllQuery`:
the page-free search, flat and nested filters, primary and multi-sort,
grouping, visible/requested column keys, format, and filename. Its
`ExportAllControls` carries an `AbortSignal` plus optional progress and message
setters; `ExportAllResult` is `{ url }` or empty.

`FetchAllExport` is the opt-in that lets the table page a server source itself,
capped at `EXPORT_FETCH_ALL_MAX_ROWS` (50,000) unless `maxRows` says otherwise;
`fetchAllExportRows` performs that unchanged browser walk. `ExportHandlerState`
is what `useExportHandler` returns — the click handler, `exportBusy`, an
`ExportStatus`, `ExportProgressState`, and the text `ExportAnnouncer` reads
out. `ExportProgressChrome` (configured by `ExportProgressChromeProps`) maps
that shared state into an adapter's required `ExportProgressSlots`;
`ExportProgressSurfaceSlotProps`,
`ExportProgressAction`, and `ExportProgressDownload` type the kit-owned
surface. Terminal states expose `onDismiss` / a Dismiss action; busy work
keeps Cancel only. `LiveRegion` (with `LiveRegionProps`) is the polite region underneath
it and `GridFocusAnnouncer`'s, and `ExportAnnouncerProps` types the announcer
itself. See [browser and server-built exports](./exporting.md).

**Lean live stubs.** A ninth adapter that mounts chrome by hand still has to
hand the table a find/grid/export/history object when those features are
off. `DISABLED_FIND`, `DISABLED_EXPORT`, `disabledHistory` and
`windowedTableAria` are the inert shapes the shell already uses — so the
adapter root never imports the hooks.

**High contrast.** `ForcedColorsStyle` (and `ensureForcedColorsStyles`, which
it calls) inject `FORCED_COLORS_CSS` once per page so Windows High Contrast
and `prefers-contrast: more` keep focus, selection, dirty cells, validation
and find hits visible as outlines. Adapters mount it; app code rarely needs
to. See [accessibility](./accessibility.md).

**Status announcements.** Sorting, filtering and paging rewrite the body with
nothing a screen reader can perceive, so the table says what changed through one
polite region. `useDataTableShell` returns the message as `statusAnnouncement`
and adapters render it with `TableStatusAnnouncer` (`TableStatusAnnouncerProps`)
beside their table, so the region is in the DOM before it has anything to say.
Custom markup composes the message itself with `useTableStatusAnnouncement`
(`TableStatusAnnouncementOptions` in — the row set, the page window and the
sorted column). The sort sentence comes from the `sortedBy` and `sortingCleared`
labels; the counts reuse `showing`, `pageOf` and `noResults`, so what a user
hears matches what the footer shows. See
[accessibility](./accessibility.md).

**File formats.** An `ExportWriter` turns an `ExportWriteContext` — an
`ExportTable` of values resolved once by `buildExportTable`, plus the filename —
into an `ExportPayload`, which `downloadExportFile` hands to the browser.
`csvWriter` is the built-in one, and `matrixToCsv` writes CSV from values a
caller assembled itself. `exportButtonLabel` gives the button a caption naming
the format it produces — `labels.exportCsv` for CSV, `labels.exportFile(format)`
for anything else. `@adapttable/core/xlsx`
adds `xlsxWriter` for real spreadsheets — typed numbers, booleans and dates,
basic styling, group/tree outline and aggregate rows, no new dependency, and
a separate entry so a CSV export never ships it — with `buildTableXlsx`
underneath for building a workbook by hand. An `ExportTable` may carry
`rowMeta` (`ExportRowMeta`, `ExportRowRole`) and `widths` when the view is
grouped or a tree; a flat table omits them. `buildTableXlsx` accepts that
view as `ExportViewEntry` rows — group headers, leaves and aggregates —
so a host building a workbook by hand can pass the same shape the table
does. `viewFromGroupedEntries` and `viewFromTreeEntries` build that view
from the grouping or tree model, `filterExportView` drops groups a scope
emptied, `exportViewFromChrome` picks which model is showing, and
`summaryExportValues` turns a `summaryRow` into file values. See
[customization](./customization.md#spreadsheet-xlsx-export).

**PDF export and print layout.** `@adapttable/core/pdf` adds `pdfWriter` for
the export button and `buildTablePdf` for a host assembling rows by hand.
Print is a different verb: `openPrintLayout` (an `ExportTable`) and
`printTable` (rows and columns) load `buildPrintDocument` into a hidden
iframe. `buildPrintTableHtml` is the `<table>` alone; `printStyles` is the
stylesheet. `PrintLayoutOptions` / `PdfWriterOptions` / `PrintPageSize` /
`PrintPageBreak` configure title, direction, paper and how groups meet a
page boundary. Both option types take `font` — a
TrueType file as bytes — which the PDF writer subsets and embeds so the
download draws Arabic, CJK or any script the built-in face cannot; Arabic
is shaped into its contextual forms and reordered right to left. See
[PDF export and print layout](./export-pdf.md).

**Sparkline columns.** `@adapttable/react/sparkline` adds `Sparkline` /
`sparklineColumn` so a cell can draw a bar, line or area chart without a
chart library and without pulling the mark into the base bundle.
`SparklineProps` / `SparklineKind` / `SparklineColumnSpec` type the
surface. `finiteSparklineValues` drops non-finite points, `sparklineSummary`
is the default accessible label, and `sparklineExportValue` writes the
series as text so CSV and xlsx never get an SVG. See
[sparkline columns](./sparkline.md).

**Row patches.** `RowPatch` is the union applied by `applyRowPatches`, with
`InsertPatch`, `UpdatePatch`, `UpsertPatch` and `RemovePatch` as its members.
`applyRowPatchesWithLog` returns a `RowPatchLog` of `RowPatchEvent`s;
`rowPatchLog` reads the log attached to the result array (a spread copy
drops it). **Incremental re-evaluation.** `createIncrementalView` builds
an `IncrementalView` from an `IncrementalViewConfig`; `applyRowPatchesToView`
and `applyRowPatchLogToView` re-run search, filters, sort, grouping and
aggregates for touched rows only. `configureIncrementalView` merges
grouping / summary extras without walking the set when only those
changed. `incrementalViewOf` / `attachIncrementalView` link a derived
array to the snapshot (`incrementalViewConfig` reads it back);
`incrementalSearchText` is the default projector.

**Live row patches.** `useRowPatchStream` from `@adapttable/core/stream`
(`UseRowPatchStreamOptions` in, `RowPatchStreamState` out) binds a
WebSocket or SSE endpoint to the rows a host owns: frames become ordinary
row patches and go back through the host's own setter.
`openRowPatchStream` (`OpenRowPatchStreamOptions`, `RowPatchStreamHandle`,
`RowPatchStreamReconnect`) is the connector without React, over a
`StreamSocket` / `StreamSocketEvent` a host can supply itself.
`parseRowPatchFrame` reads the table's patch shape as JSON and drops
anything malformed. `RowPatchStreamStatus` is what the connection is
doing, with `isStreamLive` and `isStreamSettled` as the two questions
worth asking. `useChangedCellFlash` (`UseChangedCellFlashOptions` in,
`ChangedCellFlashState` out) tracks the cells a patch just changed so
the host can pass `isCellFlashing` — a pulse, not a locate-the-row
highlight, and never against `prefers-reduced-motion`. See
[realtime](./realtime.md).

**Row reordering.** `rowReorder(handler, options)` from
`@adapttable/<kit>/row-reorder` arms flat, grouped, and tree reorder.
`RowReorderHandler` is an ordinal write: dataset positions for a flat source,
sibling positions for grouped/tree rows. `RowReorderOptions` adds
`movePolicy` (`RowMovePolicy`: `"auto" | "confirm" | "never"`),
`onGroupMove` (`RowGroupMoveHandler`), `onTreeMove`
(`RowTreeMoveHandler`), and async `confirmMove` (`RowMoveConfirmHandler`).
Requests are `RowMoveRequest`; group destinations use `RowGroupRef` /
`RowGroupLevel`, and tree destinations use `RowTreeParentRef`.
`treeMoveCreatesCycle` guards re-parenting and `rowDropPosition` resolves the
`RowDropPosition` before/inside/after pointer zone. `RowReorderDecision` is the
headless seam's reorder/move/reject result.

`ROW_REORDER` is the `FeatureStateKey` its provider publishes under, so custom
chrome reads `RowReorderState` (`TableRowReorderState` from the main entry)
with `useFeatureState(ROW_REORDER)`. `hostConfirmPending` is the inert-controls
flag while a host-owned `confirmMove` is outstanding.
`applyRowReorder`, `datasetIndex`, `useRowReorder`,
`rowReorderSignature`, `rowReorderDropStyle`, `REORDER_COLUMN_KEY`,
`REORDER_COLUMN_WIDTH`, and `ROW_DND_MIME` are the headless primitives.
Nested move menus use `RowMoveMenuModel` / `RowMoveTarget`; the adapter seam is
`RowMoveMenuSlotProps`, `RowMoveMenuItemProps`, and
`RowMoveConfirmationProps`. Each adapter mounts
`RowReorderHandle` / `RowReorderHandleProps` and
`RowReorderButtons` / `RowReorderButtonsProps` over
`RowReorderHandleChrome` / `RowReorderHandleChromeProps` /
`RowReorderHandleSlots` / `RowReorderHandleSlotProps` and
`RowReorderButtonsChrome` / `RowReorderButtonsChromeProps` /
`RowReorderButtonsSlots` / `RowReorderMoveButtonProps`.
`RowReorderAnnouncer` stays on `@adapttable/core/adapter`. Move-menu,
confirmation, success, policy, sort, and cycle labels extend
`RowReorderLabels` / `TableLabels`. See
[row reordering](./row-reordering.md).

**Row and column spanning.** `getCellSpan` / `ColumnDef.colSpan` / `ColumnDef.rowSpan` produce a per-row `TableBodyCell` list (`BodyCell` on the adapter entry) through `buildBodyCells`, `cellsForRow`, `coveredAddressSet`, `rowSpanSignature`, `spanningArmed`, `bodyCellsHaveRowSpan` and `cellSpanMark`. `cellSpanAppearance` (`"merged"` / `"plain"`) is how the origin cell is painted. Arrow keys skip a covered cell; CSV writes the origin once. Types: `GetCellSpan`, `GetCellSpanArgs`, `CellSpanRequest`, `CellSpanAppearance`, `TableBodyCell`. See [row and column spanning](./row-spanning.md).

**Full-width and separator rows.** `extraRows` is a list of `ExtraRow` (`kind: "separator" | "fullWidth"`, `beforeRowId`, `render`); the spliced main-entry shape is `TableExtraEntry` (`ExtraEntry` on the adapter entry). A named extra (`beforeRowId`) stays a full-width row in front of that person through reorder and pin; when a Team span would paint through it, `EXTRA_OVER_SPAN_STYLE` sits the extra on top of that column. `insertExtraRows` / `insertExtrasBeforeRows` / `extraRowsForSection` / `isExtraEntry` / `extraRowsArmed` / `EXTRA_ROW_PARTS` are the kit helpers. Label: `rowSeparator`. See [full-width and separator rows](./full-width-rows.md).

**Row styling and heights.** `rowStyle` / `rowHeight` resolve through `resolveRowStyle` / `resolveRowHeight`. Height wins over `style.height`. `rowStyleSignature` is the memo digest; `rowStyleArmed` is whether either hook was passed; `estimateFromRowHeight` is the virtualizer estimator. Types: `RowStyle`, `RowHeight`. See [row styling and heights](./row-styling.md).

**Row pinning.** `pinnedRowIds` / `onPinnedRowIdsChange` take a `RowPinState` (`{ top, bottom }` of `RowPinSide`). `applyRowPin(state, rowId, side)` is the in-memory helper; `partitionPinnedRows` splits a list into top / scroll / bottom; `EMPTY_ROW_PIN_STATE` is the empty lists. `useRowPinning` returns `RowPinningState`; `rowPinSignature` is the memo digest. Action keys: `PIN_TOP_ACTION_KEY`, `PIN_BOTTOM_ACTION_KEY`, `UNPIN_ROW_ACTION_KEY`. URL: `useRowPinningUrlState` (`UseRowPinningUrlStateOptions` / `UseRowPinningUrlStateResult`) writes `rowPin=id:top,id:bottom`. Labels: `pinToTop`, `pinToBottom`, `unpinRow` (`RowPinLabels`). `rowSourceIndex(entry)` is the dataset index when pinning remapped the window. From `@adapttable/core/adapter`: `pinnedRowStickyStyle` / `pinnedRowCellStyle`, `pinnedRowPart` / `pinnedRowSticky`, `orderedCardEntries`, `useOffsetHeight`, `PINNED_TOP_PART` / `PINNED_BOTTOM_PART`. See [row pinning](./row-pinning.md).

**Pinned summary rows.** `pinnedSummaryRows({ top, bottom })` (`PinnedRows`) sticks host-owned objects outside the row model — sort, filter, grouping, pagination and selection never see them, so they coexist with grouped and tree tables. Identities are `pinnedSummaryRowId(side, index)` (`PINNED_SUMMARY_KEY_PREFIX` + `:side:index`); `PinnedSummaryEntry` / `isPinnedSummaryRowId` / `pinnedSummarySideFromId` / `pinnedSummaryEntries` / `allPinnedSummaryEntries` / `resolvePinnedRows` / `EMPTY_PINNED_ROWS` are the helpers. Parts: `PINNED_SUMMARY_TOP_PART` / `PINNED_SUMMARY_BOTTOM_PART` via `pinnedSummaryPart`. Labels: `pinnedSummaryRow`, `pinnedSummaryTop`, `pinnedSummaryBottom`. Not URL or Saved Views — the objects are host data. See [pinned summary rows](./pinned-summary-rows.md).

**Filter internals.** `FILTER_TYPES` lists the built-in types, `filterLabel`
resolves a filter's caption, `filterStateKeys` names the URL keys one filter
owns, `hasActiveHeaderFilter` says whether any of them holds a value worth
marking the column with — a cleared text field leaves `""` and a cleared
multi-select leaves `[]`, and neither is a filter — `FilterRuntime` is what
`buildFilterRuntime` returns, and
`ResolvedFilterOptions` is what `useFilterOptions` resolves.
`isDeclarativeFilters` tells the array form from JSX. A form reads its values
through `FilterFormSource` with `listFilterValues` and `scalarFilterText`.
Count filters: `COUNT_OPERATORS` / `COUNT_OPERATOR_SYMBOL` / `CountOperator`,
state via `countFilterExtra` / `countFilterStateFromExtra` / `CountFilterState`
/ `isCountFilterComplete` / `clearCountFilterExtra` /
`sanitizeCountFilterParams`, and a chip label from `countFilterChipLabel`.
Range widgets: `useRangeFilterWidget` / `RangeWidgetState` /
`RangeFieldWidget` / `RangeOp` / `RangeOpArity` / `RANGE_SUFFIXES` /
`RANGE_OPS` / `RANGE_OP_LABEL_KEYS` / `RangeOpLabelKeys` /
`writeRangeFilter`. Operator registry: `TEXT_OPS` /
`NUMBER_OPS` / `DATE_OPS` / `TEXT_OP_LABEL_KEYS` / `NUMBER_OP_LABEL_KEYS` /
`DATE_OP_LABEL_KEYS` / `FilterOp` / `TextOp` / `NumberOp` / `DateOp` /
`FILTER_OP_SUFFIX` / `filterOpKey` / `isFilterOpKey` /
`isValuelessFilterOp` / `isListFilterOp` / `isBetweenFilterOp` /
`parseTextOp` / `parseNumberOp` / `parseDateOp` /
`readFilterOp` / `parseListOperand` / `parseNumberList` / `isEmptyRowValue` /
`formatFilterChip` / `filterOpLabel` / `useTextFilterWidget` /
`TextFieldWidget` / `useBooleanFilterWidget` / `BooleanFieldWidget` /
`BooleanChoice` / `parseBooleanChoice` / `coerceBooleanValue`.
Relative dates: `RELATIVE_NAMED` / `RELATIVE_PRESETS` /
`RELATIVE_PRESET_LABEL_KEYS` / `RelativeDateToken` / `RelativeDateRange` /
`RelativePreset` / `parseRelativeToken` / `isRelativeDateToken` /
`countedRelativeToken` / `splitRelativeToken` / `joinRelativeToken` /
`relativeTokenLabel` / `resolveRelativeRange`.
AND/OR trees: `FILTER_TREE_PARAM` / `FILTER_TREE_VERSION` /
`parseFilterTree` / `serializeFilterTree` / `isActiveFilterTree` /
`evaluateFilterTree` / `conditionToExtra`. Mutations:
`emptyFilterTree` / `addFilterTreeCondition` / `addFilterTreeGroup` /
`removeFilterTreeNode` / `replaceFilterTreeNode` /
`setFilterTreeCombinator` / `walkFilterTreeConditions` /
`FilterTreeNode`. Builder (on each adapter): `FilterTreeBuilder` /
`FilterTreeBuilderProps`. Layout (on `@adapttable/core/adapter`):
`FilterTreeChrome` / `FilterTreeChromeProps` / `FilterTreeClassNames` /
`FilterTreeSlots` / `FilterTreeSelectProps` / `FilterTreeInputProps` /
`FilterTreeButtonProps` / `FilterTreeDisclosureProps` / `FilterTreeOption`.
Chips:
`useFilterTreeChips` / `UseFilterTreeChipsOptions` /
`filterTreeChipLabel`. Checklist (on each adapter): `ChecklistFilter` /
`ChecklistFilterProps`. Layout (on `@adapttable/core/adapter`):
`ChecklistChrome` / `ChecklistChromeProps` / `ChecklistClassNames` /
`ChecklistSlots` / `ChecklistSearchProps` / `ChecklistButtonProps` /
`ChecklistCheckboxProps`. Headless: `useChecklistFilter` /
`ChecklistFilterState` / `collectChecklistValues` / `ChecklistValue` /
`CHECKLIST_VIRTUALIZE_AT` / `CHECKLIST_ITEM_HEIGHT` /
`CHECKLIST_LIST_HEIGHT`. Header row (on each adapter): `FilterHeaderRow` /
`FilterHeaderControl` / `FilterHeaderRowProps` / `FilterHeaderControlProps`
(`closeOnSelect`).
Layout (on `@adapttable/core/adapter`): `FilterHeaderChrome` /
`FilterHeaderControlChrome` / `FilterHeaderChromeProps` /
`FilterHeaderControlChromeProps` / `FilterHeaderClassNames` /
`FilterHeaderSlots` / `FilterHeaderSearchProps` / `FilterHeaderSelectProps`
/ `FilterHeaderRangeProps` / `FilterHeaderMultiProps` / `FilterHeaderOption`.
Helpers: `filterDefForColumn` / `headerFilterStickTop` /
`resolveFilterMode` / `toolbarShowsFilters` / `FilterChromeMode`. Facets: `computeFilterFacets` /
`rowsExcludingFilter` / `FacetMap` / `FacetCounts`. The tree is a `QueryFilterGroup` of
`QueryCondition`s (`isFilterGroup` narrows a child). See
[filtering](./filtering.md).

**Keyboard cell navigation.** `useGridFocus(options)` is the focus grid —
`UseGridFocusOptions` in, `GridFocusState` out (`getGridProps`,
`getCellPropsAt`, `getRowPropsAt`, `getColumnHeaderProps`, `selectColumn`,
`focusCell`, `announcement`, `enabled`), and
`<DataTable cellNavigation>` wires it for you. The move arithmetic is separate
and pure: `moveGridFocus(from, move, bounds)` over a `GridCell` and
`GridBounds`, with `GridFocusMove` naming the intents and
`gridFocusMoveForKey(press, dir)` maps a `GridKeyPress` to one (applying the
RTL swap). `sameGridCell` compares addresses. `GRID_CELL_ATTR` /
`gridCellAttr(cell)` are the `data-grid-cell` attribute focus uses to find a
cell in the DOM. `GridFocusAnnouncer` / `GridFocusAnnouncerProps` render the
live region and come from `@adapttable/core/adapter`.
`contextMenuCopyTarget(gridFocus, target)` returns a `ContextMenuCopyTarget`
saying what a context-menu Copy should take — the clicked cell, or the
selection it landed inside — resolving the address through
`gridFocus.cellAt(rowId, columnKey)` so the sort, filter, page and virtual
window are all followed. See [cell navigation](./cell-navigation.md).

**The column-selection checkbox.** `columnSelectionCheckbox` adds a checkbox to
every column header that selects that column — the touch and screen-reader path
into the same state Ctrl/Cmd+click reaches. `GridFocusState` resolves it:
`columnCheckbox` is true when the option and `cellNavigation` both are,
`isColumnSelected(col)` answers whether the selection is exactly that column,
and `toggleColumn(col)` selects it or clears. The control is core chrome with a
kit checkbox in it — `ColumnSelectCheckboxChrome` /
`ColumnSelectCheckboxChromeProps` / `ColumnSelectCheckboxProps` /
`ColumnSelectSlots` from `@adapttable/core/adapter`, with
`columnSelectLabel(label, column)` composing `labels.selectColumn` and the
column's name. See [cell navigation](./cell-navigation.md).

**Cell range selection.** Shift with a movement key or a shift-click extends a
rectangle from its anchor. `CellRange` is the pair of corners and
`CellRangeBounds` the sorted edges; `cellRangeBounds` sorts a range dragged up
or left, `isInCellRange` tests membership, `cellRangeSize` multiplies rather
than enumerating, `extendCellRange` moves the head while keeping the anchor,
`singleCellRange` / `isSingleCell` cover the one-cell case, and
`cellRangeIndices` lists the rows and columns for an exporter. See
[cell navigation](./cell-navigation.md).

**Clipboard.** `clipboardRangeText(options)` turns the selected rectangle into
the tab-separated text a spreadsheet reads (`ClipboardRangeOptions` in), and
`writeClipboardText` puts it on the clipboard, answering whether it landed
rather than throwing. Coming back the other way, `readClipboardText` returns the
clipboard's text or `null` when the browser refuses it, `parseClipboardTable`
parses tab-separated text into a grid of raw strings (quoted tabs and newlines
intact), and `pasteRangeEdits(options)` maps that grid onto a range
(`PasteRangeOptions` in) as `PasteEdit` values — one per cell, already through
the column's `parseValue`, ready for the same handler an inline edit uses. `cellPasteHandler(options)`
resolves who receives them — `onCellPaste` when given, otherwise `onCellEdit`
one cell at a time, `undefined` when the table takes no edits at all
(`CellPasteHandlerOptions` in). On `<DataTable>` the props are `onCellPaste` and
`onCellCut`. See [cell navigation](./cell-navigation.md).

**Fill handle.** `fillDirection(source, to)` says which way a drag from the
selection's corner is filling (`FillDirection`, or `null` inside the selection),
`fillTargetRange(source, to)` is the rectangle it would cover — what the preview
highlights — and `fillRangeEdits(options)` turns the gesture into `CellEdit`
values (`FillRangeOptions` in), continuing an arithmetic series when the source
is one and repeating otherwise. `cellFillHandler(options)` resolves the
recipient (`CellFillHandlerOptions`), and `batchEditHandler(batch, onCellEdit)`
is the rule both it and `cellPasteHandler` follow. Adapters export their
kit-owned `FillHandle` and render it over `FillHandleChrome` /
`FillHandleChromeProps` / `FillHandleSlots` / `FillHandleSlotProps` from
`@adapttable/core/adapter`; on `<DataTable>` the prop is `onCellFill`. See
[cell navigation](./cell-navigation.md).

**Undo and redo.** `useEditHistory(options)` remembers gestures and replays
them through `onCellEdit` (`UseEditHistoryOptions` in, `EditHistoryState` out —
`undo`, `redo`, `canUndo`, `canRedo`, `clear`, `record`), with
`EditHistoryEntry` the recorded pair. `useTableEditHistory(props)` is the
table-level wiring — it takes the `editHistory` prop
(`TableEditHistoryProps`) and returns the history plus the commit channel that
records each inline edit as a one-cell gesture. `asGesture(apply, record)` wraps
a cell-edit handler as one undo entry. `asBatchGesture(apply, record)` does the
same for `onBatchEdit`, so one save is one undo. `readCellValue(row, column)` reads a
cell's current value unstringified — what an undo puts back. On `<DataTable>` the prop is
`editHistory`. See [cell editing](./cell-editing.md).

**Server-side grouping.** A source that declares `supports.grouping` receives
`query.groupBy` (the keys, outermost first) and, with `supports.aggregates`,
`query.aggregates` from `useQuerySource`'s `aggregates` option. It answers with
`QueryGroupRow` values — `value`, `count`, optional `aggregates`, `groups` and
`rows` — on the source's `groups` field (`QueryGroupsPage` types a whole page),
and `serverGroupEntries(options)` (`ServerGroupEntriesOptions`) lays them out as
the same entries local grouping produces. `groupLeafCount(entry)` is the count a
header shows: the server's when it grouped, the rows in hand otherwise. See
[row grouping](./row-grouping.md).

**Column sizing.** A `ColumnDef` takes `width`, `minWidth`, `maxWidth` and
`flex`; `<DataTable fitColumns>` makes the columns share the container.
`columnFlexShares(options)` computes each flexible column's percentage
(`ColumnSizingOptions`), `columnSizeStyle(column, shares, userWidth)` is the
style a cell carries — dragged width first, then the column's own, then its
share — and `fittedTableStyle(fitColumns)` is what the `<table>` needs for
percentages to mean anything. See
[column management](./column-management.md).

**Column auto-sizing.** `measureColumnWidth(root, key)` returns the width a
column needs for its widest rendered cell — measured from the DOM by the
`data-column-key` every cell carries — and `autoSizeColumns(root, keys,
setWidth)` sizes a whole set, returning how many it could measure. A cell that
already fits is not grown again on a later click. A resize handle sizes its
own column on double-click, and the column menu's action calls
`shell.autoSizeColumns`. See [column management](./column-management.md).

**Column virtualization.** `useColumnWindow(options)` windows the horizontal
axis (`UseColumnWindowOptions` in, `ColumnWindow` out — the columns to render
and the `paddingStart` / `paddingEnd` that hold the rest open), and
`ColumnSpacer` / `ColumnSpacerProps` from `@adapttable/core/adapter` render one
of those spacers.
The render model swaps the windowed columns in, so an adapter maps over
`model.columns` as before and renders `model.columnSpacers` either side. On
`<DataTable>` the prop is `virtualizeColumns`. See
[virtualization](./virtualization.md).

**Virtualized row detail.** `useRowPairMeasurer(virtualizer, enabled)` returns
`RowPairMeasurer` — `row(index)` and `detail(index)` ref callbacks — which
report a row and its open panel as one height through the virtualizer's
`resizeItem` (`ResizableVirtualizer`). It is what lets `renderRowDetail` and
`virtualize` be used together; adapters take it as `measureRowPair` in place of
`measureElement` when the table can expand rows. See
[virtualization](./virtualization.md).

**Row grouping.** `groupBy` takes a key or an ordered list; `parseGroupBy(value)`
turns any of its forms (`GroupByInput`) into the key list and `formatGroupBy`
back into the single comma-separated value state is stored as.
`groupingPanel(groupBy?, extras?)` from each kit's `/grouping-panel` subpath
adds the interactive strip and still accepts every `GroupingExtras` option.
It publishes `GroupingPanelState`: ordered `groupBy`, the `aggregations`
model every surface reads, drag/drop and keyboard bindings, `add` / `remove`
/ `moveBy`, and `setAggregateOperation` / `addAggregate` / `removeAggregate`
/ `restoreAggregateDefaults`. A column's `aggregatable` (`false` / `true` /
`{ default?, operations }`) is the one offer the panel, the column menu, a
URL and a request all resolve. `GroupAggregateOverride` is a built-in name, a
host operation id, or `"none"`; `GroupAggregateOverrides` maps those session
choices by column. `serializeGroupAggregateOverrides` /
`parseGroupAggregateOverrides` encode both the column key and the operation
id (`encodeURIComponent`, split on the first `:`), so custom ids with
colons, commas, percents or Unicode round-trip. Built-in `budget:sum` URLs
stay compatible. `withGroupAggregateOverrides` layers them over a developer
`groupAggregates` mapper and refuses a disallowed id at execution, while
`withQueryAggregateOverrides` does the same for server `query.aggregates`.
`queryAggregateOps` reads those requested functions back as the operations a
column is told about — `TableSource.groupAggregations`, which
`useQuerySource` and `useServerData` publish as of the response being drawn —
`useQuerySource` from the query's `dataUpdatedAt` read against its request,
`useServerData` from the `responseKey` a host echoes back, without which a
request it cannot place is reported as unknown. The developer's original
`aggregates` option is published separately as `queryAggregates`, so Restore
defaults never treats the current response as the initial query. An absent
key preserves the host request; `"none"` removes it only while
`readerControlAllowed` is true. `TableSource.honorsAggregates` is false when
a server groups but drops `query.aggregates`, which hides the aggregation
controls rather than letting them mutate unused local state. A column's
`formatAggregate` says how the result reads, taking the value and an
`AggregateFormatContext` — the column key, and the operation where the table
knows it. It is applied where the cell is drawn: `groupRowLayout` and
`groupAggregateEntries` take the group's `GroupAggregateOps` and hand each
cell through it, and `groupAggregateNode` does one cell for a kit that lays
out its own group rows.

Adapter authors bind the `GROUPING_PANEL` slot with
`createAdapterGroupingPanelFeature(AdapterGroupingPanelComponents)`.
`GroupingPanelChrome` takes `GroupingPanelChromeProps` /
`GroupingPanelSlotProps` and a `GroupingPanelSlots` object whose required
pieces receive `GroupingPanelSurfaceProps`, `GroupingPanelDropZoneProps`,
`GroupingPanelChipProps`, `GroupingPanelSelectProps`,
`GroupingPanelRemoveZoneProps`, `GroupingPanelAggregationItemProps`,
`GroupingPanelAggregationRemoveProps`, `GroupingPanelChecklistProps`,
`GroupingPanelChecklistOption`, and
`GroupingPanelRestoreProps`; select entries are `GroupingPanelOption`s and
native event wiring uses `GroupingDragProps` / `GroupingDropProps`.
`GroupingPanelInteractions` carries those callbacks,
`GroupingChipKeyboardProps` defines the equal keyboard path, and
`GroupingDragState` describes the active drag while `GroupingDragSource` names
its header-or-chip origin. Every kit exports its kit-owned `GroupingPanel`;
Radix additionally names `RadixGroupingPanelProps`.
Column-menu plugins return a `ColumnMenuItem`: either an ordinary action or a
`ColumnMenuChoice` made of `ColumnMenuChoiceOption`s.

`buildGroupedFlatModel(options)` walks the tree into the flat `GroupedFlatEntry`
list adapters render — each group entry carrying its `level`, its `groupBy` key,
its `path` and the leaves of its whole subtree — and `groupIndentStyle(level)`
from `@adapttable/core/adapter` is the indent every kit applies. `GroupSort`
names the orderings `groupSort` accepts (`"label"`, `"label-desc"`, `"count"`,
`"count-desc"`, or a comparator) and `GroupNode` is what it and `groupFilter`
receive: `value`, `label`, `level`, `groupBy` and the group's `leafRows`.
Paging is `groupPageSize` / `groupRowPageSize`: `useGroupPaging()` holds how
much has been revealed (`GroupPagingState`, whose `paging` is a `GroupPaging`),
the model emits a `groupMore` entry for the rest, and each adapter mounts
`GroupMoreButton` / `GroupMoreButtonProps` over `GroupMoreButtonChrome` /
`GroupMoreButtonChromeProps` / `GroupMoreButtonSlots` /
`GroupMoreButtonSlotProps`.
`groupRowParts(kind)` names the `data-adapttable-part` values for each of the
three rows a grouped body renders (`GroupRowKind`), and `GroupToggleSpacer`
holds the chevron's width on the two rows that have no chevron, so a footer
lines up with the header it closes.
Expansion is the `collapsedGroupIds` / `onCollapsedGroupIdsChange` pair —
`useGroupCollapseUrlState(options)` keeps it in the URL
(`UseGroupCollapseUrlStateOptions` in, `UseGroupCollapseUrlStateResult` out,
serialized by `readCollapsedGroups` / `writeCollapsedGroups` under
`PARAM_GROUP_CLOSED`), and the table's grouping bundle carries `expandAll`,
`collapseAll` and `collapseToDepth`. See
[row grouping](./row-grouping.md).

**Tree data.** A hierarchy the data declares, not one derived from values, so
it is a separate model from grouping. `TreeShape<TRow>` is how a host declares
it — `getChildren` for nested rows, `getParentId` for a flat list with a parent
column, `hasChildren` for children not fetched yet. `buildTreeEntries(options)`
(`BuildTreeEntriesOptions` in) flattens it into the `TreeEntry<TRow>` list
adapters render, each entry carrying its `level`, `path`, `descendantIds` and
`loading`; `useTreeExpansion(options)` holds the open set
(`TreeExpansionState`), `treeColumnKey(columns, declared?)` picks the column
that carries the chevron, and `filterTreeRows(options)` keeps a match together
with every ancestor that leads to it. `treeIndentStyle(level)` indents a cell
and `treeCardStyle(level)` a mobile card; `bodyRowEntries(rows, tree)` returns
the `BodyRowEntry<TRow>` list a body maps over, tree or flat. Each adapter
mounts `TreeCell` / `TreeCellProps` and `TreeToggle` / `TreeToggleProps`
over `TreeCellChrome` / `TreeCellChromeProps` / `TreeToggleChrome` /
`TreeToggleChromeProps` / `TreeToggleSlots` / `TreeToggleButtonProps`.
Lazy branches are
`hasChildren` + `onLoadChildren`: `useLazyChildren(options)` holds which nodes
are fetching (`LazyChildrenState`, `UseLazyChildrenOptions` in) and the tree
bundle carries `loadingIds` / `failedIds`. A server-side tree is
`supports: { tree: true }` plus `expandedIds` on `useServerData` /
`useQuerySource`, which sends the open ids as `query.expandedIds`.

**A real table under a row.** `nestedTable` takes a `NestedTableFor<TRow>` and
returns a `NestedTable` — a `label` and a `table(defaults)` that mounts the kit's
own component. `NestedTableDefaults` is what it receives: `urlSync: false`,
`searchable: false`, the parent's `density`, `labels` and the `tableLabel`.
`nestedTableDefaults(label, parent)` builds them and `nestedTableDetail(options)`
turns the declaration into the `renderRowDetail` the table places under a row
(both from `@adapttable/core/adapter`, with `NestedTableParent` for what the
parent contributes). See [tree data](./tree-data.md).
See [tree data](./tree-data.md).

**Find in table.** `findMatches(options)` returns every cell whose text
contains the query, in absolute addresses (`FindMatchesOptions` in);
`matchKey(cell)` / `matchKeySet(matches)` make membership a constant-time
question and `stepMatch(index, total, step)` wraps the walk.
`useFindInTable(options)` is the bar's state — `open`, `query`, `matches`,
`index`, `current`, `next`, `previous` (`UseFindInTableOptions` in,
`FindInTableState` out). The query is shareable table state: pass the same
`urlAdapter` / `urlSync` / `urlKey` the table already uses and a `find` param
rides beside `q`. `FIND_URL_WRITE_DEBOUNCE_MS` is the trailing debounce on
that write (replace-state only). Each adapter mounts `FindBar` / `FindBarProps`
over `FindBarChrome` / `FindBarChromeProps` / `FindBarSlots` /
`FindSearchProps` / `FindButtonProps` / `FindButtonKind`.
`useFindFocus(current, focusCell,
selectRange)` is what takes the table's focus to the match the walk is on. Cells carry `data-cell-match` /
`data-cell-match-current`, which `isMatchedCell` / `isCurrentMatchCell` read and
`cellHighlightStyle(props, base, selected)` resolves into one background. On
`<DataTable>` the prop is `findInTable`. See
[cell navigation](./cell-navigation.md).

**Selection statistics.** `selectionStats(options)` returns `SelectionStats` —
`cells`, `numeric`, and `sum` / `average` / `min` / `max`, each `null` when the
selection holds no numbers (`SelectionStatsOptions` in). Adapters export their
kit-owned `SelectionStatsBar` and render it over `SelectionStatsChrome` /
`SelectionStatsChromeProps` / `SelectionStatsSlots` /
`SelectionStatsSlotProps` / `SelectionStatPart` from
`@adapttable/core/adapter`; it is empty below two cells. On `<DataTable>` the
prop is `selectionStats`. See
[cell navigation](./cell-navigation.md).

**Highlighting a row.** `useHighlight(enabled)` returns a `HighlightState`:
`flashRow(rowId)`, `flashCell({ rowId, columnKey })` (a `HighlightedCell`),
`clear()`, `isRowHighlighted` / `isCellHighlighted`, and `animated`. Marks
are keyed by row id rather than position, so one survives the sort, filter
or page change that moves the row. Flashing the same row again restarts its
clock instead of stacking. Under `prefers-reduced-motion` the mark still
appears — `animated` goes false and it holds steady, and longer, because a
steady mark is easier to miss than one that moves. Reduced motion means less
movement, not less feedback.

**`PivotPanel`** is each adapter's pre-wired configuration panel — import it
from your kit and pass `fields`, `config` and `onChange`. It is
`PivotPanelChrome` with that kit's slots already filled.

**`SavedViewsPanel`** is each adapter's pre-wired management panel — import it
from your kit and pass the views plus the five handlers. shadcn's names its own
`SavedViewsPanelProps`: the views, the five handlers, `labels`, `footer`,
`className`, and a `classNames` map merged per key over the shadcn preset. It
is the panel's whole contract, with no slot type to fill in — the kit has
already filled them.

**Saved-view storage and versioning.** `useSavedViews` takes a
`SavedViewsStore` (`list` / `save` / `remove`, all async) that replaces
localStorage, a `SavedViewVisibility` (`"private"` | `"team"`) for new views,
and a `SavedViewMigration` for views behind `SAVED_VIEW_VERSION`. Its result
adds `rename`, `move`, `setDefault`, `defaultView` and `reload`. A store's
fourth member, `reorder(names)`, is optional and persists the list's order —
without it a store keeps every other operation and `move` reorders for the
session only. See [saved views](./saved-views.md).

**The saved-views management panel.** `SavedViewsPanelChrome` from
`@adapttable/core/adapter` is a titled card listing every saved view;
`SavedViewsPanelChromeProps` takes the views, the five handlers, and an
optional `footer` rendered inside the card under the list. Applying a view is
clicking its name; rename, move, set-default and delete are an icon cluster
described by `SavedViewRowControl`, keyed by `SavedViewControlKey`.
`SavedViewsPanelSlots` names the four kit-supplied pieces —
`SavedViewsPanelSurfaceProps`, `SavedViewsPanelRowProps`,
`SavedViewsPanelInputProps` and `SavedViewsPanelEmptyProps`. Reordering is
buttons, and renaming is an inline input that Escape abandons. See
[saved views](./saved-views.md).

**Your router's URL adapter.** `routerUrlAdapter(options)` builds a
`UrlStateAdapter` from a router's current search string and its navigate;
`RouterUrlAdapterOptions` is that pair. It depends on no router, so React
Router, TanStack Router and Next.js all take two lines. See
[URL state](./url-state.md).

**Adaptive capabilities.** `@adapttable/ai` is the optional, provider-neutral
agent contract. The root exports `AGENT_SCHEMA_VERSION`, `CAPABILITY_KEYS`,
`CapabilityKey`, `WritePolicy`, `ApprovalPolicy`, `CommitPolicy`,
`RowAddressScope`, `createAgentSession`, `CreateAgentSessionOptions`,
`buildManifest`, `enabledKeys`, `guideOf`, `summaryOf`, `validateSchema`,
`eligibleSuggestions`, `assertUniqueSuggestions`, and
the types `AgentApply`, `AgentAggregateOperation`, `AgentAggregationColumn`,
`AgentAggregations`, `AgentAggregationsPatch`, `AgentCapabilityContext`,
`AgentCapabilityDefinition`,
`AgentCellEdit`, `AgentColumn`, `AgentLimits`,
`AgentManifest`, `AgentObservation`, `AgentPolicy`, `AgentRowAddressing`,
`AgentSession`, `ApprovalOutcome`, `CapabilityGuide`, `CatalogEntry`,
`ExecuteError`, `ExecuteResult`, `JsonSchema`, `ResolvedRow`, `RowKeyRef`,
`RowPositionRef`, `RowReadQuery`, `RowRef`, `RowWindow`, `RowWindowRow`,
`TableAgentBridge`, `WriteExecuteResult`, `WriteProposal`, `WriteRowResult`,
and the assistant contracts `AssistantAction`, `AssistantConversation`,
`AssistantOutcome`, `AssistantOutcomeStatus`, `AssistantPlanner`,
`AssistantProposal`, `AssistantRequest`, `AssistantSuggestion`,
`AssistantTurn`, `AssistantExchange`, `AssistantTransport`,
`AssistantTransportReply` and `CapabilityPresentation`, plus the receipt
readers `receiptFromResult`, `receiptsFromResults`, `turnStatus` and the types
`AssistantReceipt`, `AssistantReceiptStatus`, `AssistantTurnStatus`.
`@adapttable/ai/assistant` exports `useTableAssistant`,
`TableAssistantOptions`, `TableAssistantState`, `AssistantMessage` and
`AssistantStatus`. `@adapttable/ai/http` adds `assistantHttpTransport`. Receipts come from
`receiptFromResult` and `receiptsFromResults` as `AssistantReceipt`, whose
optional `AssistantReceiptSubject` names what changed so the panel can say
"Filter applied — Team is Core" rather than a capability key.
Each kit ships the panel on its own `@adapttable/<kit>/assistant` entry,
exporting `TableAssistant` and `tableAssistant`. Core chrome exports
`TableAssistantChrome` (`TableAssistantChromeProps`, `TableAssistantProps`),
`TABLE_ASSISTANT`, `createAdapterTableAssistantFeature`,
`TableAssistantPresentation` — `"floating"` for a nonmodal window over the
page, `"panel"` for a surface the host places, `"sheet"` for the kit's modal —
with `TableAssistantBoundary` scoping a floating window to the viewport or to
a container of your own. `TableAssistantSlots` collects
`TableAssistantPanelProps`, `TableAssistantSheetProps`,
`TableAssistantWindowProps`, `TableAssistantSuggestionProps`,
`TableAssistantButtonProps`, `TableAssistantComposerProps` and
`TableAssistantBadgeProps`. The view types are `TableAssistantView`,
`TableAssistantMessageView`, `TableAssistantReceiptView` with
`TableAssistantReceiptSubject` — what an action changed, supplied by whoever
ran it — and `TableAssistantSuggestionView`, plus `assistantIsBusy` and
`assistantIsUsable`.
`@adapttable/ai/react` exports `tableAgent`, `TableAgentOptions`,
`TableAgentColumnPatch` and `TABLE_AGENT_STATE`. Each published kit exports
`agentApproval` and `AgentApproval` (`AgentApprovalProps`). Core chrome
exports `AgentApprovalChrome` (`AgentApprovalChromeProps`),
`AGENT_APPROVAL`, `AGENT_APPROVAL_STATE`, `AgentApprovalPending`,
`approvalReview`, `ApprovalReview`, `ApprovalReviewItem`,
`APPROVAL_PREVIEW_LIMIT`, `ApprovalReviewChrome`,
`ApprovalReviewChromeProps`, `ApprovalReviewSlots`,
`AgentApprovalDecision`, `AgentApprovalOperation`,
`AgentApprovalProposal`, `AgentApprovalButtonProps`,
`AgentApprovalListProps` and `AgentApprovalSlots`. Portable adapters live
on subpaths: `@adapttable/ai/json` (`toJsonTools`, `JsonFunctionTool`,
`executeJsonTool`, `JsonToolCall`, `parseEnvelope`, `executeEnvelope`,
`AgentEnvelope`), `@adapttable/ai/openai` (`toOpenAITools`,
`toOpenAIToolName`, `fromOpenAIToolName`,
`OpenAIFunctionTool`, `OpenAIFunctionDefinition`, `OpenAIToolsOptions`,
`executeOpenAITool`, `OpenAIToolCall`, `OpenAIToolCallFunction`),
`@adapttable/ai/mcp` (`toMcpTools`, `McpTool`,
`toMcpResources`, `McpResource`, `mcpListChanged`, `executeMcpTool`),
`@adapttable/ai/http` (`createAgentHttpClient`, `connectAgentHttp`,
`runAgentHttpTurn`, `parseAgentHttpRequest`, `parseAgentHttpResponse`,
`AGENT_HTTP_SCHEMA`, `AgentHttpKind`, `AgentHttpMessage`, `AgentHttpNeeds`,
`AgentHttpAction`, `AgentHttpRequest`, `AgentHttpResponse`,
`AgentHttpClientOptions`, `AgentHttpTurnResult`). See
[adaptive capabilities](./agent-capabilities.md),
[`@adapttable/ai`](./ai.md), [agent integrations](./ai-integrations.md)
and [connect a backend](./ai-http.md).

**Server queries.** `parseTableQuery(input, schema)` from
`@adapttable/server` validates a request against a `QuerySchema` and returns a
`ServerTableQuery` — page, limit, offset, search, sort chain, grouping,
filters, filter tree, pivot, the folded pivot groups in `pivotCollapsed`, and
cursor, plus a `QueryRejection[]` naming everything it refused. `QueryInput` is a `Request`, `URL`, query string or
`URLSearchParams`; `ServerFilterValue` is one filter's value. See
[server queries](./server-queries.md).

**The query model without React.** `@adapttable/core/query` is the half of the
model a backend needs and no more: the `ft=1.{…}` codec (`parseFilterTree`,
`serializeFilterTree`, `isActiveFilterTree`, `FILTER_TREE_PARAM`,
`FILTER_TREE_VERSION`), the `pivot=rows:…` codec (`serializePivot`,
`deserializePivot`, plus `serializePivotState` / `deserializePivotState` for the
whole `PivotUrlState` — the `config` and the folded `collapsed` keys), the
`formula=key:text` codec (`serializeFormulaColumns`,
`deserializeFormulaColumns`, `FormulaColumnSpec`), `isFilterGroup` for walking a
tree, and the types they speak in — `QueryCondition`, `QueryFilterGroup`,
`SortLevel`, `SortDirection`,
and the pivot pair `PivotConfig` (`rows`, `columns`, `measures`, `subtotals`,
`grandTotals`) and `PivotMeasure` (a column `key`, an `agg`, an optional
`label`). Every name is the same one `@adapttable/core` exports, from the same
module; this entry only omits the hooks, so it carries no `"use client"`
boundary and no React import and loads where React is not installed. See
[server queries](./server-queries.md#decoding-a-parameter-yourself).

**Formulas.** `buildFormulaColumns(specs)` from `@adapttable/core/formula`
turns `FormulaColumnSpec`s into columns, returning a `FormulaColumnsResult`:
the columns, the `errors` that would not parse, and any `cycles`. A value is a
tagged `FormulaValue` (`FormulaErrorCode`, `FORMULA_ERRORS`, `FORMULA_BLANK`),
built with `formulaNumber` / `formulaText` / `formulaBoolean` / `formulaError`
or read off a row with `toFormulaValue`, rendered with `formulaDisplay`,
compared with `formulaSortValue`, and tested with `isFormulaError`.
`parseFormula` returns a `ParseResult` holding a `FormulaNode` tree
(`BinaryOp`), `formulaRefs` names what a formula reads, `evaluateFormula` runs
one against a `FormulaScope`, and `FORMULA_FUNCTIONS` lists the built-ins,
including `POWER` and `SQRT`. See [formulas](./formulas.md).

**Formulas in the URL.** `useFormulaUrlState({ urlAdapter, urlSync, urlKey,
defaultFormulas })` from `@adapttable/core/formula` returns a
`UseFormulaUrlStateResult` — the `formulas` to hand `buildFormulaColumns`, and
an `onFormulasChange` that persists them; `UseFormulaUrlStateOptions` names the
options and `FORMULA_URL_WRITE_DEBOUNCE_MS` is the trailing debounce on the URL
write. `serializeFormulaColumns` and `deserializeFormulaColumns` are the
encoding on its own, exported from `@adapttable/core/formula` and from the
React-free `@adapttable/core/query`; reading produces `FormulaColumnSpec`s and
never evaluates anything. Saved views capture the parameter with the rest.

**The pivot engine.** `pivot(rows, options)` from `@adapttable/core/pivot`
returns a `PivotResult`: `columnTree`, a tree of `PivotColumnNode`s carrying
each dimension value's `label`, `path`, header `span` and `children`;
`columnLeaves`, the rendered columns left to right as `PivotColumnLeaf`es (a
stable `key`, the column `path`, the `measure` shown in it, and `total` for the
grand-total column); `rows`, the body as `PivotRow`s (`key`, `path`, `depth`,
a `PivotRowKind` of `"leaf"` / `"subtotal"` / `"grandTotal"`, `label`, `cells`
in `columnLeaves` order, and the `count` of source rows behind the line); and
`rowDepth`, how many dimensions sit down the side. `PivotOptions` carries the
`columns` — so dimension and measure values resolve through `sortValue` exactly
as sorting and grouping do — a `format` for a computed cell, and the
`collapsed` subtotal keys. A row with no value for a dimension buckets under
`PIVOT_BLANK` instead of vanishing, and the grand-total line's key is
`PIVOT_GRAND_TOTAL_KEY`. See [pivot tables](./pivot.md).

**Editing a pivot configuration.** The panel's non-widget half, so every kit's
buttons agree on what a move means. A `PivotField` is a column `key` plus the
`label` to show it under, and `PIVOT_ZONES` lists the `PivotZone`s a field can
sit in — `"rows"`, `"columns"`, `"measures"` — in panel order.
`availableFields(fields, config)` is what no axis has claimed yet;
`assignField(config, key, zone, index)` places a field (past the end appends,
and a dimension leaves the other axis rather than pivoting twice);
`removeField(config, zone, index)` takes one off; `moveField(config, zone,
index, delta)` is the keyboard step within a zone; and `setMeasureAgg(config,
index, agg)` changes what a measure computes. Each returns a new `PivotConfig`,
starting from `EMPTY_PIVOT_CONFIG`. `isPivotReady(config)` is false while no
measure has been chosen — a half-built configuration the panel shows and the
table waits on, not an error. `measureLabel(measure, fields)` is the caption
the panel and the column header share. See [pivot tables](./pivot.md).

**Pivot state in the URL.** `usePivotUrlState({ urlAdapter, urlSync, urlKey,
defaultConfig })` from `@adapttable/core/pivot` returns a
`UsePivotUrlStateResult` — the `config` to hand both the panel and `pivot`, an
`onConfigChange` that persists it, the folded `collapsed` set to pass as
`pivot`'s `collapsed` option, and `onCollapsedChange`;
`UsePivotUrlStateOptions` names the options. An empty pivot writes no
parameter. See [URL state](./url-state.md).

**Pivoting on the server.** `serverPivotResult(page, options)` from
`@adapttable/core/pivot` turns a server's answer into the same `PivotResult`
the local engine returns, so one rendering path serves both tiers. A
`QueryPivotPage` is the column-dimension `columns` paths in display order, the
body `rows`, and the `total` line when the server computed one; each
`QueryPivotRow` is a row `path` (empty for the grand total), its `cells` in
column-then-measure order, optional `totals` for the grand-total column, a
`count`, and `subtotal` when the line totals the ones beneath it. Absent cells
render empty rather than zero. `ServerPivotOptions` is the `config` that was
sent — for the measures and their order — plus the same `format`. See
[server queries](./server-queries.md).

**The pivot configuration panel.** `PivotPanelChrome` from
`@adapttable/core/adapter` renders the three zones and the controls that move
fields between them; `PivotPanelChromeProps` takes the fields, the config and
an `onChange`. `PivotPanelSlots` names the five kit-supplied pieces —
`PivotPanelSurfaceProps` (the body), `PivotZoneProps` (a titled zone),
`PivotFieldProps` (one field with its move and remove controls),
`PivotAddProps` (the add control) and `PivotAggProps` (a measure's aggregation
chooser). Keyboard-first by construction: the move controls are buttons, so
the panel needs no pointer. See [pivot tables](./pivot.md).

**A pivot, as table props.** `pivotTableModel(result, options)` from
`@adapttable/core/pivot` turns a `PivotResult` into a `PivotTableModel` — the
`columns`, `rows`, `rowKey` and `summaryRow` a `DataTable` takes — so the pivot
is rendered by your kit rather than by markup of your own. The column tree
becomes `column.group`, the grand total becomes the footer, and the row-header
column is keyed `PIVOT_ROW_COLUMN_KEY`. `PivotTableModelOptions` are the
`fields` that caption the measures, the `labels` behind the grand-total
captions, the corner cell's `rowHeader`, the per-level `indent`, and
`renderRowHeader` — where a fold control goes, since core ships no controls.
See [pivot tables](./pivot.md#rendering-it-with-your-kit).

**Replacing a mobile card's body.** `renderCard(row, card)` returns the card's
content; the shell renders around it. `renderCard` has the type `ReactMobileCardRenderer` from `@adapttable/react`, and `card` is a
`MobileCardModel`: `index`,
`selected`, `expanded`, and `fields` — a `MobileCardField` per column carrying
its `column`, resolved `label` (`undefined` when the column asked for none) and
`value`, the same node the built-in would have shown. See
[mobile](./mobile.md).

**Replacing the error state.** `slots.error` is a `Slot<TableErrorState>`:
a node, or a function receiving the `TableErrorState` the built-in was
showing — `error`, `retry` (absent when the source cannot re-fetch, so a
static `data` array offers no dead button) and `retrying`. Adapters derive it
with `tableErrorState(source)` and resolve the slot with `fillSlot(slot,
state)`, both from `@adapttable/react/adapter`, where the slot and the node
it resolves to are React content. `@adapttable/core` exports the neutral pair
for a non-React host. See
[customization](./customization.md).

**Density chooser and fullscreen toggle.** `densityChooser()` puts a density
control in the toolbar. Without a controlled `density` prop, the feature owns
the choice and starts at `"comfortable"`; pass `density` to control it and
`onDensityChange` to observe requests. `fullscreen()` puts a fullscreen toggle
beside it, and that button hides itself where the browser will not allow
fullscreen at all. Adapters build both from `viewControlsToolbar(props,
fullscreen)` / `ViewControlsToolbar` in `@adapttable/core/adapter`. Density
is an always-resolved read/write contract passed to the toolbar slots; whether
the density button draws is decided by feature composition. Fullscreen stays
present-or-absent from the feature and browser support.
Adapters with a custom chrome path call `useResolvedDensity(props)` directly;
its `ResolvedDensity` result carries the same resolved value and request
callback.

**Fullscreen.** `useFullscreen(element)` promotes the table and returns a
`FullscreenState`: `active`, `supported`, `toggle`, `exit`, and — the part
that matters — `container`. The Fullscreen API hides everything outside the
promoted element, so an overlay portalled to `document.body` stays mounted,
focused and announced while being completely invisible. Hand `container` to
each kit's portal target and menus keep working; ignore it and they vanish.
State is read from the document rather than remembered, because Escape and
the browser's own control both leave fullscreen without asking.

**Density in the URL.** `useDensityUrlState(options)` returns a `Density`
(`"comfortable"` | `"compact"`) and `onDensityChange` to spread onto the
table when you want the choice in the URL beside sort and filters — a reload
or a shared link reproduces it. Pair with a controlled `density` prop; the
chooser works without it. `UseDensityUrlStateOptions` /
`UseDensityUrlStateResult` type it. Choosing the default removes the
parameter rather than restating it.

**Command palette.** `commandPalette` opens a palette on Cmd/Ctrl+K listing
every table action — `true` for the built-ins, or `CommandPaletteOptions`
(`{ commands, shortcuts }`) to add your own and remap the chord. A `Command`
IS a `ContextMenuItem`, so an action is written once and offered in both
places rather than drifting between them; `tableCommands(options)` builds the
target-free ones (print, export, clear filters) and `filterCommands(commands,
query)` is the case- and accent-folded substring match the input runs.
`onPrint` on `<DataTable>` is what makes Print appear. Shortcuts are data:
`Shortcut` is a chord and a command key, `DEFAULT_SHORTCUTS` is Cmd/Ctrl+K,
and `useShortcuts(options)` binds them — `mod` means Cmd on a Mac and Ctrl
elsewhere. Adapters build theirs over `CommandPaletteChrome` /
`CommandPaletteChromeProps` / `CommandPaletteSlots` /
`CommandPaletteSurfaceProps` / `CommandPaletteInputProps` /
`CommandPaletteItemProps` and arm it with `useCommandPalette` (returning a
`TableCommandPalette`; `UseCommandPaletteOptions` is the hook's input), from
`@adapttable/core/adapter`. See
[customization](./customization.md#command-palette).

**Context menus.** `contextMenu` arms right-click menus for headers, rows and
cells — `true` for the built-ins, or `ContextMenuOptions` (`{ items }`) to
append your own behind a divider. `ContextMenuItem` is one entry (`key`,
`label`, `onSelect`, and optional `disabled` / `danger` / `separatorBefore`);
`ContextMenuTarget` is what was clicked; `ContextMenuActions` are the handlers
the built-in entries call. Every route in works: right-click, Shift+F10, the
menu key, and a long press. Adapters build theirs over `ContextMenuChrome` /
`ContextMenuChromeProps` / `ContextMenuSlots` / `ContextMenuSurfaceProps` /
`ContextMenuItemProps` and arm it with `useTableContextMenu`
(`TableContextMenuOptions` is the hook's input; it returns a
`TableContextMenu`: `regionProps` to bind once, plus `items`, `at` and
`close`). `ContextMenuPoint` is the click coordinates the chrome hands the
surface. All from `@adapttable/core/adapter`. The surface slot receives an
`anchorRef` — a zero-size element at the click point — because every kit's
menu positions against an element rather than coordinates. See
[customization](./customization.md#context-menus).

**Context-menu targets.** `resolveContextTarget(from, rowFor)` works out
which header, row or cell an event happened in, returning a
`ResolvedContextTarget` — the target and the element to put focus back on —
or `null` when there is no menu there. It reads the `data-adapttable-part`
names and `ROW_ID_ATTRIBUTE` (`data-row-id`), which every kit's rows and
header cells carry, so an adapter binds one set of handlers to the element
containing all three rather than to each of them. Precedence: a cell inside a
row wins, a header cell is neither, and a click on the row outside any data
cell is a row target.

**Side panel.** `sidePanel` docks table settings beside the table instead of
in a popover over them. `SidePanelOptions` types it — `panels`, `open`,
`onOpenChange`, `side` — and `SidePanelEntry` is one panel (`key`, `label`,
`content`). It is controlled, because the control that opens it is the
host's. Adapters build theirs over `SidePanelChrome` / `SidePanelChromeProps`
/ `SidePanelSlots` / `SidePanelFrameProps` / `SidePanelTabProps` /
`SidePanelCloseProps` and dock it with `SidePanelLayout` /
`SidePanelLayoutProps` from `@adapttable/core/adapter`; the tab strip's
keyboard contract lives in core, not in each kit. See
[customization](./customization.md#side-panel).

**Status bar.** `statusBar` puts a strip under the table reading the row
range, how many rows are selected, and what a multi-cell selection adds up
to. Adapters export their kit-owned `StatusBar` over `StatusBarChrome` /
`StatusBarChromeProps` / `StatusBarSlots` / `StatusBarSlotProps` /
`StatusBarItem` from `@adapttable/core/adapter`. It hosts the selection
figures rather than repeating them: with `enabled` false the chrome renders
those alone, which is why an adapter has one element here and no branch. The
row range comes from the same arithmetic the pagination footer uses.
`StatusBarChromeProps.notices` / `TableChrome.featureNotices` carry
`FeatureNotice` values (`FeatureNoticeKind` names the inert opt-in) so a
silent no-op stays visible even when `statusBar` is off. See
[customization](./customization.md#toolbar-and-status-bar).

**Toolbar regions and undo/redo.** `toolbar` fills the middle of the toolbar;
`toolbarSlots` (`ToolbarSlots` — `start`, `end`) fills either end.
`undoRedoButtons` adds Undo and Redo, which render only when `editHistory` is
armed and disable rather than disappear; `undoRedoToolbar(wanted, history,
labels)` from `@adapttable/core/adapter` is the one rule both wiring paths
resolve that with. Labels are `undoEdit` and `redoEdit`. `printButton` adds a
Print button, which renders only when `onPrint` is also wired;
`printToolbar(wanted, onPrint, labels)` resolves that pair the same way
(`PrintToolbar` is the resolved `{ onPrint, label }`), and
the caption is `labels.print`. See
[customization](./customization.md#toolbar-and-status-bar).

**Reading a cell as text.** `columnText(column, row)` returns a column's cell
as a string for anything that cannot render JSX. It resolves
`formatValue` → `exportValue` → `sortValue` → `accessor` when that yields a
primitive → the key's data path, and never returns `undefined`. The data path
is used only for a column that renders no cell of its own: a column with
`accessor: () => null` shows an empty cell, so reading its path would announce
a value the user cannot see. See [columns](./columns.md).

**Odds and ends.** `ComputedColumnSpec` is the declaration
[`computed`](./columns.md) takes. `TableQueryKeyOptions` options the cache-key
builders. `HeaderSelectionState` is the header checkbox's tri-state.
`defaultSearchText` is the default searchable-text projector (a row's own
values, flattened). `columnMenuLabel` gives a column its readable name in the
menu (header string → `mobileLabel` → key). `runRowAction` runs a row action
through the confirmation handler. `visibleRowActions` drops `isHidden` entries
from a resolved list. `LayoutStorage` is the slice of the `Storage`
API the column-layout hook needs, injectable for tests. `SavedViewsMenu` /
`SavedViewsLabels` are the adapters' saved-views control and its strings, and
`ToolbarChromeProps` is the toolbar's kit-agnostic prop surface. The CLI
exports `Kit`, the union of UI kits `@adapttable/cli init` can detect.

**Locale exports.** `@adapttable/i18n` exports one label set per locale, named
by its tag: `ar`, `de`, `en`, `es`, `fa`, `fr`, `he`, `hi`, `it`, `ja`, `ko`,
`pt`, `ru`, `tr`, `ur`, `zh`, `zhTW` — seventeen in all. See
[i18n & RTL](./i18n-rtl.md).

Adapter-machinery names (`headerGroupRows`, `insertExtraRows`, `useFullscreen`,
`columnMenuActions`, `BodyCell`, …) resolve only from
`@adapttable/core/adapter`. The aggregate `useChromeBodyData` hook is gone;
choose `usePlainChromeBodyData` or `useVirtualChromeBodyData`.

Notable non-hook helpers: `rowsToCsv` / `downloadCsv` / `downloadTableCsv`
(CSV export — or compose `exportCsv()` for a built-in button),
`sortRows` / `sortRowsMulti` / `compareValues` / `nextSort`,
`computePagination`, `headerGroupRow` / `headerGroupRows` /
`htmlGroupedHeaderPlan` / `groupedHeaderChildRule` /
`groupedHeaderCellStyle` / `groupedHeaderLabelStyle` / `groupedHeaderAlign` / `columnGroupStubStyle` / `COLUMN_GROUP_STUB_WIDTH`,
`columnGroupPath` / `columnGroupId` / `COLUMN_GROUP_ID_SEP` /
`COLUMN_GROUP_STUB_PREFIX` / `COLUMN_GROUP_RENDER_PREFIX` /
`isColumnGroupStubKey` / `isColumnGroupRenderKey` /
`isColumnGroupSummaryKey` /
`columnGroupHeaderCaption`,
`flattenColumnTree` / `isColumnGroup` / `marriedOrderHolds` /
`applyCollapsedColumnGroups` / `toggleCollapsedColumnGroup`,
`columnHeaderLabel` / `columnHeaderController` /
`resolveColumnHeader` / `resolveColumnFooter` / `columnsHaveFooter`,
`ColumnHeaderController` / `ColumnHeaderContext` / `ColumnFooterContext`,
`columnMenuRows` / `filterColumnMenuRows` / `columnMenuActions` /
`showAllColumns` / `hideAllColumns` / `unpinAllColumns` /
`resetColumnLayout`, `ColumnMenuAction` / `ColumnMenuActionContext`,
`columnRowDragProps` / `columnDropProps` / `columnReorderKeyProps` /
`columnResizeHandleProps` (RTL-aware), `pinnedCellStyle` / `edgePinStyle` /
`PIN_Z`, `tableMinWidth` / `resolveColumnWidth` / `parsePxWidth`,
`rowClickProps`, `resolveFilterDefs` / `buildFilterRuntime` /
`filterPredicate` / `showSimpleFilterFields` / `materializeAutoOptions` / `clearedFilterExtras`,
`builtInFilterSpecs` / `defaultFilterRegistry` / `resolveFilterRegistry` /
`createFilterRegistry` / `emptyFilterRegistry` / `filterTypeSpec` /
`filterWidgetKind` / `filterTypeOps` / `filterTypeDefaultOp` /
`renderRegisteredFilter`,
`mergeProps`, `stableKey`, `getPath`, `humanizeKey`, `resolveLabels` /
`defaultLabels`, `pageSizeOptions`, and the constants `DEFAULT_LIMIT` (25),
`PAGE_SIZE_OPTIONS`, `SEARCH_DEBOUNCE_MS` (300), `AUTO_OPTIONS_LIMIT` (50),
`ACTIONS_COLUMN_KEY` (`"actions"`).

## Feature composition types

| Export                         | What it is                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TableFeature<TRow>`           | A composed feature: `id`, optional `apply`, `setup`, `provider` and `renders`. Row-aware factories return this and infer `TRow` from their callback.             |
| `StaticTableFeature`           | A feature whose configuration says nothing about rows — `grouping("team")`, `virtualize()`, `columnMenu()`. Composes into any table with no type argument.       |
| `TableFeatureHost<TRow>`       | What `setup(host)` registers against: filter types, editors, aggregators, writers, column-menu actions, panels, commands, context-menu items.                    |
| `StaticFeatureHost`            | The same host minus the two row-shaped registrations, which is what a static feature sees.                                                                       |
| `standardFeatures(options?)`   | On each kit's `/preset` entry: the zero-configuration members plus the ones whose options you supply. Returns a plain array you can extend.                      |
| `StandardFeatureOptions<TRow>` | `grouping`, `bulkActions`, `filters`, `savedViews` — each the argument its own factory already takes.                                                            |
| `AdapterGroupingPanelFeature`  | The overloaded kit `groupingPanel()` factory after an adapter supplies its group headers and panel chrome.                                                       |
| `GroupingExtras<TRow>`         | Everything `grouping` takes beyond the key, including the row-shaped `groupAggregates` and `groupSort`.                                                          |
| `StaticGroupingExtras`         | The subset that says nothing about the row — paging, collapse state, footers — so `grouping(key, thoseOnly)` stays row-independent.                              |
| `FeatureProps<TRow>`           | What a feature's `apply()` writes — the props v3 removed from `<DataTable>`. A host composes the feature instead; see [upgrading from v2](./migrate-from-v2.md). |
| `ComposedTableProps<TRow>`     | `BaseDataTableProps` plus `FeatureProps`: the shape the table works with once features have applied, which is what an adapter's internals read.                  |

See [feature composition](./features.md).

## Source capabilities

What the data layer behind the table can actually do. A control that needs
more than the source has is turned OFF and says why, instead of quietly doing
something narrower — `scope: "all"` writing one page, `groupBy` doing nothing,
"select all N matching" over rows nobody can name.

| Export                                                                  | What it is                                                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TableSourceCapabilities`                                               | The declaration on `TableSource.capabilities`: `fullDataset`, `grouping`, `selectAcrossPages`, `exportScope`, `totalCount`.                                    |
| `GroupingCapability` / `ExportScopeCapability` / `TotalCountCapability` | `"client" \| "server" \| false`, `"all" \| "page"`, and `"exact" \| "loaded"`.                                                                                 |
| `sourceCapabilities(source, support?)`                                  | The one place the answer is decided: the source's own declaration when it has one, otherwise inferred from its shape (and `QuerySupport.grouping` when given). |
| `CapabilitySource`                                                      | The handful of fields that read consults — enough to ask without holding a whole source.                                                                       |
| `capabilityReason(capability)`                                          | The sentence a kit puts on the control it disabled. Localized copy overrides it through `TableLabels`.                                                         |
| `offersAllMatching(selection, total)`                                   | Whether the "select all N matching" banner applies: the source can reach past the page, the page is fully selected, and more rows match.                       |

| Capability          | Runtime consequence                                                                                                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fullDataset`       | When false, only the page on screen is reachable.                                                                                                                                                                                          |
| `grouping`          | When false, `groupBy` is ignored, the status bar carries `noticeGroupingUnavailable`, and dev mode warns.                                                                                                                                  |
| `selectAcrossPages` | When false, selection stays on the rows on screen; the banner never appears and `selectAllMatching()` no-ops.                                                                                                                              |
| `exportScope`       | `"all"` permits a source-owned full export only when `allFilteredRows` actually supplies the rows. A declaration alone is not transport. `request` or `fetchAll` is an independent executable route; with none, Export all stays disabled. |
| `totalCount`        | `"loaded"` means `total` is what has loaded rather than the match count.                                                                                                                                                                   |

Omitting `capabilities` changes nothing: the same answers are inferred from
the source's shape. See [data tiers](./data-tiers.md#what-a-source-can-do--capabilities).

## Types

| Type                                                                                                                                                                                                                                                                                                                     | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TableSource<TRow>`                                                                                                                                                                                                                                                                                                      | The uniform data + state contract a table consumes (rows, total, `defaultLimit`, `allFilteredRows`, `allSearchedRows`, `facets`, loading flags, state read/write). Server grouping that cannot honour `query.aggregates` sets `honorsAggregates: false`.                                                                                                                                                                                                                                             |
| `TableQuery`                                                                                                                                                                                                                                                                                                             | The consolidated server-tier query: `page`, `limit`, `search`, `sortBy`, `sortDir`, `sortLevels`, `filters`.                                                                                                                                                                                                                                                                                                                                                                                         |
| `TableQueryParams`                                                                                                                                                                                                                                                                                                       | Baseline query params a backend list endpoint receives.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `QuerySupport`                                                                                                                                                                                                                                                                                                           | What a server endpoint can answer: `grouping`, `aggregates`, `filterTree`, `facets`, `cursor`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `QueryExtensions`                                                                                                                                                                                                                                                                                                        | The optional query fields those capabilities unlock, carried on `TableQuery`.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `QueryAggregate`                                                                                                                                                                                                                                                                                                         | One aggregate to compute: `{ key, fn }` where `fn` is a `AggregateFn` or your backend's own name.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `aggregate`                                                                                                                                                                                                                                                                                                              | Builds a `summaryRow` / `groupAggregates` mapper from a declaration — see [row grouping](./row-grouping.md).                                                                                                                                                                                                                                                                                                                                                                                         |
| `AggregateName` / `AGGREGATE_NAMES`                                                                                                                                                                                                                                                                                      | The built-in aggregate names: `sum`, `avg`, `count`, `min`, `max`.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Aggregator` / `AggregateSpec` / `AggregateOptions`                                                                                                                                                                                                                                                                      | A custom aggregate function, the per-column declaration, and `aggregate()`'s options (`columns`, `format`).                                                                                                                                                                                                                                                                                                                                                                                          |
| `Aggregatable` / `AggregatableConfig` / `AggregateOperation` / `CustomAggregateOperation`                                                                                                                                                                                                                                | A column's reader-controlled offer: `false` / `true` / `{ default?, operations }`. `operations` is built-in names or `{ id, label, calculate? }`.                                                                                                                                                                                                                                                                                                                                                    |
| `AggregateOperationId`                                                                                                                                                                                                                                                                                                   | A built-in name or a host's own stable id. Sent to a server; never a function.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ResolvedAggregatable` / `ResolvedAggregateOperation` / `resolveAggregatable` / `resolveAggregatableColumns` / `impliedOperations`                                                                                                                                                                                       | The validated offer for one column or every column. `aggregatable: true` reads `impliedOperations` from the declared filter/editor type.                                                                                                                                                                                                                                                                                                                                                             |
| `allowsOperation` / `allowsReaderOperation` / `offerableOperations` / `AggregationSourceSupport`                                                                                                                                                                                                                         | The one execution gate: a column must offer the id, and the source must be able to compute it.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `AggregationModel` / `AggregationModelInput` / `AggregationItem` / `AggregationCandidate` / `AggregationOrigin` / `aggregationModel`                                                                                                                                                                                     | The list the panel and column menu both draw: active items, addable candidates, whether the reader is still at the developer's defaults, and `hasDefaults` when restore would put a developer baseline back.                                                                                                                                                                                                                                                                                         |
| `resolveEffectiveAggregation` / `EffectiveAggregation` / `EffectiveAggregationInput` / `EffectiveAggregationKind` / `effectiveAggregateOps` / `readerControlAllowed` / `columnAggregationSignature`                                                                                                                      | Shared precedence for display and execution: a valid reader override or permitted suppression, then a valid executable column default, then the original host mapper or request. `EffectiveAggregationKind` is that one owner. `effectiveAggregateOps` is the map the calculator and the first server request both use.                                                                                                                                                                              |
| `toAggregateInstant` / `toAggregateOrdered` / `AggregateOrderedValue`                                                                                                                                                                                                                                                    | How `min` / `max` compare a value: a `Date`, a finite number, or a strict ISO date / datetime / time string (`AggregateOrderedValue`). Locale forms are skipped, not guessed.                                                                                                                                                                                                                                                                                                                        |
| `addAggregation` / `removeAggregation` / `restoreAggregationDefaults` / `reconcileAggregations` / `initialOperation` / `declaredByDeveloper` / `AGGREGATE_SUPPRESSED`                                                                                                                                                    | Reader transitions and URL/saved-view cleanup. Removing a developer default writes `AGGREGATE_SUPPRESSED` (`"none"`) only while the reader may still choose that column.                                                                                                                                                                                                                                                                                                                             |
| `computedAggregateKeys`                                                                                                                                                                                                                                                                                                  | Column keys that already have an aggregate cell in the current group rows — enough to show a read-only opaque mapper, not enough to name its operation.                                                                                                                                                                                                                                                                                                                                              |
| `CUSTOM_AGGREGATE` / `DeclaredAggregates` / `declaredAggregates` / `withDeclaredAggregates` / `GroupAggregatesMapper`                                                                                                                                                                                                    | Metadata on `aggregate()`: a declared mapper's operation ids, or `CUSTOM_AGGREGATE` when the host supplied a function. `withDeclaredAggregates` tags a mapper so Restore defaults can name those ids.                                                                                                                                                                                                                                                                                                |
| `AggregateFn`                                                                                                                                                                                                                                                                                                            | The standard aggregate names: `sum`, `avg`, `count`, `min`, `max`.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `QueryCondition` / `QueryFilterGroup`                                                                                                                                                                                                                                                                                    | A leaf condition (`key`, `op`, `value`) and a nestable AND/OR group of them.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `isFilterGroup`                                                                                                                                                                                                                                                                                                          | Narrows a filter-tree child to a nested group while walking the tree.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `PaginatedResponse<TRow>`                                                                                                                                                                                                                                                                                                | Standard envelope: `items`, `total`, `page`, `limit`, `hasNext`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ColumnLayoutState`                                                                                                                                                                                                                                                                                                      | `{ hidden, order, pinned, widths, names?, collapsedGroups? }` — the column-layout shape.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ColumnGroupDef<TRow>` / `ColumnInput<TRow>`                                                                                                                                                                                                                                                                             | A parent header with `children`, or a leaf-or-parent union. See [column groups](./column-groups.md).                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ColumnGroupShow`                                                                                                                                                                                                                                                                                                        | `"open" \| "closed" \| "always"` — when a leaf under a collapsible group is visible.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ColumnGroupRecord` / `FlattenedColumns`                                                                                                                                                                                                                                                                                 | Collapse policy for one parent, and the `{ leaves, groups }` result of `flattenColumnTree`.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `TableLabels`                                                                                                                                                                                                                                                                                                            | Every string the table renders; all keys optional, English defaults fill gaps.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `RowAction<TRow>` / `BulkAction`                                                                                                                                                                                                                                                                                         | Action definitions with `disabledReason`, `isHidden`, optional `confirm` wiring.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `RowActionsLayout`                                                                                                                                                                                                                                                                                                       | `"buttons" \| "menu"` — omit / `"buttons"` is the strip; `"menu"` is the 3-dot control.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `RowActionsRenderContext<TRow>` / `RowActionsRenderer<TRow>`                                                                                                                                                                                                                                                             | What `renderRowActions` receives (`row`, `actions`, `confirm`, `labels`) / the renderer type.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `visibleRowActions`                                                                                                                                                                                                                                                                                                      | Filters `isHidden` actions out of a resolved list. Default layouts use this; a custom cell can keep hidden ones.                                                                                                                                                                                                                                                                                                                                                                                     |
| `BulkActionContext`                                                                                                                                                                                                                                                                                                      | `{ allMatching, total }` — scope handed to a bulk action handler.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ActionConfirm<TArg>`                                                                                                                                                                                                                                                                                                    | Confirmation dialog wiring (`title`, `message`, `confirmLabel`, `danger`).                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `ActionAiOptions` / `ActionApprovalPolicy` / `ApprovalPresentation`                                                                                                                                                                                                                                                      | What a row or bulk action says about being invoked by an agent — approval overrides that inherit field by field from the shared assistant configuration / `"required"` or `"automatic"`, whether a human is asked / `"widget"`, `"table"` or `"modal"`, where they are asked. Distinct from `confirm`, which is a person confirming their own click. See [agent capabilities](./agent-capabilities.md).                                                                                              |
| `ConfirmHandler` / `ConfirmRequest`                                                                                                                                                                                                                                                                                      | The injectable confirmation seam (`(request) => void`).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `defaultConfirm`                                                                                                                                                                                                                                                                                                         | The built-in `ConfirmHandler` (`window.confirm`; DENIES when no dialog exists).                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `ActiveFilterChip` / `ChipLabelResolver`                                                                                                                                                                                                                                                                                 | One removable chip (`key`, `label`, `onRemove`) / value → chip-label function.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `UrlStateAdapter`                                                                                                                                                                                                                                                                                                        | The router seam: `getSearch()`, `setSearch(search, { push? })`, `subscribe(onChange)`.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `SavedView`                                                                                                                                                                                                                                                                                                              | `{ name, search }` — one captured view.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `FilterDef` / `FilterType` / `FilterOption` / `FilterOptionsSource`                                                                                                                                                                                                                                                      | The declarative filter surface (see [FilterDef](#filterdef)).                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `FilterTypeSpec` / `FilterTypeRegistry` / `FilterWidgetKind`                                                                                                                                                                                                                                                             | One registered type / the immutable registry / which built-in widget to draw. `register` / `extend` are deprecated — use `TableFeatureHost.registerFilterType` / `extendFilterType`.                                                                                                                                                                                                                                                                                                                 |
| `FilterWidgetRenderProps`                                                                                                                                                                                                                                                                                                | Props a custom `FilterTypeSpec.render` receives.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `CellProps<TRow>`                                                                                                                                                                                                                                                                                                        | `{ row, rowIndex }` — what a `Cell` component receives.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `SortDirection` / `SortLevel`                                                                                                                                                                                                                                                                                            | `"asc" \| "desc"` / one entry in the multi-sort chain.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Direction`                                                                                                                                                                                                                                                                                                              | `"ltr" \| "rtl"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ColorScheme`                                                                                                                                                                                                                                                                                                            | `"light" \| "dark" \| "auto"`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PaginationMode`                                                                                                                                                                                                                                                                                                         | `"infinite" \| "paged" \| "auto"` (`"auto"` resolves by viewport: mobile → infinite).                                                                                                                                                                                                                                                                                                                                                                                                                |
| `FilterValue` / `ExtraFilters`                                                                                                                                                                                                                                                                                           | One URL-round-tripped filter value / the keyed bag of them.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ColumnMetadata<TRow>` / `ColumnModel<TRow>`                                                                                                                                                                                                                                                                             | The neutral column the engine reads, and its alias on the main entry. `ColumnDef` is the React column that extends it.                                                                                                                                                                                                                                                                                                                                                                               |
| `ColumnModelFilter<TRow>` / `ColumnModelEditor`                                                                                                                                                                                                                                                                          | A neutral column's declarative filter and editor, before a binding narrows them — `ColumnDef` narrows both to `ColumnFilter` and `CellEditor`.                                                                                                                                                                                                                                                                                                                                                       |
| `DisplayValue`                                                                                                                                                                                                                                                                                                           | What a binding stores for a cell it will render — a primitive, or an object only that binding understands. The engine hands it back untouched and stringifies it only when it is already a primitive. React's faces of these say `ReactNode` instead.                                                                                                                                                                                                                                                |
| `MobileCardRenderer<TRow>`                                                                                                                                                                                                                                                                                               | The neutral mobile-card renderer. A React table wants `ReactMobileCardRenderer`, whose field values are `ReactNode`.                                                                                                                                                                                                                                                                                                                                                                                 |
| `SummaryRowFn<TRow>`                                                                                                                                                                                                                                                                                                     | Map a set of rows to per-column summary cells — one shape for `summaryRow` and `groupAggregates`. The React face of core's neutral `GroupAggregatesFn`, so its values are `ReactNode`.                                                                                                                                                                                                                                                                                                               |
| `ReactComputedColumnSpec<TRow, TValue>`                                                                                                                                                                                                                                                                                  | Input to `computed` from `@adapttable/react`: the neutral spec with a React `column`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `ReactFormulaColumnsResult<TRow>`                                                                                                                                                                                                                                                                                        | What `buildFormulaColumns` from `@adapttable/react/formula` returns — the neutral result with `ColumnDef` columns.                                                                                                                                                                                                                                                                                                                                                                                   |
| `ReactColumnGroupDef<TRow>`                                                                                                                                                                                                                                                                                              | A parent header whose children are React `ColumnDef`s.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ReactUseColumnLayoutResult<TRow>`                                                                                                                                                                                                                                                                                       | `useColumnLayout`'s result over React columns.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ReactMobileCardField<TRow>` / `ReactMobileCardModel<TRow>` / `ReactMobileCardRenderer<TRow>`                                                                                                                                                                                                                            | One card field / a card's model / a custom card body, with `ReactNode` values rather than the neutral model's `DisplayValue`. See [mobile cards](./mobile.md).                                                                                                                                                                                                                                                                                                                                       |
| `ReactColumnResizeHandleProps` / `toReactColumnResizeHandleProps`                                                                                                                                                                                                                                                        | Resize-handle props typed for a React element / convert the neutral props to them. For adapter authors, from `@adapttable/react/adapter`.                                                                                                                                                                                                                                                                                                                                                            |
| `TableEngineConfigPatch<TRow>`                                                                                                                                                                                                                                                                                           | Live configuration a binding replays onto a committed engine: the incremental query options plus `locale`, `paginationMode`, `page` and `limit`.                                                                                                                                                                                                                                                                                                                                                     |
| `CapabilityPlan` / `CapabilityStaging`                                                                                                                                                                                                                                                                                   | A governed write's side-effect-free proposal / whether a capability honours `commit: "stage"`. See [AI integrations](./ai-integrations.md).                                                                                                                                                                                                                                                                                                                                                          |
| `CapabilityPartial`                                                                                                                                                                                                                                                                                                      | Whether a capability's `execute` applies `plan.payload` rather than its own arguments, and may therefore be offered for row-by-row approval. Defaults to `"unsupported"`. See [agent capabilities](./agent-capabilities.md).                                                                                                                                                                                                                                                                         |
| `ApprovalSubject` / `ApprovalResult`                                                                                                                                                                                                                                                                                     | What a reader is asked to confirm — the rows a write touches, or the operation behind a write that enumerates none / what they decided: a boolean for the whole write, or the positions they approved. See [agent capabilities](./agent-capabilities.md).                                                                                                                                                                                                                                            |
| `SharedApproval`                                                                                                                                                                                                                                                                                                         | The assistant's own approval defaults — the policy string it already took, or `{ policy, presentation }`. An action overrides either field on its own through `ai`. See [agent capabilities](./agent-capabilities.md).                                                                                                                                                                                                                                                                               |
| `SortableValue`                                                                                                                                                                                                                                                                                                          | Comparable primitive returned by a sort-value extractor.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `SortByOption`                                                                                                                                                                                                                                                                                                           | `{ value, label }` for the mobile sort-by select.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GetCellSpan` / `GetCellSpanArgs` / `TableBodyCell` / `BodyCell` / `CellSpanRequest` / `CellSpanAppearance`                                                                                                                                                                                                              | Span callback / `{ row, column, rowIndex, columnIndex, sectionRows, sectionRowIndex }` / one rendered body cell on the main / adapter entry / `{ colSpan?, rowSpan? }` / `"merged" \| "plain"`. See [row and column spanning](./row-spanning.md).                                                                                                                                                                                                                                                    |
| `ExtraRow` / `TableExtraEntry` / `ExtraEntry` / `ExtraRowKind`                                                                                                                                                                                                                                                           | Host-injected slot / the spliced main-entry / adapter-entry shape / `"separator" \| "fullWidth"`. See [full-width and separator rows](./full-width-rows.md).                                                                                                                                                                                                                                                                                                                                         |
| `insertExtraRows` / `insertExtrasBeforeRows` / `extraRowsForSection` / `isExtraEntry` / `extraRowsArmed` / `EXTRA_ROW_PARTS` / `EXTRA_OVER_SPAN_ROW_STYLE` / `EXTRA_OVER_SPAN_STYLE` / `extraHostFillStyle` / `extraCountBeforeRowIds` / `inflateBodyCellRowSpans` / `extraCoveredTableSlots` / `extraUncoveredColSpans` | Splice extras into a `kind`-tagged list / splice named extras in front of a pin section / extras whose target sits in this section / narrow one / whether any were asked for / the part names kits stamp / lift an extra above a continuing span / extra cell padding and RTL align / the host `rowStyle` fill for that extra's person / count extras in front of ids / grow a row span so extras do not drop the last person / slots an extra would leave open / uncovered colSpans for that extra. |
| `RowStyle` / `RowHeight`                                                                                                                                                                                                                                                                                                 | Per-row style callback / a number or `(row, index) => number`. See [row styling and heights](./row-styling.md).                                                                                                                                                                                                                                                                                                                                                                                      |
| `resolveRowStyle` / `resolveRowHeight` / `rowStyleSignature`                                                                                                                                                                                                                                                             | Merge style + height / read one height / memo digest of the resolved style.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `rowStyleArmed` / `estimateFromRowHeight`                                                                                                                                                                                                                                                                                | Whether either hook was passed / virtualizer `estimateSize` from `rowHeight`.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `RowPinState` / `RowPinSide`                                                                                                                                                                                                                                                                                             | `{ top, bottom }` id lists / `"top" \| "bottom"`. See [row pinning](./row-pinning.md).                                                                                                                                                                                                                                                                                                                                                                                                               |
| `RowPinningState` / `RowPinLabels`                                                                                                                                                                                                                                                                                       | Headless pin state and the three action strings.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ExportCsvProp`                                                                                                                                                                                                                                                                                                          | The configuration accepted by `exportCsv()`: `true`, an `ExportCsvOptions`, or absent. See [export](./customization.md#export).                                                                                                                                                                                                                                                                                                                                                                      |
| `WidthColumn`                                                                                                                                                                                                                                                                                                            | A column reduced to what width resolution reads — its `key` and declared `width`.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GroupedHeaderAlign`                                                                                                                                                                                                                                                                                                     | Alignment of a spanning group header: `"start"`, `"center"` or `"end"`. See [column groups](./column-groups.md).                                                                                                                                                                                                                                                                                                                                                                                     |
| `BuildGroupedFlatModelOptions`                                                                                                                                                                                                                                                                                           | What `buildGroupedFlatModel` flattens — `rows`, `groupBy`, `columns`, `getRowId` and the collapse/aggregate options. See [row grouping](./row-grouping.md).                                                                                                                                                                                                                                                                                                                                          |
| `HorizontalOverflow`                                                                                                                                                                                                                                                                                                     | `useHorizontalOverflow`'s result — a callback `ref` and `overflowing`, true only while the content is wider than its wrapper.                                                                                                                                                                                                                                                                                                                                                                        |
| `FeatureNoticeAppearance`                                                                                                                                                                                                                                                                                                | How an inert feature already looks to the person at the table: `"off"`, `"disabled"` or `"one-page"`.                                                                                                                                                                                                                                                                                                                                                                                                |
| `SESSION_ATTR`                                                                                                                                                                                                                                                                                                           | `data-adapttable-header-filter` — the attribute tying a header filter's trigger to its overlay, so one editing session is identifiable across both. See [filtering](./filtering.md).                                                                                                                                                                                                                                                                                                                 |
| `TableCommandOptions`                                                                                                                                                                                                                                                                                                    | What `tableCommands` needs for the table-wide entries: labels, plus `onPrint` / `onExport` / `onClearFilters` and `hasFilters`.                                                                                                                                                                                                                                                                                                                                                                      |
| `UseShortcutsOptions`                                                                                                                                                                                                                                                                                                    | What `useShortcuts` needs: `enabled`, the `shortcuts` list, `onCommand`, and where to listen.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `ValidationCheckResult`                                                                                                                                                                                                                                                                                                  | The outcome of `EditValidationState.check` — `allowed`, and `error` when it is not. See [cell editing](./cell-editing.md).                                                                                                                                                                                                                                                                                                                                                                           |
| `editableCellController`                                                                                                                                                                                                                                                                                                 | Derives one cell's editing controller. Returns `mode: "display"` whenever the host passed no `onCellEdit`, so a table that never opted in renders exactly as before.                                                                                                                                                                                                                                                                                                                                 |
| `FeatureHostState`                                                                                                                                                                                                                                                                                                       | The registrations a feature's `setup` collected — filter types, queued patches, menu factories, side-panel entries — as the table reads them. See [feature composition](./features.md).                                                                                                                                                                                                                                                                                                              |
| `FilterTypeExtend`                                                                                                                                                                                                                                                                                                       | One queued `extendFilterType` patch: the `type` being extended and the `patch` merged onto its spec.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ColumnMenuActionFactory`                                                                                                                                                                                                                                                                                                | A plugin's extra column-menu actions, appended after the built-ins.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ContextMenuItemsFactory`                                                                                                                                                                                                                                                                                                | A plugin's extra context-menu entries, appended after the built-ins.                                                                                                                                                                                                                                                                                                                                                                                                                                 |

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
`UseColumnLayoutUrlStateResult`, `UseRowPinningUrlStateOptions` /
`UseRowPinningUrlStateResult`, `UseQuerySourceOptions` (`selectPage` plus
optional `selectorKey` to re-project unchanged pages),
`UseActiveFilterChipsOptions`,
`UseExtraChipsOptions`, `UseBulkActionRunnerOptions`,
`UseBulkBarStateOptions`, `UseInfiniteScrollOptions`,
`UseScrollToTableTopOptions`, `UseTableVirtualizationOptions`,
`MountStaggerOptions`.

## The adapter contract

Everything the eight built-in adapters are made of ships from its own
entry point, **`@adapttable/core/adapter`** — the same public surface a
ninth adapter would use; there are no private channels. Same package,
same semver promise as the main entry. This tier is aimed at adapter
authors; app code rarely (if ever) imports from it:

```ts
import { useDataTableShell, paginationSlots } from "@adapttable/core/adapter";
```

A handful of names stay on the main entry even though adapters also use
them, because app-facing signatures reach them (`PinSide` in the column
layout state, `PaginationInfo` from `computePagination`, the
`useDataTable` prop-getter payload types, `ResolvedPaginationMode`,
`TableLayout`).

**Orchestration.** `useDataTableShell(props, renderAutoForm)` is the whole
shared engine behind a batteries-included `<DataTable>` — it resolves the
data tier, builds the declarative-filter runtime, wires the chrome, and
returns the `tableProps` / `toolbarProps` bundles
(`DataTableShellTableProps`, `DataTableShellToolbarProps`,
`DataTableShellChromeProps`, `DataTableShellGroupingPanelProps`).
`useStickyToolbarLayout`
and `resolveStickyToolbar` park search and page-size with a sticky header.
`DataTableShellProps`
is its kit-agnostic prop surface and `DataModeProps` the discriminated
`mode` union inside it (`mode="server"` requires `onQueryChange` at
compile time). `tableRenderModel(props)` / `TableRenderModel` derive the
shared render prelude from `SharedTableRenderProps`; `TableBodyRegion`
names which body region renders (desktop rows, mobile cards);
`VirtualTableRow` is one materialized virtual row/card entry.
HTML kits assemble the desktop table through `useDesktopTableAssembly`
(`DesktopAssemblyOptions` / `DesktopAssemblyProps` in,
`DesktopTableAssembly` out) and `createDesktopRow` — wiring, not pixels.
The reserved chrome widths are `DESKTOP_SELECTION_WIDTH`,
`DESKTOP_EXPANSION_WIDTH`, `DESKTOP_ACTIONS_WIDTH` (override via
`DesktopChromeWidths`). The plan names `DesktopHeaderLeaf`,
`DesktopTablePin`, `DesktopRowWiring`, `DesktopRowSlot`, `DesktopBodySlot`,
`DesktopGroupSlot`, `DesktopGroupEntry`, `DesktopExtraSlot`, and
`DesktopVirtualPadSlot`. Ant Design stays on its native `<Table>`. See
[customization](./customization.md#desktop-table-assembly).
`useResolvedAdapter` resolves the URL backend the way the shell does;
`PageSelector` projects a fetched page to rows, an optional total, and
optional `facets`, and
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
`ColumnMenuChromeProps`, `ColumnMenuSlotProps`, `ColumnMenuRow`, `ColumnMenuLabels`,
`ColumnDragState`, `ColumnDragRowAttrs`, `ColumnDropProps`,
`ColumnRowDragProps`, `ColumnReorderKeyProps`,
`ColumnResizeHandleProps` and `COLUMN_DND_MIME` power the column menu's
reorder/resize/pin rows. Toolbar glue: `SearchInputState` (debounced
search binding), `FilterTriggerToggle` (popover/drawer trigger
handlers). Editing/grouping glue: `focusEditorOnMount`,
`rowEditingSignature`, `HeaderGroupCell`, `HtmlGroupedHeaderCell`, `headerGroupRow` /
`headerGroupRows` / `htmlGroupedHeaderPlan` / `groupedHeaderChildRule` /
`groupedHeaderCellStyle` / `groupedHeaderLabelStyle` / `groupedHeaderAlign` / `columnGroupStubStyle` / `COLUMN_GROUP_STUB_WIDTH`, `columnGroupHeaderCaption`. Each adapter mounts `ColumnGroupToggle` /
`ColumnGroupToggleProps` over `ColumnGroupToggleChrome` /
`ColumnGroupToggleChromeProps` / `ColumnGroupToggleSlots` /
`ColumnGroupToggleButtonProps`. Shared
utilities: `logicalAlign` (logical → physical alignment),
`mergedCellStyle` (spreadsheet merge paint for a spanned cell),
`cellSpanMark` (`"2x1"` on the origin),
`cellFlashAttr` / `rowFlashSignature` (`data-flash` on a patched cell),
`resolveMobileLabel` (a card field's caption), `isSelectedCell` (whether a
cell's props put it inside the selected range, for a kit applying its own fill),
`shallowEqualByKeys`, `resolveVirtualRows`, `SHARED_DESKTOP_ROW_KEYS`,
`DEFAULT_CARD_SIZE_PX`, `useKeyedVirtualization` / `KeyedVirtualization`
(virtualize an opaque keyed list, e.g. grouped entries),
`useMountStagger` (the `animate` stagger),
`useOverlayTransition` / `OverlayTransition` (turns an `open` boolean into
`{ rendered, state }` — `rendered` outlives `open` by one exit so an overlay
has something to animate on the way out, and reduced motion skips both edges),
`OVERLAY_MOTION` (the durations and curves the unstyled, shadcn, Base UI and
Radix drawers share),
`useEscapeClose` / `EscapeCloseOptions` (close an overlay on Escape wherever
focus is, since kits disagree about when they do it themselves — pass
`ignoreWithin` a selector for controls inside that answer the key first, so
one Escape closes one layer),
`restoreFocusSoon` (hand focus back to the control an overlay was opened
from, reclaiming it once if the kit's own focus handling drops it, and
leaving focus a reader moved elsewhere alone), and the inline icon set
(`FiltersIcon`, `SearchIcon`, `EyeIcon`, `GripIcon`, `PinIcon`,
`ExpandChevron`, `sortArrow`). Row reorder chrome (on each adapter):
`RowReorderHandle`, `RowReorderHandleProps`, `RowReorderButtons`,
`RowReorderButtonsProps`. Layout: `RowReorderHandleChrome`,
`RowReorderButtonsChrome`. Also `RowReorderAnnouncer`,
`rowReorderSignature`, `REORDER_COLUMN_WIDTH`,
`ROW_DND_MIME`. Row pin chrome: `rowPinSignature`, `rowSourceIndex`,
`pinnedRowStickyStyle`, `pinnedRowCellStyle`, `pinnedRowPart`,
`pinnedRowSticky`, `orderedCardEntries`,
`bindMobileCardList`, `mobileCardListStyle`,
`useOffsetHeight`, `PINNED_TOP_PART`, `PINNED_BOTTOM_PART`.

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
  `DataTablePropsBase`, `DataTableSlots` and `SavedViewsMenuProps` (plus the
  shared core re-exports). `DataTableProps` is `DataTablePropsBase &
DataModeProps`: the base carries every prop except the data mode, which is
  the half to name when you wrap or extend a table's props without committing
  to a tier. `@adapttable/unstyled` also exports `IconProps`, the props its
  exported icons take, so a caller supplying one has a name for the argument; Radix and Base UI export their accent unions
  (`RadixAccentColor`, `BaseUiAccentColor`); Mantine also exports its
  chrome as reusable components (`ActiveFilterChips`, `AutoFilterForm`,
  `EmptyState`, `ErrorState`, `FilterDrawer`, `PaginationFooter`,
  `TableSkeleton`, each with a `…Props` companion:
  `ActiveFilterChipsProps`, `AutoFilterFormProps`, `EmptyStateProps`,
  `ErrorStateProps`, `FilterDrawerProps`, `PaginationFooterProps`,
  `TableSkeletonProps`); unstyled and shadcn export their building blocks
  (`FilterPanel` / `FilterPanelProps`,
  `FilterPopover` / `FilterPopoverProps`, `AutoFilterForm`, the `cx`
  class joiner) and shadcn additionally ships `shadcnClassNames`, the
  preset map behind its default look.
