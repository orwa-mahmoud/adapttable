/** Structural Chrome, required slots, and adapter construction. */
export type {
  CommandPaletteChromeProps,
  CommandPaletteSlots,
  CommandPaletteSurfaceSlot,
  CommandPaletteSurfaceSlotProps,
  ManagedCommandPaletteSurfaceProps,
} from "./actions/commandPaletteChrome";
export {
  CommandPaletteChrome,
  managedCommandPaletteSurface,
} from "./actions/commandPaletteChrome";
export type {
  ContextMenuChromeProps,
  ContextMenuPresentation,
  ContextMenuPresentationProps,
  ContextMenuSlots,
} from "./actions/contextMenuChrome";
export { ContextMenuChrome } from "./actions/contextMenuChrome";
export type {
  ActionButton,
  ActionPresentation,
  BulkActionsModel,
  CommandPaletteModel,
  ContextMenuModel,
  SidePanelControlModel,
} from "./actions/contracts";
export {
  BULK_ACTIONS_CONTROL,
  BULK_ACTIONS_MODEL,
  COMMAND_PALETTE_CONTROL,
  COMMAND_PALETTE_MODEL,
  CONTEXT_MENU_CONTROL,
  CONTEXT_MENU_MODEL,
  EXPORT_CONTROL,
  EXPORT_MODEL,
  PRINT_CONTROL,
  PRINT_MODEL,
  SIDE_PANEL_CONTROL,
  SIDE_PANEL_MODEL,
  UNDO_REDO_CONTROL,
} from "./actions/contracts";
export type {
  SidePanelChromeProps,
  SidePanelPresentation,
  SidePanelPresentationProps,
  SidePanelSlots,
} from "./actions/sidePanelChrome";
export {
  SidePanelChrome,
  SidePanelLayoutChrome,
} from "./actions/sidePanelChrome";
export type {
  ActionButtonSlots,
  BulkActionsChromeProps,
  BulkActionsSlots,
  HistoryButtonsChromeProps,
  PrintChromeProps,
} from "./actions/simpleChrome";
export {
  BulkActionsChrome,
  HistoryButtonsChrome,
  PrintChrome,
} from "./actions/simpleChrome";
export {
  createAdapterAgentApprovalFeature,
  createAdapterTableAssistantFeature,
  tableAssistantSlotKey,
} from "./assistant";
export type {
  AgentApprovalChromeProps,
  ApprovalReviewChromeProps,
} from "./assistant/approvalReviewChrome";
export {
  AgentApprovalChrome,
  ApprovalReviewChrome,
} from "./assistant/approvalReviewChrome";
export type {
  AgentApprovalListProps,
  ApprovalReviewSlots,
  TableAssistantAvatars,
  TableAssistantButtonProps,
  TableAssistantMenuProps,
  TableAssistantPanelProps,
  TableAssistantProps,
  TableAssistantSheetProps,
  TableAssistantSlots,
  TableAssistantWindowProps,
} from "./assistant/contracts";
export type { TableAssistantChromeProps } from "./assistant/tableAssistantChrome";
export { TableAssistantChrome } from "./assistant/tableAssistantChrome";
export {
  composeElementRefs,
  elementRef,
  mergeVueAttrs,
  toVueAttrs,
  toVueStyle,
} from "./attrs";
export {
  provideDataTableClassNames,
  useDataTableClassNames,
} from "./classNamesContext";
export {
  renderCell,
  renderContent,
  renderFooter,
  renderHeader,
} from "./columnDef";
export type {
  ColumnGroupToggleChromeProps,
  ColumnGroupToggleSlots,
} from "./columns/columnGroupToggle";
export { ColumnGroupToggleChrome } from "./columns/columnGroupToggle";
export type {
  ColumnMenuButtonProps,
  ColumnMenuSlots,
  ColumnRenameSlots,
} from "./columns/columnMenuChrome";
export {
  ColumnHeaderRenameChrome,
  ColumnMenuChrome,
} from "./columns/columnMenuChrome";
export type {
  ColumnHeaderRenameSlotProps,
  ColumnMenuLabels,
  ColumnMenuSlotProps,
} from "./columns/columnMenuContracts";
export {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  columnMenuSlotKey,
} from "./columns/columnMenuContracts";
export type {
  ColumnMenuDisplayRow,
  ColumnMenuModel,
} from "./columns/useColumnMenu";
export { useColumnMenu } from "./columns/useColumnMenu";
export type { ColumnRenameEditorState } from "./columns/useColumnRenameEditor";
export { useColumnRenameEditor } from "./columns/useColumnRenameEditor";
export type {
  EditableCellChromeSlots,
  EditableCellClassNames,
  EditableCellEditorProps,
  EditableCellModel,
  VueEditableCellProps,
} from "./editing/editableCellChrome";
export {
  EditableCellChrome,
  editableCustomControl,
  useEditableCellModel,
} from "./editing/editableCellChrome";
export type {
  BatchEditBarProps,
  EditingActionButtonProps,
  EditingActionSlots,
  RowEditActionsProps,
} from "./editing/rowEditChrome";
export {
  BatchEditBarChrome,
  RowEditActionsChrome,
} from "./editing/rowEditChrome";
export type {
  ExportChromeProps,
  ExportProgressChromeProps,
  ExportProgressSlots,
  ExportSlots,
} from "./export/exportChrome";
export { ExportChrome, ExportProgressChrome } from "./export/exportChrome";
export type { FeatureLifecycle } from "./featureLifecycle";
export { useFeatureLifecycle } from "./featureLifecycle";
export { mountGrouping } from "./features/grouping";
export {
  assertRequiredSlots,
  eraseTableRuntime,
  extendFeature,
  featureOptionsOf,
  featureSlotFillsOf,
  normalizeFeatures,
  renderFeatureSlot,
} from "./features/tableFeature";
export type { OwnedFeatureState, TableFeatureState } from "./featureState";
export {
  createFeatureState,
  provideFeatureState,
  useFeatureState,
} from "./featureState";
export { FILTER_VIEW } from "./filters";
export type { ChecklistChromeModel } from "./filters/checklistChrome";
export {
  ChecklistChrome,
  useChecklistModel,
  useChecklistWindow,
} from "./filters/checklistChrome";
export type {
  FilterChipButtonProps,
  FilterChipsClassNames,
  FilterChipsSlots,
} from "./filters/filterChipsChrome";
export { FilterChipsChrome } from "./filters/filterChipsChrome";
export type {
  FilterCheckboxProps,
  FilterFieldClassNames,
  FilterFieldControl,
  FilterFieldModel,
  FilterFieldOptions,
  FilterFieldSlots,
  FilterInputProps,
  FilterSelectProps,
} from "./filters/filterFieldChrome";
export { FilterFieldChrome, useFilterField } from "./filters/filterFieldChrome";
export type {
  FilterHeaderControlModel,
  FilterHeaderControlOptions,
  FilterHeaderSlots,
} from "./filters/filterHeaderControl";
export {
  FilterHeaderControlChrome,
  useFilterHeaderControl,
} from "./filters/filterHeaderControl";
export type {
  FilterHeaderRowProps,
  FilterHeaderRowSlots,
} from "./filters/filterHeaderRow";
export { FilterHeaderRowChrome as FilterHeaderChrome } from "./filters/filterHeaderRow";
export type {
  FilterPanelButtonProps,
  FilterPanelClassNames,
  FilterPanelModel,
  FilterPanelSlots,
  FilterPanelSurfaceProps,
  FilterTriggerProps,
} from "./filters/filterPanelChrome";
export { FilterPanelChrome } from "./filters/filterPanelChrome";
export type { FilterTreeModel } from "./filters/filterTreeChrome";
export {
  FilterTreeChrome,
  useFilterTreeModel,
} from "./filters/filterTreeChrome";
export type {
  HeaderFilterChromeSlots,
  HeaderFilterOptions,
} from "./filters/headerFilterChrome";
export {
  HeaderFilterChrome,
  useHeaderFilter,
} from "./filters/headerFilterChrome";
export type { GroupRowChromeProps } from "./grouping/groupRowChrome";
export { GroupRowChrome } from "./grouping/groupRowChrome";
export {
  groupingModelKey,
  rowDetailModelKey,
  treeModelKey,
} from "./hierarchy/models";
export type {
  DataTableSurfaceChromeProps,
  DataTableSurfaceSlots,
} from "./layout/dataTableSurfaceChrome";
export { DataTableSurfaceChrome } from "./layout/dataTableSurfaceChrome";
export type { GroupRowSlotProps } from "./layout/groupRowSlot";
export { GROUP_ROW, groupRowSlotKey } from "./layout/groupRowSlot";
export type {
  ColumnResizeModel,
  EditingChromeModel,
  HeaderFilterModel,
  RowActionsModel,
  VueHeaderFilterControlProps,
} from "./layout/modelChannels";
export {
  batchEditBarSlotKey,
  COLUMN_RESIZE_MODEL,
  EDIT_HISTORY_MODEL,
  editableCellSlotKey,
  editHistoryModelKey,
  EDITING_CHROME_MODEL,
  EDITING_MODEL,
  editingChromeModelKey,
  editingModelKey,
  filterViewKey,
  HEADER_FILTER_MODEL,
  headerFilterModelKey,
  headerFilterSlotKey,
  ROW_ACTIONS_MODEL,
  ROW_PINNING_MODEL,
  rowActionsModelKey,
  rowEditActionsSlotKey,
  rowPinningModelKey,
} from "./layout/modelChannels";
export type {
  SelectionCheckboxProps,
  SortButtonProps,
  TableChromeClassNames,
  TableChromeSlots,
} from "./layout/tableChrome";
export { DesktopTableChrome, MobileCardsChrome } from "./layout/tableChrome";
export {
  useDesktopTableModel,
  useMobileCardsModel,
} from "./layout/tableModels";
export type {
  TableSummaryChromeProps,
  TableSummaryClassNames,
} from "./layout/tableSummaryChrome";
export {
  MobileSummaryChrome,
  TableFooterChrome,
  TableSummaryChrome,
} from "./layout/tableSummaryChrome";
export {
  useSummaryCells,
  useTableSummaryModel,
} from "./layout/tableSummaryModel";
export { useFullscreen } from "./layout/useFullscreen";
export type { CellRange, FindButtonControlProps } from "./navigation/contracts";
export {
  FILL_HANDLE_CONTROL,
  FIND_BUTTON,
  FIND_MODEL,
  GRID_ANNOUNCER,
  GRID_FOCUS_MODEL,
  SELECTION_STATS_MODEL,
} from "./navigation/contracts";
export type {
  ColumnSelectCheckboxChromeProps,
  ColumnSelectSlots,
  FillHandleChromeProps,
  FillHandleSlots,
  FindBarChromeProps,
  FindBarSlots,
  SelectionStatsChromeProps,
  SelectionStatsSlots,
  StatusBarChromeProps,
  StatusBarSlotProps,
  StatusBarSlots,
} from "./navigation/navigationChrome";
export {
  ColumnSelectCheckboxChrome,
  FillHandleChrome,
  FindBarChrome,
  GridFocusAnnouncer,
  SelectionStatsChrome,
  StatusBarChrome,
} from "./navigation/navigationChrome";
export type {
  ManagedOverlayPanelProps,
  OverlayCloseReason,
  OverlayPanelProps,
  OverlayPanelSlot,
} from "./overlayPanel";
export { managedOverlayPanel } from "./overlayPanel";
export type { ExtraEntry, ExtraRow } from "./rows/extraRows";
export type {
  HeadlessBodySlot,
  HeadlessRowsOptions,
} from "./rows/headlessRowsModel";
export { rowActionControls } from "./rows/rowActionControls";
export type { SelectionCheckboxControl } from "./selection/checkboxControl";
export {
  selectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "./selection/checkboxControl";
export {
  bodyWindowModelKey,
  groupingPanelControlKey,
  groupingPanelModelKey,
  rowReorderControlKey,
  rowReorderModelKey,
} from "./specialized/contracts";
export type {
  GroupingPanelChromeProps,
  GroupingPanelSlots,
} from "./specialized/groupingPanel";
export { GroupingPanelChrome } from "./specialized/groupingPanel";
export type {
  PivotPanelChromeProps,
  PivotPanelSlots,
} from "./specialized/pivot";
export { PivotPanelChrome } from "./specialized/pivot";
export type {
  RowReorderControlProps,
  RowReorderControlSlots,
} from "./specialized/rowReorder";
export { RowReorderChrome } from "./specialized/rowReorder";
export type { ExternalStore } from "./store";
export { useExternalStore, useScopeActivity } from "./store";
export type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "./tableAdapterContracts";
export { nestedTableDetail } from "./tree/nestedTable";
export type {
  SavedViewsMenuChromeProps,
  SavedViewsMenuSlots,
} from "./url/SavedViewsMenuChrome";
export { SavedViewsMenuChrome } from "./url/SavedViewsMenuChrome";
export type {
  SavedViewsPanelChromeProps,
  SavedViewsPanelSlots,
} from "./url/SavedViewsPanelChrome";
export { SavedViewsPanelChrome } from "./url/SavedViewsPanelChrome";
export type { UseDataTableShellResult } from "./useDataTableShell";
export { useDataTableShell } from "./useDataTableShell";
export { useElementRef } from "./useElementRef";
export type {
  DensityControlProps,
  FullscreenControlProps,
  SavedViewsControlProps,
  ViewControlPresentation,
} from "./viewControls/contracts";
export {
  DENSITY_CONTROL,
  FULLSCREEN_CONTROL,
  FULLSCREEN_MODEL,
  SAVED_VIEWS_CONTROL,
  SAVED_VIEWS_MODEL,
} from "./viewControls/contracts";
export type {
  DensityChooserSlots,
  ViewControlButtonProps,
} from "./viewControls/viewControlsChrome";
export {
  DensityChooserChrome,
  FullscreenButtonChrome,
} from "./viewControls/viewControlsChrome";
export type {
  ColumnRenameEditorOptions,
  ColumnResizeHandleOptions,
  ColumnResizeHandleProps,
  RowActionsLayout,
} from "@adapttable/core";
export {
  defaultConfirm,
  defaultFilterRegistry,
  editorInputType,
  filterLabel,
  filterWidgetKind,
  formatMultiDraft,
  readMultiDraft,
  resolveLabels,
} from "@adapttable/core";
export type {
  ActiveFilterChipsSlotProps,
  AgentApprovalButtonProps,
  AgentApprovalProps,
  ChecklistClassNames,
  ChecklistFilterProps,
  ChecklistSlots,
  ChromeBodyRegion,
  ChromeExtraSlot,
  ChromeGroupSlot,
  ChromeRowSlot,
  ChromeVirtualPadSlot,
  ColumnGroupToggleButtonProps,
  ColumnSelectCheckboxProps,
  CommandPaletteSurfaceProps,
  ContextMenuSurfaceProps,
  ExportHandlerState,
  ExportProgressSurfaceSlotProps,
  FillHandleSlotProps,
  FilterHeaderClassNames,
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderOption,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
  FilterTreeBuilderProps,
  FilterTreeButtonProps,
  FilterTreeDisclosureProps,
  FilterTreeInputProps,
  FilterTreeSelectProps,
  FilterTreeSlots,
  FindBarProps,
  FindButtonProps,
  FindSearchProps,
  FullscreenState,
  RowEditIcons,
  RowMoveConfirmationProps,
  RowMoveMenuSlotProps,
  SavedViewControlKey,
  SavedViewsPanelEmptyProps,
  SavedViewsPanelInputProps,
  SelectionStatPart,
  SelectionStatsSlotProps,
  SpeechInputHandle,
  StatusBarItem,
  TableAssistantBadgeProps,
  TableAssistantComposerProps,
  TableAssistantLanguageChipProps,
  TableAssistantView,
  ToolbarExtrasSlotProps,
} from "@adapttable/core/binding";
export {
  ACTIVE_FILTER_CHIPS,
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_PROGRESS_STATE,
  AGENT_VIEW_STATE,
  applyCollapsedColumnGroups,
  bodyCellsHaveRowSpan,
  cellsForRow,
  cellSpanMark,
  COLUMN_GROUP_ID_SEP,
  COLUMN_GROUP_RENDER_PREFIX,
  COLUMN_GROUP_STUB_PREFIX,
  COLUMN_GROUP_STUB_WIDTH,
  COLUMN_SELECT,
  columnGroupHeaderCaption,
  columnGroupId,
  columnGroupPath,
  columnGroupStubStyle,
  columnMenuActions,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraHostFillStyle,
  extraRowsForSection,
  extraUncoveredColSpans,
  featureSlotKey,
  featureStateKey,
  filterColumnMenuRows,
  FIND_BAR,
  flattenColumnTree,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  headerGroupRow,
  headerGroupRows,
  hideAllColumns,
  htmlGroupedHeaderPlan,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  isExtraEntry,
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
  REORDER_COLUMN_WIDTH,
  resetColumnLayout,
  resolveRowHeight,
  resolveRowStyle,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSourceIndex,
  rowSpanSignature,
  rowStyleSignature,
  showAllColumns,
  slotRender,
  standardFeatureList,
  STATUS_BAR,
  toggleCollapsedColumnGroup,
  TOOLBAR_EXTRAS,
  unpinAllColumns,
} from "@adapttable/core/binding";
export { resolveCellSpan } from "@adapttable/core/binding";
export {
  createMenuNavigation,
  type MenuNavigationAction,
  type MenuNavigationController,
  type MenuNavigationItem,
  type MenuNavigationKey,
} from "@adapttable/core/binding";

// Types this entry's own signatures hand back.
export type { SidePanelOptions, SidePanelPanel } from "./actions/contracts";
export type { SummaryRowFn } from "./aggregate/aggregate";
export type { Attrs, ElementRef } from "./attrs";
export type {
  CellContext,
  ColumnDef,
  ColumnGroup,
  ColumnInput,
  ComponentRenderer,
  FooterContext,
  HeaderContext,
  Renderer,
  RenderFunction,
} from "./columnDef";
export type { ColumnLayout, ColumnLayoutOptions } from "./columns/columnLayout";
export type { DirtyEdits, TableEditingOptions } from "./editing/editingModels";
export type { FeatureState } from "./featureState";
export type {
  ComposedFeature,
  FeatureMountContext,
  StaticFeatureHost,
  StaticTableFeature,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
export type {
  GroupRowModel,
  RowDetailModel,
  TableGrouping,
  TableRowDetail,
  TableTree,
  TreeCellModel,
} from "./hierarchy/models";
export type { TableRowInventory } from "./hierarchy/rowInventory";
export type {
  RowActionControl,
  RowActionControlsInput,
  RowActionControlsProjector,
  TableBodyProjection,
  TableBodyProjectionInput,
  TableBodyProjector,
} from "./layout/modelChannels";
export type {
  DesktopTableModel,
  MobileCardsModel,
  TableBodySlot,
  TableCellModel,
  TableHeaderModel,
  TableRowModel,
} from "./layout/tableModels";
export type {
  SummaryCells,
  TableSummaryCellModel,
  TableSummaryModel,
} from "./layout/tableSummaryModel";
export type { SelectionCheckboxAttrs } from "./selection/checkboxControl";
export type { RowSelection } from "./selection/selection";
export type { SourceViewportOptions } from "./source/sourceLifecycle";
export type { UseFrontendDataOptions } from "./source/useFrontendData";
export type { GroupingPanelProps } from "./specialized/groupingPanel";
export type { VuePivotAggProps } from "./specialized/pivot";
export type { VueRowReorderModel } from "./specialized/rowReorder";
export type { BodyWindowModel } from "./specialized/virtualize";
export type { ExternalStoreOptions, MaybeRefOrGetterOptional } from "./store";
export type { NestedTable, NestedTableFor } from "./tree/nestedTable";
export type { UseSavedViewsResult } from "./url/useSavedViews";
export type { UseTableUrlStateOptions } from "./url/useTableUrlState";
export type {
  useDataTable,
  UseDataTableOptions,
  UseDataTableResult,
} from "./useDataTable";
export type {
  DataTableHandle,
  DataTableSurface,
  ResolvedTableOptions,
  UseDataTableShellOptions,
} from "./useDataTableShell";
