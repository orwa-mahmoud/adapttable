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

**Main-entry adapter machinery.** 72 names that were re-exported from
`@adapttable/core` now live only on `@adapttable/react/adapter`. The builder
tier moved with the React binding, because everything in it renders:

```ts
// v2
import { headerGroupRows } from "@adapttable/core";
// v3
import { headerGroupRows } from "@adapttable/react/adapter";
```

Every moved name keeps the same spelling:

| Removed from `@adapttable/core` | v3 import                   |
| ------------------------------- | --------------------------- |
| `COLUMN_GROUP_ID_SEP`           | `@adapttable/react/adapter` |
| `COLUMN_GROUP_RENDER_PREFIX`    | `@adapttable/react/adapter` |
| `COLUMN_GROUP_STUB_PREFIX`      | `@adapttable/react/adapter` |
| `COLUMN_GROUP_STUB_WIDTH`       | `@adapttable/react/adapter` |
| `columnGroupHeaderCaption`      | `@adapttable/react/adapter` |
| `columnGroupId`                 | `@adapttable/react/adapter` |
| `columnGroupPath`               | `@adapttable/react/adapter` |
| `columnGroupStubStyle`          | `@adapttable/react/adapter` |
| `groupedHeaderAlign`            | `@adapttable/react/adapter` |
| `groupedHeaderCellStyle`        | `@adapttable/react/adapter` |
| `groupedHeaderChildRule`        | `@adapttable/react/adapter` |
| `groupedHeaderLabelStyle`       | `@adapttable/react/adapter` |
| `HeaderGroupCell`               | `@adapttable/react/adapter` |
| `headerGroupRow`                | `@adapttable/react/adapter` |
| `headerGroupRows`               | `@adapttable/react/adapter` |
| `HtmlGroupedHeaderCell`         | `@adapttable/react/adapter` |
| `htmlGroupedHeaderPlan`         | `@adapttable/react/adapter` |
| `isColumnGroupRenderKey`        | `@adapttable/react/adapter` |
| `isColumnGroupStubKey`          | `@adapttable/react/adapter` |
| `isColumnGroupSummaryKey`       | `@adapttable/react/adapter` |
| `toggleCollapsedColumnGroup`    | `@adapttable/react/adapter` |
| `EXTRA_OVER_SPAN_ROW_STYLE`     | `@adapttable/react/adapter` |
| `EXTRA_OVER_SPAN_STYLE`         | `@adapttable/react/adapter` |
| `EXTRA_ROW_PARTS`               | `@adapttable/react/adapter` |
| `extraCountBeforeRowIds`        | `@adapttable/react/adapter` |
| `extraCoveredTableSlots`        | `@adapttable/react/adapter` |
| `ExtraEntry`                    | `@adapttable/react/adapter` |
| `extraHostFillStyle`            | `@adapttable/react/adapter` |
| `extraRowsForSection`           | `@adapttable/react/adapter` |
| `extraUncoveredColSpans`        | `@adapttable/react/adapter` |
| `inflateBodyCellRowSpans`       | `@adapttable/react/adapter` |
| `insertExtraRows`               | `@adapttable/react/adapter` |
| `insertExtrasBeforeRows`        | `@adapttable/react/adapter` |
| `isExtraEntry`                  | `@adapttable/react/adapter` |
| `orderedCardEntries`            | `@adapttable/react/adapter` |
| `PINNED_BOTTOM_PART`            | `@adapttable/react/adapter` |
| `PINNED_TOP_PART`               | `@adapttable/react/adapter` |
| `pinnedRowCellStyle`            | `@adapttable/react/adapter` |
| `pinnedRowPart`                 | `@adapttable/react/adapter` |
| `pinnedRowSticky`               | `@adapttable/react/adapter` |
| `pinnedRowStickyStyle`          | `@adapttable/react/adapter` |
| `useOffsetHeight`               | `@adapttable/react/adapter` |
| `columnMenuActions`             | `@adapttable/react/adapter` |
| `filterColumnMenuRows`          | `@adapttable/react/adapter` |
| `hideAllColumns`                | `@adapttable/react/adapter` |
| `resetColumnLayout`             | `@adapttable/react/adapter` |
| `showAllColumns`                | `@adapttable/react/adapter` |
| `unpinAllColumns`               | `@adapttable/react/adapter` |
| `BodyCell`                      | `@adapttable/react/adapter` |
| `bodyCellsHaveRowSpan`          | `@adapttable/react/adapter` |
| `cellsForRow`                   | `@adapttable/react/adapter` |
| `cellSpanMark`                  | `@adapttable/react/adapter` |
| `rowSpanSignature`              | `@adapttable/react/adapter` |
| `REORDER_COLUMN_WIDTH`          | `@adapttable/react/adapter` |
| `ROW_DND_MIME`                  | `@adapttable/react/adapter` |
| `rowReorderDropStyle`           | `@adapttable/react/adapter` |
| `rowReorderSignature`           | `@adapttable/react/adapter` |
| `RowReorderState`               | `@adapttable/react/adapter` |
| `resolveRowHeight`              | `@adapttable/react/adapter` |
| `resolveRowStyle`               | `@adapttable/react/adapter` |
| `rowStyleSignature`             | `@adapttable/react/adapter` |
| `EditableCellActivateProps`     | `@adapttable/react/adapter` |
| `EditableCellButtonProps`       | `@adapttable/react/adapter` |
| `EditableCellSlots`             | `@adapttable/react/adapter` |
| `FilterHeaderClassNames`        | `@adapttable/react/adapter` |
| `FilterHeaderRowProps`          | `@adapttable/react/adapter` |
| `applyCollapsedColumnGroups`    | `@adapttable/react/adapter` |
| `flattenColumnTree`             | `@adapttable/react/adapter` |
| `FullscreenState`               | `@adapttable/react/adapter` |
| `useFullscreen`                 | `@adapttable/react/adapter` |
| `rowPinSignature`               | `@adapttable/react/adapter` |
| `rowSourceIndex`                | `@adapttable/react/adapter` |

