/**
 * `@adapttable/core/adapter` — the builder tier.
 *
 * Everything the eight built-in adapters are made of, published for anyone
 * wiring a ninth: the shared `<DataTable>` orchestration
 * (`useDataTableShell`), the render prelude, chrome prop bundles,
 * pinning and pager math, keyed virtualization, and the inline icon set.
 * Same package, same semver promise as the main entry — split out so the
 * app-facing API at `@adapttable/core` stays small. App code should rarely
 * (if ever) import from here.
 *
 * @packageDocumentation
 */

export { LiveRegion, type LiveRegionProps } from "./a11y/LiveRegion";
export {
  TableStatusAnnouncer,
  type TableStatusAnnouncerProps,
} from "./a11y/TableStatusAnnouncer";
export {
  type TableStatusAnnouncementOptions,
  useTableStatusAnnouncement,
} from "./a11y/useTableStatusAnnouncement";
export {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "./actions/CommandPaletteChrome";
export type { Command } from "./actions/commandRegistry";
export type { ConfirmHandler } from "./actions/confirm";
export { resolveDisabledReason } from "./actions/confirm";
export {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "./actions/ContextMenuChrome";
export type {
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export {
  resolveContextTarget,
  type ResolvedContextTarget,
  ROW_ID_ATTRIBUTE,
} from "./actions/contextMenuRegion";
export { bulkActionErrorMessage } from "./actions/useBulkActionRunner";
export {
  type BulkBarState,
  useBulkBarState,
  type UseBulkBarStateOptions,
} from "./actions/useBulkBarState";
export type { UseCommandPaletteOptions } from "./actions/useCommandPalette";
export {
  type TableCommandPalette,
  useCommandPalette,
} from "./actions/useCommandPalette";
export type { ContextMenuPoint } from "./actions/useContextMenu";
export type { TableContextMenuOptions } from "./actions/useTableContextMenu";
export {
  type TableContextMenu,
  useTableContextMenu,
} from "./actions/useTableContextMenu";
export type { AggregateName, Aggregator } from "./aggregate/aggregate";
export {
  type ColumnGroupToggleButtonProps,
  ColumnGroupToggleChrome,
  type ColumnGroupToggleChromeProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
} from "./columns/ColumnGroupToggle";
export {
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuActions,
  type ColumnMenuChromeProps,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export {
  COLUMN_DND_MIME,
  type ColumnDragRowAttrs,
  type ColumnDragState,
  type ColumnDropProps,
  type ColumnReorderKeyProps,
  type ColumnRowDragProps,
} from "./columns/columnReorder";
export { type ColumnResizeHandleProps } from "./columns/columnResize";
export {
  columnFlexShares,
  columnSizeStyle,
  type ColumnSizingOptions,
  fittedTableStyle,
} from "./columns/columnSizing";
export type { ColumnGroupRecord, FlattenedColumns } from "./columns/columnTree";
export {
  applyCollapsedColumnGroups,
  type ColumnGroupDef,
  type ColumnInput,
  flattenColumnTree,
} from "./columns/columnTree";
export type { WidthColumn } from "./columns/columnWidths";
export { pinnedColumnWidth } from "./columns/columnWidths";
export type { GroupedHeaderAlign } from "./columns/headerGroups";
export {
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  headerGroupRow,
  headerGroupRows,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  toggleCollapsedColumnGroup,
} from "./columns/headerGroups";
export { EyeIcon, GripIcon, PinIcon } from "./columns/icons";
export type { PinSide, UseColumnLayoutResult } from "./columns/useColumnLayout";
export {
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "./columns/useColumnLayout";
export { DEFAULT_CARD_SIZE_PX } from "./constants";
export {
  cellHighlightStyle,
  groupIndentStyle,
  type GroupRowKind,
  groupRowParts,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  logicalAlign,
  mergedCellStyle,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  resolveMobileLabel,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  sortArrow,
} from "./display";
export type { BatchEditingState } from "./editing/batchEditing";
export type {
  CustomCellEditorRender,
  EditableColumnLike,
} from "./editing/cellEditing";
export type { EditableCellEditing } from "./editing/editableCellController";
export {
  focusEditorOnMount,
  rowEditingSignature,
  rowIsDirty,
} from "./editing/editableCellController";
export type { EditableCellEditorCtrl } from "./editing/EditableCellGate";
export {
  commitBooleanDraft,
  type EditableCellActivateProps,
  type EditableCellButtonProps,
  type EditableCellSlots,
  editorBusyProps,
  editorValidationProps,
  multiDraftFromSelect,
  stopEditKeys,
} from "./editing/EditableCellGate";
export type { EditHistoryState } from "./editing/editHistory";
export {
  BatchEditBarChrome,
  type BatchEditBarChromeProps,
  type BatchEditBarProps,
  type BatchEditBarSlots,
  type BatchEditButtonProps,
  BatchEditCell,
  type BatchEditCellProps,
  RowEditActionsChrome,
  type RowEditActionsChromeProps,
  type RowEditActionsProps,
  type RowEditActionsSlots,
  type RowEditButtonProps,
  RowEditCell,
  type RowEditCellProps,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
} from "./editing/RowEditGate";
export type { RowEditingState } from "./editing/rowEditing";
export {
  ExportAnnouncer,
  type ExportAnnouncerProps,
} from "./export/ExportAnnouncer";
export { exportButtonLabel } from "./export/exportLabel";
export type { ExportWriter } from "./export/exportWriter";
export {
  type ExportHandlerState,
  type ExportStatus,
  useExportHandler,
} from "./export/useExportHandler";
export type { FeatureHostState } from "./features/currentHost";
export { bindFeatureHostFn } from "./features/currentHost";
export { useTableFeatures } from "./features/featureHost";
export { featureHostOf, rememberFeatureHost } from "./features/featureHost";
export {
  FeatureHostProvider,
  useFeatureHost,
} from "./features/featureHostContext";
export type { TableFeature, TableFeatureHost } from "./features/tableFeature";
export type { FeatureApplyInput, FeaturePatch } from "./features/tableFeature";
export { applyTableFeatures } from "./features/tableFeature";
export {
  type ChecklistButtonProps,
  type ChecklistCheckboxProps,
  ChecklistChrome,
  type ChecklistChromeProps,
  type ChecklistClassNames,
  type ChecklistFilterProps,
  type ChecklistSearchProps,
  type ChecklistSlots,
} from "./filters/ChecklistChrome";
export type { FacetMap } from "./filters/facets";
export type { FilterDef, FilterRuntime } from "./filters/filterDefs";
export type { FilterFormSource } from "./filters/filterForm";
export {
  FilterHeaderChrome,
  type FilterHeaderChromeProps,
  type FilterHeaderClassNames,
  FilterHeaderControlChrome,
  type FilterHeaderControlChromeProps,
  type FilterHeaderControlProps,
  type FilterHeaderMultiProps,
  type FilterHeaderOption,
  type FilterHeaderRangeProps,
  type FilterHeaderRowProps,
  type FilterHeaderSearchProps,
  type FilterHeaderSelectProps,
  type FilterHeaderSlots,
  hasActiveHeaderFilter,
} from "./filters/FilterHeaderRow";
export type {
  FilterTypeRegistry,
  FilterTypeSpec,
} from "./filters/filterRegistry";
export {
  type FilterTreeBuilderProps,
  type FilterTreeButtonProps,
  FilterTreeChrome,
  type FilterTreeChromeProps,
  type FilterTreeClassNames,
  type FilterTreeDisclosureProps,
  type FilterTreeInputProps,
  type FilterTreeOption,
  type FilterTreeSelectProps,
  type FilterTreeSlots,
} from "./filters/FilterTreeChrome";
export {
  FindBarChrome,
  type FindBarChromeProps,
  type FindBarProps,
  type FindBarSlots,
  type FindButtonKind,
  type FindButtonProps,
  type FindSearchProps,
} from "./find/FindBar";
export type { FindInTableState } from "./find/useFindInTable";
export {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
  type ColumnSelectSlots,
} from "./focus/ColumnSelectCheckbox";
export {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "./focus/FillHandle";
export {
  GridFocusAnnouncer,
  type GridFocusAnnouncerProps,
} from "./focus/GridFocusAnnouncer";
export type { SelectionStats } from "./focus/selectionStats";
export {
  type SelectionStatPart,
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlotProps,
  type SelectionStatsSlots,
} from "./focus/SelectionStatsBar";
export {
  type FeatureNotice,
  type FeatureNoticeKind,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarItem,
  type StatusBarSlotProps,
  type StatusBarSlots,
} from "./focus/StatusBarChrome";
export type { GridFocusState } from "./focus/useGridFocus";
export type { GroupByInput } from "./grouping/groupKeys";
export {
  GroupMoreButtonChrome,
  type GroupMoreButtonChromeProps,
  type GroupMoreButtonProps,
  type GroupMoreButtonSlotProps,
  type GroupMoreButtonSlots,
} from "./grouping/GroupMoreButton";
export type { GroupAggregatesFn, GroupedFlatEntry } from "./grouping/groupRows";
export { GroupToggleSpacer } from "./grouping/GroupToggleSpacer";
export type { GroupCollapseState } from "./grouping/useGroupCollapse";
export {
  type MountStaggerOptions,
  useMountStagger,
} from "./hooks/useMountStagger";
export {
  OVERLAY_MOTION,
  type OverlayTransition,
  useOverlayTransition,
} from "./hooks/useOverlayTransition";
export { ExpandChevron, FiltersIcon, SearchIcon } from "./icons";
export {
  createDesktopRow,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  type DesktopAssemblyOptions,
  type DesktopAssemblyProps,
  type DesktopBodySlot,
  type DesktopChromeWidths,
  type DesktopExtraSlot,
  type DesktopGroupEntry,
  type DesktopGroupSlot,
  type DesktopHeaderLeaf,
  type DesktopRowSlot,
  type DesktopRowWiring,
  type DesktopTableAssembly,
  type DesktopTablePin,
  type DesktopVirtualPadSlot,
  useDesktopTableAssembly,
} from "./layout/desktopTableAssembly";
export type { SidePanelEntry } from "./layout/SidePanelChrome";
export {
  SidePanelChrome,
  type SidePanelChromeProps,
  type SidePanelCloseProps,
  type SidePanelFrameProps,
  SidePanelLayout,
  type SidePanelLayoutProps,
  type SidePanelSlots,
  type SidePanelTabProps,
} from "./layout/SidePanelChrome";
export { type FullscreenState, useFullscreen } from "./layout/useFullscreen";
export {
  resolveStickyToolbar,
  useStickyToolbarLayout,
} from "./layout/useStickyToolbarLayout";
export {
  type PaginationItem,
  paginationItems,
  type PaginationSlot,
  paginationSlots,
} from "./pagination/paginationMath";
export type { PivotField, PivotZone } from "./pivot/pivotConfigModel";
export type { PivotConfig } from "./pivot/pivotModel";
export {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "./pivot/PivotPanelChrome";
export type { BaseDataTableProps, ToolbarSlots } from "./props";
export { cellFlashAttr, rowFlashSignature } from "./rows/cellFlashPaint";
export type { GetCellSpan } from "./rows/cellSpan";
export {
  type BodyCell,
  bodyCellsHaveRowSpan,
  cellsForRow,
  type CellSpanAppearance,
  cellSpanMark,
  rowSpanSignature,
} from "./rows/cellSpan";
export type { ExtraRowKind } from "./rows/extraRows";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  type ExtraEntry,
  extraHostFillStyle,
  type ExtraRow,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
} from "./rows/extraRows";
export type { MobileCardRenderer } from "./rows/mobileCard";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
  useOffsetHeight,
} from "./rows/pinnedRowChrome";
export type { RowActionsLayout, RowActionsRenderer } from "./rows/rowActions";
export { type RowClickProps, rowClickProps } from "./rows/rowClickProps";
export type { RowPinningState, RowPinSide } from "./rows/rowPinning";
export { rowPinSignature } from "./rows/rowPinning";
export type { RowReorderLabels } from "./rows/rowReorder";
export {
  REORDER_COLUMN_WIDTH,
  ROW_DND_MIME,
  rowReorderDropStyle,
  rowReorderSignature,
  type RowReorderState,
} from "./rows/rowReorder";
export {
  RowReorderAnnouncer,
  RowReorderButtonsChrome,
  type RowReorderButtonsChromeProps,
  type RowReorderButtonsProps,
  type RowReorderButtonsSlots,
  RowReorderHandleChrome,
  type RowReorderHandleChromeProps,
  type RowReorderHandleProps,
  type RowReorderHandleSlotProps,
  type RowReorderHandleSlots,
  type RowReorderMoveButtonProps,
} from "./rows/RowReorderHandle";
export {
  resolveRowHeight,
  resolveRowStyle,
  type RowHeight,
  type RowStyle,
  rowStyleSignature,
} from "./rows/rowStyle";
export type { RowExpansionState } from "./rows/useRowExpansion";
export type { SelectionState } from "./selection/useSelection";
export { deriveSortByOptions } from "./sort/sortByOptions";
export type { QuerySupport } from "./source/queryContract";
export type { TableSource } from "./source/TableSource";
export type { UseServerDataOptions } from "./source/useServerData";
export { type DataModeProps } from "./source/useTableData";
export type { Slot, TableErrorState } from "./state/errorState";
export { fillSlot, tableErrorState } from "./state/errorState";
export type { FeatureNoticeAppearance } from "./state/featureNotices";
export {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "./tableRenderProps";
export type { NestedTableDefaults, NestedTableFor } from "./tree/nestedTable";
export {
  nestedTableDefaults,
  nestedTableDetail,
  type NestedTableParent,
} from "./tree/nestedTable";
export {
  TreeCellChrome,
  type TreeCellChromeProps,
  type TreeCellProps,
} from "./tree/TreeCell";
export type { TreeEntry } from "./tree/treeRows";
export {
  type TreeToggleButtonProps,
  TreeToggleChrome,
  type TreeToggleChromeProps,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "./tree/TreeToggle";
export type { TreeExpansionState } from "./tree/useTreeExpansion";
export type {
  BulkAction,
  BulkActionContext,
  ColumnDef,
  Direction,
  RowAction,
  SortByOption,
  SortDirection,
  TableLabels,
} from "./types";
export type { UrlStateAdapter } from "./url/adapter";
export { useResolvedAdapter } from "./url/adapter";
export {
  type SavedViewControlKey,
  type SavedViewRowControl,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "./url/SavedViewsPanelChrome";
export type { Density } from "./url/useDensityUrlState";
export type { SavedView } from "./url/useSavedViews";
export type {
  CellElementProps,
  SortButtonElementProps,
  UseDataTableResult,
} from "./useDataTable/useDataTable";
export { type SearchInputState } from "./useDataTable/useSearchInput";
export type { DataTableShellProps } from "./useDataTableShell";
export { useDataTableShell } from "./useDataTableShell";
export type { PrintToolbar, TableChrome } from "./useTableChrome";
export {
  type BulkBarChromeProps,
  type FilterTriggerToggle,
  printToolbar,
  type TableBodyRegion,
  type ToolbarChromeProps,
  undoRedoToolbar,
  type ViewControlsToolbar,
  viewControlsToolbar,
} from "./useTableChrome";
export type { Props } from "./utils/mergeProps";
export { ColumnSpacer, type ColumnSpacerProps } from "./virtual/ColumnSpacer";
export {
  type ResizableVirtualizer,
  type RowPairMeasurer,
  useRowPairMeasurer,
} from "./virtual/measureRowPair";
export {
  bindMobileCardList,
  mobileCardListStyle,
} from "./virtual/mobileCardList";
export {
  type ColumnWindow,
  useColumnWindow,
  type UseColumnWindowOptions,
} from "./virtual/useColumnWindow";
export {
  type KeyedVirtualization,
  resolveVirtualRows,
  rowSourceIndex,
  useKeyedVirtualization,
  type VirtualTableRow,
} from "./virtual/useTableVirtualization";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { TableCommandOptions } from "./actions/commandRegistry";
export type { ConfirmRequest } from "./actions/confirm";
export type { ContextMenuActions } from "./actions/contextMenuModel";
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export type { ColumnLayoutState } from "./columns/useColumnLayout";
export type { BatchRowEdit } from "./editing/batchEditing";
export type { CellEditor, CustomCellEditorCtrl } from "./editing/cellEditing";
export type { DirtyCellState } from "./editing/dirtyCells";
export type {
  EditConflictHandler,
  EditConflictPolicy,
  EditConflictState,
} from "./editing/editConflict";
export type { EditEventHandler, EditLifecycle } from "./editing/editingEvents";
export type { RowEditDrafts } from "./editing/rowEditing";
export type { CellSaveState } from "./editing/saveState";
export type { CellEditingState } from "./editing/useCellEditing";
export type { EditValidationState, RowValidator } from "./editing/validation";
export type { ExportPayload, ExportWriteContext } from "./export/exportWriter";
export type { ExportCsvOptions } from "./export/tableCsv";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "./features/currentHost";
export type { FacetCounts } from "./filters/facets";
export type { ColumnFilter, FilterOptionsSource } from "./filters/filterDefs";
export type {
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type {
  ActiveFilterChip,
  ChipLabelResolver,
} from "./filters/useActiveFilterChips";
export type { CellEdit } from "./focus/cellEdits";
export type { CellRange } from "./focus/cellRange";
export type { GridCell } from "./focus/gridFocus";
export type { GroupNode, GroupSort } from "./grouping/groupRows";
export type { PaginationInfo } from "./pagination/paginationMath";
export type { PivotMeasure } from "./pivot/pivotModel";
export type { SidePanelOptions } from "./props";
export type { CellSpanRequest, GetCellSpanArgs } from "./rows/cellSpan";
export type { MobileCardModel } from "./rows/mobileCard";
export type { RowActionsRenderContext } from "./rows/rowActions";
export type { RowMutationsState } from "./rows/rowMutations";
export type { RowPinState } from "./rows/rowPinning";
export type { HeaderSelectionState } from "./selection/useSelection";
export type { QueryCondition, QueryFilterGroup } from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableQuery } from "./source/useServerData";
export type { TableStateMutators } from "./tableStateMutators";
export type { NestedTable } from "./tree/nestedTable";
export type {
  ActionConfirm,
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  ExtraFilters,
  PaginationMode,
  ResolvedPaginationMode,
  SortableValue,
  TableQueryParams,
} from "./types";
export type {
  SavedViewVisibility,
  UseSavedViewsOptions,
} from "./url/useSavedViews";
export type { UseTableUrlStateOptions } from "./url/useTableUrlState";
export type {
  RowElementProps,
  SearchInputElementProps,
  TableElementProps,
} from "./useDataTable/useDataTable";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { Shortcut } from "./actions/useShortcuts";
export type { LayoutStorage } from "./columns/useColumnLayoutStorageState";
export type {
  CellEditCommit,
  CellEditorOption,
  CellEditTarget,
} from "./editing/cellEditing";
export type { EditableCellController } from "./editing/editableCellController";
export type {
  EditConflict,
  EditConflictChoice,
  ReconcileLiveEdit,
} from "./editing/editConflict";
export type { EditEvent } from "./editing/editingEvents";
export type { CellSaveStatus, FailedCellSave } from "./editing/saveState";
export type {
  CellEditKeyOutcome,
  CellEditNavigation,
} from "./editing/useCellEditing";
export type {
  CellValidator,
  ValidationCheckResult,
  ValidationTarget,
} from "./editing/validation";
export type { ExportTable } from "./export/exportWriter";
export type {
  ExportColumnScope,
  ExportInfo,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "./export/tableCsv";
export type { ChecklistValue } from "./filters/checklist";
export type { FilterOption, FilterType } from "./filters/filterDefs";
export type { MobileCardField } from "./rows/mobileCard";
export type { SortLevel } from "./sort/compare";
export type { QueryExtensions } from "./source/queryContract";
export type { ColumnHeaderController, FilterValue } from "./types";
export type { SavedViewMigration, SavedViewsStore } from "./url/useSavedViews";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { EditableCellMode } from "./editing/editableCellController";
export type { EditUnit } from "./editing/editingEvents";
export type { CellEditKeyAction } from "./editing/useCellEditing";
export type { ExportRowMeta } from "./export/exportWriter";
export type { ExportQuery } from "./export/tableCsv";
export type { QueryAggregate } from "./source/queryContract";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export { normalizeEditorOptions } from "./editing/cellEditing";
export { editableCellController } from "./editing/editableCellController";
export type { ExportRowRole } from "./export/exportWriter";
export type { AggregateFn } from "./source/queryContract";
