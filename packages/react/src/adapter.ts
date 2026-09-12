/**
 * `@adapttable/react/adapter` — the builder tier.
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

export {
  ensureForcedColorsStyles,
  FORCED_COLORS_CSS,
  ForcedColorsStyle,
} from "./a11y/forcedColors";
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
export {
  ContextMenuChrome,
  type ContextMenuChromeProps,
  type ContextMenuItemProps,
  type ContextMenuSlots,
  type ContextMenuSurfaceProps,
} from "./actions/ContextMenuChrome";
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
export { createAdapterAgentApprovalFeature } from "./adapterFeatures/agentApproval";
export {
  type AdapterCommandPaletteFeature,
  type AdapterCommandPaletteProps,
  createAdapterCommandPaletteFeature,
} from "./adapterFeatures/commandPalette";
export type { AdapterFeatureComponent } from "./adapterFeatures/component";
export {
  type AdapterContextMenuFeature,
  type AdapterContextMenuProps,
  createAdapterContextMenuFeature,
} from "./adapterFeatures/contextMenu";
export {
  type AdapterEditingComponents,
  type AdapterEditingFeatures,
  createAdapterEditingFeatures,
  type EditableCellRenderProps,
} from "./adapterFeatures/editing";
export {
  ContextMenuLiveGate,
  OptionalSidePanel,
} from "./adapterFeatures/featureRoot";
export {
  type AdapterFiltersComponents,
  type AdapterFiltersFeature,
  createAdapterFiltersFeature,
} from "./adapterFeatures/filters";
export {
  type AdapterGroupingComponents,
  type AdapterGroupingFeature,
  createAdapterGroupingFeature,
} from "./adapterFeatures/grouping";
export {
  type AdapterGroupingPanelComponents,
  type AdapterGroupingPanelFeature,
  createAdapterGroupingPanelFeature,
} from "./adapterFeatures/groupingPanel";
export {
  type AdapterRowDetailComponents,
  type AdapterRowDetailFeatures,
  createAdapterRowDetailFeatures,
} from "./adapterFeatures/rowDetail";
export {
  type AdapterRowReorderComponents,
  type AdapterRowReorderFeature,
  createAdapterRowReorderFeature,
} from "./adapterFeatures/rowReorder";
export {
  type AdapterStandardFeatureFactories,
  createAdapterStandardFeatures,
  type StandardFeatureOptions,
  type StandardFeaturesFactory,
} from "./adapterFeatures/standardPreset";
export { createAdapterTableAssistantFeature } from "./adapterFeatures/tableAssistant";
export type { ColumnDef } from "./columnDef";
export {
  type ColumnGroupToggleButtonProps,
  ColumnGroupToggleChrome,
  type ColumnGroupToggleChromeProps,
  type ColumnGroupToggleProps,
  type ColumnGroupToggleSlots,
} from "./columns/ColumnGroupToggle";
export {
  COLUMN_DND_MIME,
  type ColumnDragRowAttrs,
  type ColumnDragState,
  type ColumnDropProps,
  type ColumnReorderKeyProps,
  type ColumnRowDragProps,
} from "./columns/columnReorder";
export { flattenReactColumnTree } from "./columns/flattenColumnTree";
export { EyeIcon, GripIcon, PinIcon } from "./columns/icons";
export {
  type ReactColumnResizeHandleProps,
  toReactColumnResizeHandleProps,
} from "./columns/reactColumnResize";
export type { PinSide, UseColumnLayoutResult } from "./columns/useColumnLayout";
export type { ReactUseColumnLayoutResult } from "./columns/useColumnLayout";
export {
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "./columns/useColumnLayout";
export {
  type ColumnRenameEditorState,
  useColumnRenameEditor,
  type UseColumnRenameEditorOptions,
} from "./columns/useColumnRenameEditor";
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
export {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  AGENT_VIEW_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalButtonProps,
  AgentApprovalChrome,
  type AgentApprovalChromeProps,
  type AgentApprovalDecision,
  type AgentApprovalListProps,
  type AgentApprovalOperation,
  type AgentApprovalPending,
  type AgentApprovalProposal,
  type AgentViewState,
  type AgentApprovalProps,
  type AgentApprovalSlots,
} from "./editing/AgentApprovalChrome";
export {
  APPROVAL_PREVIEW_LIMIT,
  type ApprovalReview,
  approvalReview,
  type ApprovalReviewItem,
} from "./editing/approvalReview";
export {
  ApprovalReviewChrome,
  type ApprovalReviewChromeProps,
  type ApprovalReviewSlots,
} from "./editing/ApprovalReviewChrome";
export type { BatchEditingState } from "./editing/batchEditing";
export type { EditableCellEditing } from "./editing/editableCellController";
export {
  focusEditorOnMount,
  rowEditingSignature,
  rowIsDirty,
} from "./editing/editableCellController";
export type { EditableCellEditorCtrl } from "./editing/EditableCellGate";
export {
  type CellConflictAsk,
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
  type RowEditConflict,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
  type RowEditIcons,
} from "./editing/RowEditGate";
export type { RowEditingState } from "./editing/rowEditing";
export {
  resolveRowEditTrigger,
  rowEditConflict,
  type RowEditTrigger,
} from "./editing/rowEditTrigger";
export {
  ExportAnnouncer,
  type ExportAnnouncerProps,
} from "./export/ExportAnnouncer";
export {
  type ExportProgressAction,
  ExportProgressChrome,
  type ExportProgressChromeProps,
  type ExportProgressDownload,
  type ExportProgressSlots,
  type ExportProgressSurfaceSlotProps,
} from "./export/ExportProgressChrome";
export {
  type ExportHandlerState,
  type ExportProgressState,
  type ExportStatus,
  useExportHandler,
} from "./export/useExportHandler";
export { ChromeBodyGate, DataTableShellView } from "./features/chromeBodyGate";
export { ChromeExtrasGate } from "./features/chromeExtrasGate";
export type { ResolvedDensity } from "./features/densityStateKey";
export { useResolvedDensity } from "./features/densityStateKey";
export type { RowOf } from "./features/featureHost";
export { useTableFeatures } from "./features/featureHost";
export { featureHostOf, rememberFeatureHost } from "./features/featureHost";
export {
  FeatureHostProvider,
  useFeatureHost,
} from "./features/featureHostContext";
export type { GroupingExtras, StaticGroupingExtras } from "./features/grouping";
export type {
  FeatureProviderContribution,
  FeatureProviderProps,
  FeatureRender,
  FeatureSlotKey,
  FeatureStateKey,
  TableRuntime,
  TableRuntimeView,
} from "./features/providers";
export {
  extendFeature,
  FeatureProviders,
  FeatureSlot,
  featureSlotKey,
  featureStateKey,
  FeatureStateScope,
  slotRender,
  useFeatureSlotFilled,
  useFeatureState,
  usePublishTableRuntime,
  useTableRuntime,
} from "./features/providers";
export { HistoryLiveGate, ShellLiveGate } from "./features/shellLiveGate";
export {
  DISABLED_EXPORT,
  DISABLED_FIND,
  disabledHistory,
  windowedTableAria,
} from "./features/shellLiveStubs";
export type {
  CellNavLiveSlotProps,
  ChromeBodySlotProps,
  ChromeExtraSlotProps,
  ColumnHeaderRenameSlotProps,
  ContextMenuLiveSlotProps,
  EditableCellSlotProps,
  EditHistoryLiveSlotProps,
  ExpandToggleSlotProps,
  ExportLiveSlotProps,
  FillHandleCellSlotProps,
  FilterOverlaySlotProps,
  FindLiveSlotProps,
  FullscreenLiveSlotProps,
  GroupHeaderCardSlotProps,
  GroupHeaderRowSlotProps,
  SavedViewsSlotProps,
  SelectionStatsLiveSlotProps,
  ToolbarExtrasSlotProps,
} from "./features/slotKeys";
export {
  ACTIVE_FILTER_CHIPS,
  AGENT_APPROVAL,
  BATCH_EDIT_BAR,
  BULK_BAR,
  CELL_NAV_LIVE,
  CHROME_BODY,
  COLUMN_GROUP_TOGGLE,
  COLUMN_HEADER_RENAME,
  COLUMN_LAYOUT_LIVE,
  COLUMN_MENU,
  COLUMN_SELECT,
  COMMAND_PALETTE,
  COMMAND_PALETTE_LIVE,
  CONTEXT_MENU,
  CONTEXT_MENU_LIVE,
  EDIT_HISTORY_LIVE,
  EDITABLE_CELL,
  EDITING_LIVE,
  EXPAND_TOGGLE,
  EXPANSION_LIVE,
  EXPORT_LIVE,
  FILL_HANDLE,
  FILTER_CHIPS_LIVE,
  FILTER_DRAWER,
  FILTER_HEADER,
  FILTER_POPOVER,
  FILTERS_FORM,
  FIND_BAR,
  FIND_LIVE,
  FULLSCREEN_LIVE,
  GRID_FOCUS_ANNOUNCER,
  GROUP_HEADER_CARD,
  GROUP_HEADER_ROW,
  GROUPING_LIVE,
  GROUPING_PANEL,
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
  PINNING_LIVE,
  ROW_ACTIONS_LIVE,
  ROW_EDIT_ACTIONS,
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
  SAVED_VIEWS,
  SELECTION_LIVE,
  SELECTION_STATS_LIVE,
  SIDE_PANEL,
  STATUS_BAR,
  TABLE_ASSISTANT,
  TOOLBAR_EXTRAS,
  TREE_CELL,
  TREE_LIVE,
  TREE_TOGGLE,
} from "./features/slotKeys";
export type {
  StaticFeatureHost,
  StaticTableFeature,
  TableFeature,
  TableFeatureHost,
} from "./features/tableFeature";
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
export type {
  FilterFormSource,
  FiltersFormSlotProps,
} from "./filters/filterForm";
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
export type {
  FindInTableState,
  UseFindInTableOptions,
} from "./find/useFindInTable";
export { FIND_URL_WRITE_DEBOUNCE_MS } from "./find/useFindInTable";
export {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
  type ColumnSelectSlots,
} from "./focus/ColumnSelectCheckbox";
export {
  type ContextMenuCopyTarget,
  contextMenuCopyTarget,
} from "./focus/contextMenuCopy";
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
export type { GridFocusState, UseGridFocusOptions } from "./focus/useGridFocus";
export {
  GroupMoreButtonChrome,
  type GroupMoreButtonChromeProps,
  type GroupMoreButtonProps,
  type GroupMoreButtonSlotProps,
  type GroupMoreButtonSlots,
} from "./grouping/GroupMoreButton";
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
export { useOffsetHeight } from "./layout/useOffsetHeight";
export {
  resolveStickyToolbar,
  useStickyToolbarLayout,
} from "./layout/useStickyToolbarLayout";
export { restoreFocusSoon } from "./overlays/restoreFocus";
export {
  type EscapeCloseOptions,
  useEscapeClose,
} from "./overlays/useEscapeClose";
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
export type { SummaryRowFn } from "./props";
export type {
  BaseDataTableProps,
  ComposedTableProps,
  FeatureProps,
  ToolbarSlots,
} from "./props";
export type {
  ReactMobileCardField,
  ReactMobileCardModel,
  ReactMobileCardRenderer,
} from "./rows/mobileCard";
export { type RowClickProps, rowClickProps } from "./rows/rowClickProps";
export type { RowPinningState, RowPinSide } from "./rows/rowPinning";
export { rowPinSignature } from "./rows/rowPinning";
export type { RowReorderHandler, RowReorderLabels } from "./rows/rowReorder";
export {
  REORDER_COLUMN_WIDTH,
  ROW_DND_MIME,
  rowReorderDropStyle,
  rowReorderSignature,
  type RowReorderState,
} from "./rows/rowReorder";
export {
  type RowMoveConfirmationProps,
  type RowMoveMenuItemProps,
  type RowMoveMenuSlotProps,
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
export type { RowExpansionState } from "./rows/useRowExpansion";
export type { SelectionState } from "./selection/useSelection";
export { offersAllMatching } from "./selection/useSelection";
export type { UseServerDataOptions } from "./source/useServerData";
export {
  type DataModeProps,
  type TableQueryHandler,
} from "./source/useTableData";
export type { Slot } from "./state/slots";
export { fillSlot } from "./state/slots";
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
export {
  type TreeToggleButtonProps,
  TreeToggleChrome,
  type TreeToggleChromeProps,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "./tree/TreeToggle";
export type { TreeExpansionState } from "./tree/useTreeExpansion";
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
export type {
  DataTableShellChromeProps,
  DataTableShellGroupingPanelProps,
  DataTableShellProps,
  DataTableShellResult,
  DataTableShellTableProps,
  DataTableShellToolbarProps,
} from "./useDataTableShell";
export { finishDataTableShell, useDataTableShell } from "./useDataTableShell";
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
export type { ChromeBodyData } from "./virtual/chromeBodyShared";
export { ColumnSpacer, type ColumnSpacerProps } from "./virtual/ColumnSpacer";
export {
  type ResizableVirtualizer,
  type RowPairMeasurer,
  useRowPairMeasurer,
} from "./virtual/measureRowPair";
export {
  type ColumnWindow,
  useColumnWindow,
  type UseColumnWindowOptions,
} from "./virtual/useColumnWindow";
export { usePlainChromeBodyData } from "./virtual/usePlainChromeBodyData";
export {
  useKeyedVirtualization,
  useTableVirtualization,
  type UseTableVirtualizationOptions,
} from "./virtual/useTableVirtualization";
export type { Command } from "@adapttable/core";
export type { ConfirmHandler } from "@adapttable/core";
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/core";
export type { AggregateName, Aggregator } from "@adapttable/core";
export type { ColumnGroupRecord, FlattenedColumns } from "@adapttable/core";
export type { WidthColumn } from "@adapttable/core";
export type { GroupedHeaderAlign } from "@adapttable/core";
export type {
  CustomCellEditorRender,
  EditableColumnLike,
} from "@adapttable/core";
export type { ExportWriter } from "@adapttable/core";
export type { FeatureHostState } from "@adapttable/core";
export type { FacetMap } from "@adapttable/core";
export type { FilterDef, FilterRuntime } from "@adapttable/core";
export type { FilterTypeRegistry, FilterTypeSpec } from "@adapttable/core";
export type { SelectionStats } from "@adapttable/core";
export type { GroupByInput } from "@adapttable/core";
export type { GroupAggregatesFn, GroupedFlatEntry } from "@adapttable/core";
export type { RowGroupLevel, RowGroupRef } from "@adapttable/core";
export type { AssemblyFns } from "@adapttable/core";
export type { PivotField, PivotZone } from "@adapttable/core";
export type { PivotConfig } from "@adapttable/core";
export type { GetCellSpan } from "@adapttable/core";
export type {
  TableExtraEntry as ExtraEntry,
  ExtraRowKind,
} from "@adapttable/core";
export type { MobileCardRenderer } from "@adapttable/core";
export type { PinnedRows, PinnedSummaryEntry } from "@adapttable/core";
export type { RowActionsLayout, RowActionsRenderer } from "@adapttable/core";
export type {
  RowDropPosition,
  RowGroupMoveHandler,
  RowMoveConfirmHandler,
  RowMoveMenuModel,
  RowMovePolicy,
  RowMoveRequest,
  RowMoveTarget,
  RowReorderOptions,
  RowTreeMoveHandler,
  RowTreeParentRef,
} from "@adapttable/core";
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "@adapttable/core";
export type { QuerySupport } from "@adapttable/core";
export type { TableSource } from "@adapttable/core";
export type { TableErrorState } from "@adapttable/core";
export type { FeatureNoticeAppearance } from "@adapttable/core";
export type { TreeEntry } from "@adapttable/core";
export type {
  BulkAction,
  BulkActionContext,
  Direction,
  RowAction,
  SortByOption,
  SortDirection,
  TableLabels,
} from "@adapttable/core";
export type { Props } from "@adapttable/core";
export { resolveDisabledReason } from "@adapttable/core";
export {
  resolveContextTarget,
  type ResolvedContextTarget,
  ROW_ID_ATTRIBUTE,
} from "@adapttable/core";
export {
  type ColumnMenuAction,
  type ColumnMenuActionContext,
  columnMenuActions,
  type ColumnMenuChoice,
  type ColumnMenuChoiceOption,
  type ColumnMenuChromeProps,
  type ColumnMenuItem,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  type ColumnMenuSlotProps,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core";
export { type ColumnResizeHandleProps } from "@adapttable/core";
export {
  columnFlexShares,
  columnSizeStyle,
  type ColumnSizingOptions,
  fittedTableStyle,
} from "@adapttable/core";
export {
  applyCollapsedColumnGroups,
  type ColumnGroupDef,
  type ColumnInput,
  flattenColumnTree,
} from "@adapttable/core";
export { pinnedColumnWidth } from "@adapttable/core";
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
} from "@adapttable/core";
export { DEFAULT_CARD_SIZE_PX } from "@adapttable/core";
export { exportButtonLabel } from "@adapttable/core";
export { bindFeatureHostFn } from "@adapttable/core";
export {
  type PaginationItem,
  paginationItems,
  type PaginationSlot,
  paginationSlots,
} from "@adapttable/core";
export { cellFlashAttr, rowFlashSignature } from "@adapttable/core";
export {
  type TableBodyCell as BodyCell,
  bodyCellsHaveRowSpan,
  buildBodyCells,
  cellsForRow,
  type CellSpanAppearance,
  cellSpanMark,
  rowSpanSignature,
} from "@adapttable/core";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraHostFillStyle,
  type ExtraRow,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
} from "@adapttable/core";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
} from "@adapttable/core";
export {
  isPinnedSummaryRowId,
  PINNED_SUMMARY_BOTTOM_PART,
  PINNED_SUMMARY_TOP_PART,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  pinnedSummarySideFromId,
} from "@adapttable/core";
export {
  resolveRowHeight,
  resolveRowStyle,
  type RowHeight,
  type RowStyle,
  rowStyleSignature,
} from "@adapttable/core";
export { deriveSortByOptions } from "@adapttable/core";
export { tableErrorState } from "@adapttable/core";
export { bindMobileCardList, mobileCardListStyle } from "@adapttable/core";
export {
  type KeyedVirtualization,
  resolveVirtualRows,
  rowSourceIndex,
  type TableVirtualization,
  virtualColumnSpan,
  type VirtualItemMeta,
  type VirtualTableRow,
  windowGroupedEntries,
} from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CommandPaletteOptions } from "./actions/useCommandPalette";
export type { ContextMenuOptions } from "./actions/useTableContextMenu";
export type { ColumnLayoutState } from "./columns/useColumnLayout";
export type { BatchRowEdit } from "./editing/batchEditing";
export type { DirtyCellState } from "./editing/dirtyCells";
export type {
  EditConflictChange,
  EditConflictHandler,
  EditConflictPolicy,
  EditConflictState,
} from "./editing/editConflict";
export type { EditEventHandler, EditLifecycle } from "./editing/editingEvents";
export type { RowEditDrafts } from "./editing/rowEditing";
export type { CellSaveState } from "./editing/saveState";
export type { CellEditingState } from "./editing/useCellEditing";
export type { EditValidationState, RowValidator } from "./editing/validation";
export type {
  ActiveFilterChip,
  ActiveFilterChipsSlotProps,
  ChipLabelResolver,
} from "./filters/useActiveFilterChips";
export type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDropProps,
} from "./grouping/GroupingPanelChrome";
export {
  type GroupingPanelAggregationItemProps,
  type GroupingPanelAggregationRemoveProps,
  type GroupingPanelChecklistOption,
  type GroupingPanelChecklistProps,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelOption,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelRestoreProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlotProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "./grouping/GroupingPanelChrome";
export type { SidePanelOptions } from "./props";
export type { RowMutationsState } from "./rows/rowMutations";
export type { RowPinState } from "./rows/rowPinning";
export type { HeaderSelectionState } from "./selection/useSelection";
export type { TableQuery } from "./source/useServerData";
export type { NestedTable } from "./tree/nestedTable";
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
export type { TableCommandOptions } from "@adapttable/core";
export type { ConfirmRequest } from "@adapttable/core";
export type { ContextMenuActions } from "@adapttable/core";
export type {
  CellEditor,
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
} from "@adapttable/core";
export type { ExportPayload, ExportWriteContext } from "@adapttable/core";
export type {
  ExportAllControls,
  ExportAllQuery,
  ExportAllResult,
  ExportContext,
  ExportCsvOptions,
} from "@adapttable/core";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FilterTypeExtend,
} from "@adapttable/core";
export type { FacetCounts } from "@adapttable/core";
export type { ColumnFilter, FilterOptionsSource } from "@adapttable/core";
export type {
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "@adapttable/core";
export type { CellEdit } from "@adapttable/core";
export type { CellRange } from "@adapttable/core";
export type { GridCell } from "@adapttable/core";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "@adapttable/core";
export type {
  GroupingDragSource,
  GroupingDragState,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "@adapttable/core";
export type { GroupNode, GroupSort } from "@adapttable/core";
export type { PaginationInfo } from "@adapttable/core";
export type { PivotMeasure } from "@adapttable/core";
export type { CellSpanRequest, GetCellSpanArgs } from "@adapttable/core";
export type { MobileCardModel } from "@adapttable/core";
export type { RowActionsRenderContext } from "@adapttable/core";
export type { QueryCondition, QueryFilterGroup } from "@adapttable/core";
export type { QueryGroupRow } from "@adapttable/core";
export type { TableStateMutators } from "@adapttable/core";
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
} from "@adapttable/core";

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
export type { EditableCellController } from "./editing/editableCellController";
export type {
  EditConflict,
  EditConflictChoice,
  ReconcileLiveBatchEdit,
  ReconcileLiveEdit,
  ReconcileLiveRowEdit,
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
export type { ChecklistValue } from "./filters/checklist";
export type { SavedViewMigration, SavedViewsStore } from "./url/useSavedViews";
export type {
  CellEditCommit,
  CellEditorOption,
  CellEditTarget,
} from "@adapttable/core";
export type { ExportTable } from "@adapttable/core";
export type {
  ExportColumnScope,
  ExportInfo,
  ExportRequest,
  ExportRowScope,
  FetchAllExport,
} from "@adapttable/core";
export type { FilterOption, FilterType } from "@adapttable/core";
export type { MobileCardField } from "@adapttable/core";
export type { SortLevel } from "@adapttable/core";
export type { QueryExtensions } from "@adapttable/core";
export type { ColumnHeaderController, FilterValue } from "@adapttable/core";

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
export type { ExportRowMeta } from "@adapttable/core";
export type { ExportQuery } from "@adapttable/core";
export type { QueryAggregate } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  TableAssistantBadgeProps,
  TableAssistantButtonProps,
  TableAssistantComposerProps,
  TableAssistantLanguageChipProps,
  TableAssistantPanelProps,
  TableAssistantSheetProps,
  TableAssistantSlots,
  TableAssistantSuggestionProps,
  TableAssistantWindowProps,
} from "./assistant/assistantSlots";
export {
  assistantIsUsable,
  type TableAssistantMessageView,
  type TableAssistantReceiptSubject,
  type TableAssistantReceiptView,
  type TableAssistantSuggestionView,
  type TableAssistantView,
} from "./assistant/assistantView";
export {
  assistantIsBusy,
  type TableAssistantBoundary,
  TableAssistantChrome,
  type TableAssistantChromeProps,
  type TableAssistantPresentation,
  type TableAssistantProps,
} from "./assistant/TableAssistantChrome";
export {
  type SpeechInputHandle,
  type UseSpeechInputOptions,
  useSpeechInput,
} from "./assistant/useSpeechInput";
export { editableCellController } from "./editing/editableCellController";
export type { ExportRowRole } from "@adapttable/core";
export type { AggregateFn } from "@adapttable/core";
export { normalizeEditorOptions } from "@adapttable/core";