**`useChromeBodyData`.** Choose the implementation the host actually renders:
`usePlainChromeBodyData` for a normal table, or `useVirtualChromeBodyData` for
the virtualized feature path. Both remain available from `@adapttable/core`.

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

The React binding took the rest of the main entry with it — the hooks, the
React column and the prop-getters a host imports directly:

| Removed from `@adapttable/core`    | v3 import           |
| ---------------------------------- | ------------------- |
| `aggregate`                        | `@adapttable/react` |
| `AggregateOptions`                 | `@adapttable/react` |
| `Aggregator`                       | `@adapttable/react` |
| `BaseDataTableProps`               | `@adapttable/react` |
| `BulkAction`                       | `@adapttable/react` |
| `CellElementProps`                 | `@adapttable/react` |
| `ChromeBodyData`                   | `@adapttable/react` |
| `ColumnFooterContext`              | `@adapttable/react` |
| `ColumnGroupDef`                   | `@adapttable/react` |
| `ColumnGroupRecord`                | `@adapttable/react` |
| `ColumnHeaderController`           | `@adapttable/react` |
| `columnHeaderLabel`                | `@adapttable/react` |
| `ColumnReorderKeyProps`            | `@adapttable/react` |
| `ColumnResizeHandleProps`          | `@adapttable/react` |
| `ComputedColumnSpec`               | `@adapttable/react` |
| `CustomCellEditorRender`           | `@adapttable/react` |
| `EditableCellActivateControlProps` | `@adapttable/react` |
| `EditableCellControls`             | `@adapttable/react` |
| `EditableCellGate`                 | `@adapttable/react` |
| `EditableCellGateProps`            | `@adapttable/react` |
| `ExportContext`                    | `@adapttable/react` |
| `exportViewFromChrome`             | `@adapttable/react` |
| `ExtraRow`                         | `@adapttable/react` |
| `FeatureProps`                     | `@adapttable/react` |
| `FeatureProviderContribution`      | `@adapttable/react` |
| `FeatureProviderProps`             | `@adapttable/react` |
| `FeatureRender`                    | `@adapttable/react` |
| `FilterChromeMode`                 | `@adapttable/react` |
| `FilterTypeSpec`                   | `@adapttable/react` |
| `groupAggregateEntries`            | `@adapttable/react` |
| `GroupAggregatesFn`                | `@adapttable/react` |
| `GroupedFlatEntry`                 | `@adapttable/react` |
| `GroupingChipKeyboardProps`        | `@adapttable/react` |
| `GroupingDragProps`                | `@adapttable/react` |
| `GroupingDropProps`                | `@adapttable/react` |
| `GroupRowCell`                     | `@adapttable/react` |
| `groupRowLayout`                   | `@adapttable/react` |
| `HeaderFilterOpenProvider`         | `@adapttable/react` |
| `headerFilterStickTop`             | `@adapttable/react` |
| `IncrementalView`                  | `@adapttable/react` |
| `IncrementalViewConfig`            | `@adapttable/react` |
| `isDeclarativeFilters`             | `@adapttable/react` |
| `MobileCardField`                  | `@adapttable/react` |
| `MobileCardRenderer`               | `@adapttable/react` |
| `MultiSelectEditorCheckboxProps`   | `@adapttable/react` |
| `MultiSelectEditorChrome`          | `@adapttable/react` |
| `MultiSelectEditorChromeProps`     | `@adapttable/react` |
| `MultiSelectEditorSlots`           | `@adapttable/react` |
| `NestedTable`                      | `@adapttable/react` |
| `renderRegisteredFilter`           | `@adapttable/react` |
| `resolveColumnFooter`              | `@adapttable/react` |
| `resolveColumnHeader`              | `@adapttable/react` |
| `RowAction`                        | `@adapttable/react` |
| `RowActionsRenderer`               | `@adapttable/react` |
| `RowStyle`                         | `@adapttable/react` |
| `SidePanelEntry`                   | `@adapttable/react` |
| `Slot`                             | `@adapttable/react` |
| `TableChrome`                      | `@adapttable/react` |
| `TableExtraEntry`                  | `@adapttable/react` |
| `TableRowReorderState`             | `@adapttable/react` |
| `ToolbarSlots`                     | `@adapttable/react` |
| `useActiveFilterChips`             | `@adapttable/react` |
| `useBatchEditing`                  | `@adapttable/react` |
| `useBooleanFilterWidget`           | `@adapttable/react` |
| `useBulkActionRunner`              | `@adapttable/react` |
| `useCellEditing`                   | `@adapttable/react` |
| `useCellSaveState`                 | `@adapttable/react` |
| `useChecklistFilter`               | `@adapttable/react` |
| `useChromeScrollReset`             | `@adapttable/react` |
| `useColorScheme`                   | `@adapttable/react` |
| `useColumnDragState`               | `@adapttable/react` |
| `useColumnLayout`                  | `@adapttable/react` |
| `useColumnLayoutStorageState`      | `@adapttable/react` |
| `useColumnLayoutUrlState`          | `@adapttable/react` |
| `UseDataTableResult`               | `@adapttable/react` |
| `useDebounce`                      | `@adapttable/react` |
| `useDensityUrlState`               | `@adapttable/react` |
| `useDirtyCells`                    | `@adapttable/react` |
| `useEditConflict`                  | `@adapttable/react` |
| `useEditHistory`                   | `@adapttable/react` |
| `useExtraChips`                    | `@adapttable/react` |
| `useFilterOptions`                 | `@adapttable/react` |
| `useFilterTreeChips`               | `@adapttable/react` |
| `useFilterTriggerToggle`           | `@adapttable/react` |
| `useFindFocus`                     | `@adapttable/react` |
| `useFindInTable`                   | `@adapttable/react` |
| `useFrontendData`                  | `@adapttable/react` |
| `useGridFocus`                     | `@adapttable/react` |
| `useGroupCollapse`                 | `@adapttable/react` |
| `useGroupCollapseUrlState`         | `@adapttable/react` |
| `useGroupPaging`                   | `@adapttable/react` |
| `useHeaderFilterOverlay`           | `@adapttable/react` |
| `useHighlight`                     | `@adapttable/react` |
| `useHorizontalOverflow`            | `@adapttable/react` |
| `useInfiniteScroll`                | `@adapttable/react` |
| `useIsMobile`                      | `@adapttable/react` |
| `useLazyChildren`                  | `@adapttable/react` |
| `useMediaQuery`                    | `@adapttable/react` |
| `usePointerDismiss`                | `@adapttable/react` |
| `usePrefersReducedMotion`          | `@adapttable/react` |
| `useRangeFilterWidget`             | `@adapttable/react` |
| `useRowEditing`                    | `@adapttable/react` |
| `useRowExpansion`                  | `@adapttable/react` |
| `useRowMutations`                  | `@adapttable/react` |
| `useRowPinning`                    | `@adapttable/react` |
| `useRowPinningUrlState`            | `@adapttable/react` |
| `useRowReorder`                    | `@adapttable/react` |
| `useSavedViews`                    | `@adapttable/react` |
| `useScrollToTableTop`              | `@adapttable/react` |
| `UseScrollToTableTopOptions`       | `@adapttable/react` |
| `useSearchInput`                   | `@adapttable/react` |
| `useSelection`                     | `@adapttable/react` |
| `useServerData`                    | `@adapttable/react` |
| `useShortcuts`                     | `@adapttable/react` |
| `useTableData`                     | `@adapttable/react` |
| `UseTableDataOptions`              | `@adapttable/react` |
| `useTableEditHistory`              | `@adapttable/react` |
| `useTableUrlState`                 | `@adapttable/react` |
| `useTableVirtualization`           | `@adapttable/react` |
| `useTextFilterWidget`              | `@adapttable/react` |
| `useTreeExpansion`                 | `@adapttable/react` |

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

