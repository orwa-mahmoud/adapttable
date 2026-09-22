# Upgrading from v2

v3 removes the enabling props. A feature is an import and an entry in
`features`, and that is the only way in — which is what lets a table download
what it named and nothing else. Measured adapter sizes live in the
[FAQ](./faq.md#how-big-is-it--is-it-tree-shakeable); the acceptance ceiling
is 80 KB min+gzip.

Nothing else about the table changed: the same columns, the same data tiers,
the same URL state, the same labels.

## The shortest upgrade

If your table used most of the chrome, one import replaces the lot:

```tsx
import { DataTable } from "@adapttable/mantine";
import { standardFeatures } from "@adapttable/mantine/preset";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(r) => r.id}
  features={standardFeatures({ grouping: "team", filters: filterDefs })}
/>;
```

`standardFeatures()` brings the Columns menu, the density chooser, CSV export,
find-in-table, fit-columns, the fullscreen toggle, header filters, multi-sort,
resizable columns and the status bar. Grouping, bulk actions, filters and saved
views join when you pass their options. See [feature composition](./features.md)
for what the preset costs against individual imports.

## The smallest upgrade

Import only what you used. Each row below is a prop you were passing and the
factory that replaces it:

```tsx
// v2
<DataTable groupBy="team" enableColumnMenu exportCsv onCellEdit={save} />;

// v3
import { columnMenu } from "@adapttable/mantine/column-menu";
import { editing } from "@adapttable/mantine/editing";
import { exportCsv } from "@adapttable/mantine/export";
import { grouping } from "@adapttable/mantine/grouping";

<DataTable
  features={[grouping("team"), columnMenu(), exportCsv(), editing(save)]}
/>;
```

No type arguments are needed. A factory whose configuration says nothing about
rows composes into any table; one that takes a row-typed callback infers the
row from that callback.

## Every removed prop, and what replaces it

| Removed prop                                                                  | Replacement                  | Import                                |
| ----------------------------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| `batchEditing`, `onBatchEdit`                                                 | `batchEditing(…)`            | `@adapttable/<kit>/editing`           |
| `bulkActions`                                                                 | `bulkActions(…)`             | `@adapttable/<kit>/bulk-actions`      |
| `cellNavigation`                                                              | `cellNavigation(…)`          | `@adapttable/<kit>/cell-navigation`   |
| `getCellSpan`, `cellSpanAppearance`                                           | `cellSpan(…)`                | `@adapttable/<kit>/cell-span`         |
| `collapsibleColumnGroups`                                                     | `collapsibleColumnGroups(…)` | `@adapttable/<kit>/column-groups`     |
| `enableColumnMenu`                                                            | `columnMenu(…)`              | `@adapttable/<kit>/column-menu`       |
| `columnSelectionCheckbox`                                                     | `columnSelectionCheckbox(…)` | `@adapttable/<kit>/column-selection`  |
| `commandPalette`                                                              | `commandPalette(…)`          | `@adapttable/<kit>/command-palette`   |
| `contextMenu`                                                                 | `contextMenu(…)`             | `@adapttable/<kit>/context-menu`      |
| `densityChooser`                                                              | `densityChooser(…)`          | `@adapttable/<kit>/density`           |
| `dirtyIndicators`                                                             | `dirtyIndicators(…)`         | `@adapttable/<kit>/editing`           |
| `editHistory`                                                                 | `editHistory(…)`             | `@adapttable/<kit>/editing`           |
| `onCellEdit`                                                                  | `editing(…)`                 | `@adapttable/<kit>/editing`           |
| `exportCsv`                                                                   | `exportCsv(…)`               | `@adapttable/<kit>/export`            |
| `extraRows`                                                                   | `extraRows(…)`               | `@adapttable/<kit>/extra-rows`        |
| `filters`                                                                     | `filters(…)`                 | `@adapttable/<kit>/filters`           |
| `filterTypes`                                                                 | `filterTypes(…)`             | `@adapttable/<kit>/filters`           |
| `findInTable`                                                                 | `findInTable(…)`             | `@adapttable/<kit>/find-in-table`     |
| `fitColumns`                                                                  | `fitColumns(…)`              | `@adapttable/<kit>/fit-columns`       |
| `fullscreen`                                                                  | `fullscreen(…)`              | `@adapttable/<kit>/fullscreen`        |
| `groupBy`                                                                     | `grouping(…)`                | `@adapttable/<kit>/grouping`          |
| `headerFilters`                                                               | `headerFilters(…)`           | `@adapttable/<kit>/header-filters`    |
| `multiSort`                                                                   | `multiSort(…)`               | `@adapttable/<kit>/multi-sort`        |
| `nestedTable`                                                                 | `nestedTable(…)`             | `@adapttable/<kit>/nested-table`      |
| `onPrint`, `printButton`                                                      | `print(…)`                   | `@adapttable/<kit>/print`             |
| `resizableColumns`                                                            | `resizableColumns(…)`        | `@adapttable/<kit>/resizable-columns` |
| `onAddRow`, `onDuplicateRow`, `onDeleteRow`, `confirmDeleteRow`, `rowActions` | `rowActions(…)`              | `@adapttable/<kit>/row-actions`       |
| `rowStyle`, `rowHeight`, `rowClassName`                                       | `rowAppearance(…)`           | `@adapttable/<kit>/row-appearance`    |
| `renderRowDetail`, `defaultExpandedRowIds`                                    | `rowDetail(…)`               | `@adapttable/<kit>/row-detail`        |
| `rowEditing`, `onRowEdit`                                                     | `rowEditing(…)`              | `@adapttable/<kit>/editing`           |
| `pinnedRowIds`, `onPinnedRowIdsChange`                                        | `rowPinning(…)`              | `@adapttable/<kit>/row-pinning`       |
| `onRowReorder`                                                                | `rowReorder(…)`              | `@adapttable/<kit>/row-reorder`       |
| `savedViews`                                                                  | `savedViews(…)`              | `@adapttable/<kit>/saved-views`       |
| `selectionStats`                                                              | `selectionStats(…)`          | `@adapttable/<kit>/selection-stats`   |
| `sidePanel`                                                                   | `sidePanel(…)`               | `@adapttable/<kit>/side-panel`        |
| `statusBar`                                                                   | `statusBar(…)`               | `@adapttable/<kit>/status-bar`        |
| `getChildren`, `getParentId`, `treeColumn`, `onLoadChildren`                  | `tree(…)`                    | `@adapttable/<kit>/tree`              |
| `undoRedoButtons`                                                             | `undoRedoButtons(…)`         | `@adapttable/<kit>/editing`           |
| `virtualize`, `virtualizeColumns`                                             | `virtualize(…)`              | `@adapttable/<kit>/virtualize`        |

Companion props travel with their feature: `cellSpanAppearance` is the second
argument to `cellSpan`, `defaultExpandedRowIds` the second to `rowDetail` and
`nestedTable`, `printButton` the second to `print`. Grouping's extras
(`groupAggregates`, `groupSort`, `groupFooters`, paging, collapse state) are one
options object:

```tsx
grouping("team", {
  groupAggregates: (rows: readonly Person[]) => ({ spend: total(rows) }),
  groupFooters: true,
});
```

## The other four removals

**Main-entry adapter machinery.** The 72 adapter-machinery names v2
re-exported from `@adapttable/core` are all exported from
`@adapttable/react/adapter`. The React-bound ones are exported only there; the
framework-neutral helpers (column-group, extra-row, pinned-row and row-span
math) also remain on `@adapttable/core`:

```ts
// v2
import { useFullscreen } from "@adapttable/core";
// v3
import { useFullscreen } from "@adapttable/react/adapter";
```

Every name keeps the same spelling:

| Name                         | v3 import                                         |
| ---------------------------- | ------------------------------------------------- |
| `COLUMN_GROUP_ID_SEP`        | `@adapttable/core` or `@adapttable/react/adapter` |
| `COLUMN_GROUP_RENDER_PREFIX` | `@adapttable/core` or `@adapttable/react/adapter` |
| `COLUMN_GROUP_STUB_PREFIX`   | `@adapttable/core` or `@adapttable/react/adapter` |
| `COLUMN_GROUP_STUB_WIDTH`    | `@adapttable/core` or `@adapttable/react/adapter` |
| `columnGroupHeaderCaption`   | `@adapttable/core` or `@adapttable/react/adapter` |
| `columnGroupId`              | `@adapttable/core` or `@adapttable/react/adapter` |
| `columnGroupPath`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `columnGroupStubStyle`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `groupedHeaderAlign`         | `@adapttable/core` or `@adapttable/react/adapter` |
| `groupedHeaderCellStyle`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `groupedHeaderChildRule`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `groupedHeaderLabelStyle`    | `@adapttable/core` or `@adapttable/react/adapter` |
| `HeaderGroupCell`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `headerGroupRow`             | `@adapttable/core` or `@adapttable/react/adapter` |
| `headerGroupRows`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `HtmlGroupedHeaderCell`      | `@adapttable/core` or `@adapttable/react/adapter` |
| `htmlGroupedHeaderPlan`      | `@adapttable/core` or `@adapttable/react/adapter` |
| `isColumnGroupRenderKey`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `isColumnGroupStubKey`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `isColumnGroupSummaryKey`    | `@adapttable/core` or `@adapttable/react/adapter` |
| `toggleCollapsedColumnGroup` | `@adapttable/core` or `@adapttable/react/adapter` |
| `EXTRA_OVER_SPAN_ROW_STYLE`  | `@adapttable/core` or `@adapttable/react/adapter` |
| `EXTRA_OVER_SPAN_STYLE`      | `@adapttable/core` or `@adapttable/react/adapter` |
| `EXTRA_ROW_PARTS`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `extraCountBeforeRowIds`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `extraCoveredTableSlots`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `ExtraEntry`                 | `@adapttable/react/adapter`                       |
| `extraHostFillStyle`         | `@adapttable/core` or `@adapttable/react/adapter` |
| `extraRowsForSection`        | `@adapttable/core` or `@adapttable/react/adapter` |
| `extraUncoveredColSpans`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `inflateBodyCellRowSpans`    | `@adapttable/core` or `@adapttable/react/adapter` |
| `insertExtraRows`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `insertExtrasBeforeRows`     | `@adapttable/core` or `@adapttable/react/adapter` |
| `isExtraEntry`               | `@adapttable/core` or `@adapttable/react/adapter` |
| `orderedCardEntries`         | `@adapttable/core` or `@adapttable/react/adapter` |
| `PINNED_BOTTOM_PART`         | `@adapttable/core` or `@adapttable/react/adapter` |
| `PINNED_TOP_PART`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `pinnedRowCellStyle`         | `@adapttable/core` or `@adapttable/react/adapter` |
| `pinnedRowPart`              | `@adapttable/core` or `@adapttable/react/adapter` |
| `pinnedRowSticky`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `pinnedRowStickyStyle`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `useOffsetHeight`            | `@adapttable/react/adapter`                       |
| `columnMenuActions`          | `@adapttable/core` or `@adapttable/react/adapter` |
| `filterColumnMenuRows`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `hideAllColumns`             | `@adapttable/core` or `@adapttable/react/adapter` |
| `resetColumnLayout`          | `@adapttable/core` or `@adapttable/react/adapter` |
| `showAllColumns`             | `@adapttable/core` or `@adapttable/react/adapter` |
| `unpinAllColumns`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `BodyCell`                   | `@adapttable/core` or `@adapttable/react/adapter` |
| `bodyCellsHaveRowSpan`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `cellsForRow`                | `@adapttable/core` or `@adapttable/react/adapter` |
| `cellSpanMark`               | `@adapttable/core` or `@adapttable/react/adapter` |
| `rowSpanSignature`           | `@adapttable/core` or `@adapttable/react/adapter` |
| `REORDER_COLUMN_WIDTH`       | `@adapttable/core` or `@adapttable/react/adapter` |
| `ROW_DND_MIME`               | `@adapttable/react/adapter`                       |
| `rowReorderDropStyle`        | `@adapttable/core` or `@adapttable/react/adapter` |
| `rowReorderSignature`        | `@adapttable/core` or `@adapttable/react/adapter` |
| `RowReorderState`            | `@adapttable/react/adapter`                       |
| `resolveRowHeight`           | `@adapttable/core` or `@adapttable/react/adapter` |
| `resolveRowStyle`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `rowStyleSignature`          | `@adapttable/core` or `@adapttable/react/adapter` |
| `EditableCellActivateProps`  | `@adapttable/react/adapter`                       |
| `EditableCellButtonProps`    | `@adapttable/react/adapter`                       |
| `EditableCellSlots`          | `@adapttable/react/adapter`                       |
| `FilterHeaderClassNames`     | `@adapttable/react/adapter`                       |
| `FilterHeaderRowProps`       | `@adapttable/react/adapter`                       |
| `applyCollapsedColumnGroups` | `@adapttable/core` or `@adapttable/react/adapter` |
| `flattenColumnTree`          | `@adapttable/core` or `@adapttable/react/adapter` |
| `FullscreenState`            | `@adapttable/react/adapter`                       |
| `useFullscreen`              | `@adapttable/react/adapter`                       |
| `rowPinSignature`            | `@adapttable/core` or `@adapttable/react/adapter` |
| `rowSourceIndex`             | `@adapttable/core` or `@adapttable/react/adapter` |

**`useChromeBodyData`.** Choose the implementation the host actually renders:
`usePlainChromeBodyData` for a normal table, or `useVirtualChromeBodyData` for
the virtualized feature path. Both are exported from `@adapttable/react`.

**`FilterTypeRegistry.register` / `FilterTypeRegistry.extend`.** A custom
filter type registers through a feature, on the same object every other
extension uses:

```tsx
// v2
const registry = FilterTypeRegistry.register(mySpec);
// v3
features={[{ id: "my-filter", setup: (host) => host.registerFilterType(mySpec) }]}
```

`filterTypes([mySpec])` from `@adapttable/<kit>/filters` does the same thing
without writing the object by hand.

**MUI's `size` prop.** Use `density`: `density="compact"` is what `size="small"`
meant, and `density="comfortable"` is `size="medium"`.

The hooks, the React column and the prop-getters a host imports directly are
exported from `@adapttable/react`. The framework-neutral models and helpers in
the same list stay on `@adapttable/core`:

| Name                               | v3 import                                 |
| ---------------------------------- | ----------------------------------------- |
| `aggregate`                        | `@adapttable/core` or `@adapttable/react` |
| `AggregateOptions`                 | `@adapttable/core`                        |
| `Aggregator`                       | `@adapttable/core`                        |
| `BaseDataTableProps`               | `@adapttable/react`                       |
| `BulkAction`                       | `@adapttable/core`                        |
| `CellElementProps`                 | `@adapttable/react`                       |
| `ChromeBodyData`                   | `@adapttable/react`                       |
| `ColumnFooterContext`              | `@adapttable/core` or `@adapttable/react` |
| `ColumnGroupDef`                   | `@adapttable/core`                        |
| `ColumnGroupRecord`                | `@adapttable/core`                        |
| `ColumnHeaderController`           | `@adapttable/core` or `@adapttable/react` |
| `columnHeaderLabel`                | `@adapttable/core`                        |
| `ColumnReorderKeyProps`            | `@adapttable/react`                       |
| `ColumnResizeHandleProps`          | `@adapttable/core`                        |
| `ComputedColumnSpec`               | `@adapttable/core`                        |
| `CustomCellEditorRender`           | `@adapttable/core`                        |
| `EditableCellActivateControlProps` | `@adapttable/react`                       |
| `EditableCellControls`             | `@adapttable/react`                       |
| `EditableCellGate`                 | `@adapttable/react`                       |
| `EditableCellGateProps`            | `@adapttable/react`                       |
| `ExportContext`                    | `@adapttable/core`                        |
| `exportViewFromChrome`             | `@adapttable/core`                        |
| `ExtraRow`                         | `@adapttable/core`                        |
| `FeatureProps`                     | `@adapttable/react`                       |
| `FeatureProviderContribution`      | `@adapttable/react`                       |
| `FeatureProviderProps`             | `@adapttable/react`                       |
| `FeatureRender`                    | `@adapttable/react`                       |
| `FilterChromeMode`                 | `@adapttable/core`                        |
| `FilterTypeSpec`                   | `@adapttable/core`                        |
| `groupAggregateEntries`            | `@adapttable/core`                        |
| `GroupAggregatesFn`                | `@adapttable/core`                        |
| `GroupedFlatEntry`                 | `@adapttable/core`                        |
| `GroupingChipKeyboardProps`        | `@adapttable/core`                        |
| `GroupingDragProps`                | `@adapttable/core`                        |
| `GroupingDropProps`                | `@adapttable/core`                        |
| `GroupRowCell`                     | `@adapttable/core`                        |
| `groupRowLayout`                   | `@adapttable/core`                        |
| `HeaderFilterOpenProvider`         | `@adapttable/react`                       |
| `headerFilterStickTop`             | `@adapttable/react`                       |
| `IncrementalView`                  | `@adapttable/core`                        |
| `IncrementalViewConfig`            | `@adapttable/core`                        |
| `isDeclarativeFilters`             | `@adapttable/core` or `@adapttable/react` |
| `MobileCardField`                  | `@adapttable/core`                        |
| `MobileCardRenderer`               | `@adapttable/core`                        |
| `MultiSelectEditorCheckboxProps`   | `@adapttable/react`                       |
| `MultiSelectEditorChrome`          | `@adapttable/react`                       |
| `MultiSelectEditorChromeProps`     | `@adapttable/react`                       |
| `MultiSelectEditorSlots`           | `@adapttable/react`                       |
| `NestedTable`                      | `@adapttable/react`                       |
| `renderRegisteredFilter`           | `@adapttable/core`                        |
| `resolveColumnFooter`              | `@adapttable/react`                       |
| `resolveColumnHeader`              | `@adapttable/react`                       |
| `RowAction`                        | `@adapttable/core`                        |
| `RowActionsRenderer`               | `@adapttable/core`                        |
| `RowStyle`                         | `@adapttable/core`                        |
| `SidePanelEntry`                   | `@adapttable/core` or `@adapttable/react` |
| `Slot`                             | `@adapttable/core` or `@adapttable/react` |
| `TableChrome`                      | `@adapttable/react`                       |
| `TableExtraEntry`                  | `@adapttable/core`                        |
| `TableRowReorderState`             | `@adapttable/react`                       |
| `ToolbarSlots`                     | `@adapttable/react`                       |
| `useActiveFilterChips`             | `@adapttable/react`                       |
| `useBatchEditing`                  | `@adapttable/react`                       |
| `useBooleanFilterWidget`           | `@adapttable/react`                       |
| `useBulkActionRunner`              | `@adapttable/react`                       |
| `useCellEditing`                   | `@adapttable/react`                       |
| `useCellSaveState`                 | `@adapttable/react`                       |
| `useChecklistFilter`               | `@adapttable/react`                       |
| `useChromeScrollReset`             | `@adapttable/react`                       |
| `useColorScheme`                   | `@adapttable/react`                       |
| `useColumnDragState`               | `@adapttable/react`                       |
| `useColumnLayout`                  | `@adapttable/react`                       |
| `useColumnLayoutStorageState`      | `@adapttable/react`                       |
| `useColumnLayoutUrlState`          | `@adapttable/react`                       |
| `UseDataTableResult`               | `@adapttable/react`                       |
| `useDebounce`                      | `@adapttable/react`                       |
| `useDensityUrlState`               | `@adapttable/react`                       |
| `useDirtyCells`                    | `@adapttable/react`                       |
| `useEditConflict`                  | `@adapttable/react`                       |
| `useEditHistory`                   | `@adapttable/react`                       |
| `useExtraChips`                    | `@adapttable/react`                       |
| `useFilterOptions`                 | `@adapttable/react`                       |
| `useFilterTreeChips`               | `@adapttable/react`                       |
| `useFilterTriggerToggle`           | `@adapttable/react`                       |
| `useFindFocus`                     | `@adapttable/react`                       |
| `useFindInTable`                   | `@adapttable/react`                       |
| `useFrontendData`                  | `@adapttable/react`                       |
| `useGridFocus`                     | `@adapttable/react`                       |
| `useGroupCollapse`                 | `@adapttable/react`                       |
| `useGroupCollapseUrlState`         | `@adapttable/react`                       |
| `useGroupPaging`                   | `@adapttable/react`                       |
| `useHeaderFilterOverlay`           | `@adapttable/react`                       |
| `useHighlight`                     | `@adapttable/react`                       |
| `useHorizontalOverflow`            | `@adapttable/react`                       |
| `useInfiniteScroll`                | `@adapttable/react`                       |
| `useIsMobile`                      | `@adapttable/react`                       |
| `useLazyChildren`                  | `@adapttable/react`                       |
| `useMediaQuery`                    | `@adapttable/react`                       |
| `usePointerDismiss`                | `@adapttable/react`                       |
| `usePrefersReducedMotion`          | `@adapttable/react`                       |
| `useRangeFilterWidget`             | `@adapttable/react`                       |
| `useRowEditing`                    | `@adapttable/react`                       |
| `useRowExpansion`                  | `@adapttable/react`                       |
| `useRowMutations`                  | `@adapttable/react`                       |
| `useRowPinning`                    | `@adapttable/react`                       |
| `useRowPinningUrlState`            | `@adapttable/react`                       |
| `useRowReorder`                    | `@adapttable/react`                       |
| `useSavedViews`                    | `@adapttable/react`                       |
| `useScrollToTableTop`              | `@adapttable/react`                       |
| `UseScrollToTableTopOptions`       | `@adapttable/react`                       |
| `useSearchInput`                   | `@adapttable/react`                       |
| `useSelection`                     | `@adapttable/react`                       |
| `useServerData`                    | `@adapttable/react`                       |
| `useShortcuts`                     | `@adapttable/react`                       |
| `useTableData`                     | `@adapttable/react`                       |
| `UseTableDataOptions`              | `@adapttable/react`                       |
| `useTableEditHistory`              | `@adapttable/react`                       |
| `useTableUrlState`                 | `@adapttable/react`                       |
| `useTableVirtualization`           | `@adapttable/react`                       |
| `useTextFilterWidget`              | `@adapttable/react`                       |
| `useTreeExpansion`                 | `@adapttable/react`                       |

## Checking the upgrade

The compiler finds every call site: a removed prop is not in
`DataTableProps` any more, so `tsc` names each one. There is no deprecation
warning to grep for, because there is nothing left to deprecate.

This repository rehearses that upgrade against packed tarballs for every
published kit — preset-equivalent first, then the four-import minimal path —
with `pnpm migrate:rehearse`. Headless consumers keep `useDataTable`. The
release receipt is `scripts/v3-receipt.md`.

Run the v3 codemod over the source directories:

```bash
npx @adapttable/cli migrate-v3 src
npx @adapttable/cli migrate-v3 src --check
```

The codemod performs one provably mechanical rewrite: named imports of moved
exports go from `@adapttable/core` to their v3 home — `@adapttable/react` or
`@adapttable/react/adapter` — splitting a mixed import when necessary. It is idempotent; the second run reports zero
updates. Enabling props, `FilterTypeRegistry.register` / `extend`,
`useChromeBodyData`, and MUI `size` need behavior choices, so the command
reports each location and exits non-zero without rewriting it. Use those
locations with the inventory above; no feature order or option mapping is
guessed.

## v3 package split

In v3 `@adapttable/core` is framework-neutral and the React binding is
`@adapttable/react`. Kit `DataTable` imports do not change.
Capabilities do not disappear. Relocation is not deletion.

The complete symbol map — every current public export, its kind, class, and
destination — is [`scripts/v3-package-split-map.json`](../scripts/v3-package-split-map.json).
`node scripts/check-package-split-map.mjs` fails if a published typed entry
is missing from the map or a mapped symbol has no current home. Read
[ARCHITECTURE.md](../ARCHITECTURE.md) for the package graph and the engine /
column / AI contracts.

### How to read a move

| Symbol                  | v3 import                                                    | Kind                                                |
| ----------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| `useDataTable`          | `@adapttable/react`                                          | Headless React hook                                 |
| `ColumnDef`             | `@adapttable/react`                                          | React column (extends neutral `ColumnModel`)        |
| `TableSource`           | `@adapttable/core`                                           | Unchanged                                           |
| `useQuerySource`        | `@adapttable/react`                                          | React source hook; query types stay on core         |
| `useTableChrome`        | `@adapttable/react`                                          | Chrome binding                                      |
| `HeaderGroupCell`       | `@adapttable/core` or `@adapttable/react/adapter`            | Neutral header-group model                          |
| `sourceCapabilities`    | `@adapttable/core`                                           | Neutral helper                                      |
| `grouping`              | `@adapttable/<kit>/grouping` or `@adapttable/react/features` | Feature factory that returns a React `TableFeature` |
| `pivot`                 | `@adapttable/core/pivot`                                     | Pure engine                                         |
| `usePivotUrlState`      | `@adapttable/react/pivot`                                    | React hook                                          |
| `DataTable`             | `@adapttable/mui`                                            | Unchanged                                           |
| `createAgentSession`    | `@adapttable/ai`                                             | Unchanged                                           |
| `tableAgent`            | `@adapttable/ai-react`                                       | React binding                                       |
| `createAgentHttpClient` | `@adapttable/ai/http`                                        | Unchanged                                           |

The split retires no public symbol. A row in the map whose
`proposedImport` equals `currentImport` is a keep. Every other row is a
specifier change only, unless `behavior` is non-empty.

### Representative consumers

Plain engine (no React installed):

```ts
import {
  sourceCapabilities,
  type TableSourceCapabilities,
} from "@adapttable/core";
import { pivot } from "@adapttable/core/pivot";

const capabilities: TableSourceCapabilities = sourceCapabilities({
  allFilteredRows: rows,
  total: rows.length,
});
const result = pivot(rows, { rows: ["team"], columns: [], measures: [] });
```

Headless React — `useDataTable` from `@adapttable/react`:

```tsx
import {
  type ColumnDef,
  useDataTable,
  useFrontendData,
} from "@adapttable/react";

const columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
const source = useFrontendData({ data: people, columns });
const table = useDataTable({ source, columns, rowKey: (r) => r.id });
```

Kit — no import change:

```tsx
import { DataTable } from "@adapttable/mui";
import { grouping } from "@adapttable/mui/grouping";

<DataTable
  data={people}
  columns={columns}
  rowKey={(r) => r.id}
  features={[grouping("team")]}
/>;
```

AI — root stays React-free; the React feature binds to the live engine:

```ts
import { createAgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai-react";

const session = createAgentSession({ observe, apply });
const feature = tableAgent({ tableId: "orders" });
```

[ARCHITECTURE.md](../ARCHITECTURE.md) holds the contracts these four snippets
follow.