The codemod performs one provably mechanical rewrite: named adapter-contract
imports move from `@adapttable/core` to `@adapttable/react/adapter`, splitting a
mixed import when necessary. It is idempotent; the second run reports zero
updates. Enabling props, `FilterTypeRegistry.register` / `extend`,
`useChromeBodyData`, and MUI `size` need behavior choices, so the command
reports each location and exits non-zero without rewriting it. Use those
locations with the inventory above; no feature order or option mapping is
guessed.

Item 16 extends the same command for the package split below: React hooks,
Chrome, and renderer types move from `@adapttable/core` to
`@adapttable/react`. Until that ships, the map is the contract — not a
runtime.

## v3 package split

v3's remaining foundation change: `@adapttable/core` becomes framework-neutral
and React moves to `@adapttable/react`. Kit `DataTable` imports do not change.
Capabilities do not disappear. Relocation is not deletion.

The complete symbol map — every current public export, its kind, class, and
destination — is [`scripts/v3-package-split-map.json`](../scripts/v3-package-split-map.json).
`node scripts/check-package-split-map.mjs` fails if a published typed entry
is missing from the map or a mapped symbol has no current home. Read
[ARCHITECTURE.md](../ARCHITECTURE.md) for the package graph and the engine /
column / AI contracts.

### How to read a move

| Today's import                                     | After the split                                   | What moved                                          |
| -------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| `@adapttable/core` → `useDataTable`                | `@adapttable/react`                               | Headless React hook                                 |
| `@adapttable/core` → `ColumnDef`                   | `@adapttable/react`                               | React column (extends neutral `ColumnModel`)        |
| `@adapttable/core` → `TableSource`                 | `@adapttable/core`                                | Unchanged                                           |
| `@adapttable/core` → `useQuerySource`              | `@adapttable/react`                               | React source hook; query types stay on core         |
| `@adapttable/core` → `useTableChrome`              | `@adapttable/react`                               | Chrome binding                                      |
| `@adapttable/react/adapter` → `HeaderGroupCell`    | `@adapttable/react/adapter`                       | React adapter chrome                                |
| `@adapttable/react/adapter` → `sourceCapabilities` | `@adapttable/core` or `@adapttable/react/adapter` | Neutral helper stays in core                        |
| `@adapttable/react/features` → `grouping`          | `@adapttable/react/features`                      | Feature factory that returns a React `TableFeature` |
| `@adapttable/core/pivot` → `pivot`                 | `@adapttable/core/pivot`                          | Pure engine                                         |
| `@adapttable/core/pivot` → `usePivotUrlState`      | `@adapttable/react/pivot`                         | React hook                                          |
| `@adapttable/mui` → `DataTable`                    | `@adapttable/mui`                                 | Unchanged                                           |
| `@adapttable/ai` → `createAgentSession`            | `@adapttable/ai`                                  | Unchanged                                           |
| `@adapttable/ai/react` → `tableAgent`              | `@adapttable/ai/react`                            | Stays; depends on `@adapttable/react`               |
| `@adapttable/ai/http` → `createAgentHttpClient`    | `@adapttable/ai/http`                             | Unchanged                                           |

No public symbol is retired by this split. A row in the map whose
`proposedImport` equals `currentImport` is a keep. Every other row is a
specifier change only, unless `behavior` is non-empty.

### Representative consumers

Plain engine (no React installed) — item 10 must make this typecheck and run:

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

Headless React — today's `useDataTable` with the new specifier:

```tsx
import { useDataTable, type ColumnDef } from "@adapttable/react";

const columns: ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
const table = useDataTable({ data: people, columns, rowKey: (r) => r.id });
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
import { tableAgent } from "@adapttable/ai/react";

const session = createAgentSession({ observe, apply });
const feature = tableAgent({ tableId: "orders" });
```

These four snippets must keep agreeing with the frozen contracts in
ARCHITECTURE.md as items 10–15 land. They are examples, not published stubs.
