/**
 * The adapter machinery, framework-neutral — `@adapttable/core/binding`.
 *
 * Column-group, extra-row, pinned-row, row-span, row-style and column-menu
 * math that every kit's rendering shares. `@adapttable/react/adapter` re-exports
 * all of it beside the React-bound helpers, and is where an adapter imports
 * it from; this entry is the React-free half that binding is built on.
 *
 * @packageDocumentation
 */
export {
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export {
  applyCollapsedColumnGroups,
  flattenColumnTree,
} from "./columns/columnTree";
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
export {
  drawnSlotFills,
  type FeatureRender,
  type FeatureSlotKey,
  featureSlotKey,
  type FeatureStateKey,
  featureStateKey,
  type OrderedContribution,
  orderedContributions,
  type SlotFill,
  slotFillsOf,
  slotRender,
} from "./features/featureKeys";
export {
  createFeatureHost,
  disposeFeatureHost,
  EMPTY_FEATURE_HOST,
  type FeatureSetup,
  LiveFeatureHost,
} from "./features/liveFeatureHost";
export { deriveRuntimeOperations } from "./features/runtimeOperations";
export {
  ACTIVE_FILTER_CHIPS,
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  type ColumnHeaderRenameSlotProps,
  EXPAND_TOGGLE,
  type ExpandToggleSlotProps,
  FILTER_DRAWER,
  FILTER_POPOVER,
  type FilterOverlaySlotProps,
  ROW_REORDER_ANNOUNCER,
} from "./features/slotContract";
export type { TableRuntime, TableRuntimeView } from "./features/tableRuntime";
export type {
  ActiveFilterChip,
  ActiveFilterChipsSlotProps,
} from "./filters/activeFilterChips";
export {
  cellAttributes,
  type ChromeBodySlot,
  type ChromeCellSizing,
  type ChromeColumnPlan,
  chromeColumnPlan,
  type ChromeExtraSlot,
  type ChromeGroupEntry,
  type ChromeGroupSlot,
  type ChromeRowSlot,
  type ChromeSortState,
  type ChromeVirtualPadSlot,
  columnAriaSort,
  columnTextAlign,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_RESIZE_HANDLE_STYLE,
  DESKTOP_SELECTION_WIDTH,
  type DesktopBodyPinStyle,
  desktopBodyPinStyle,
  desktopChromeMetrics,
  type DesktopChromeWidths,
  desktopDetailMeasureRef,
  desktopEdgeHeadPin,
  desktopHasPinned,
  type DesktopHeadCellGeometry,
  desktopHeadCellGeometry,
  desktopPinSignature,
  desktopRowMeasureRef,
  type DesktopScrollBoxStyle,
  desktopScrollBoxStyle,
  documentOffsetTop,
  entryKeys,
  extraRowCoveredSlots,
  headerCellAttributes,
  headerRowAttributes,
  measureRowDetailAsPair,
  measureWindowScrollMargin,
  pinnedRowIds,
  rowAttributes,
  type RowPairMeasurer,
  searchInputAttributes,
  sortButtonAttributes,
  sortIndexOf,
  sortLevelOf,
  sourceWindowStart,
  tableAttributes,
  virtualListElement,
} from "./layout/chromeModel";
export {
  bodyCellsHaveRowSpan,
  cellsForRow,
  extraHostFillStyle,
  isExtraEntry,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
  resolveRowStyle,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "./layout/leanAssembly";
export { type BodyCell, cellSpanMark } from "./rows/cellSpan";
export {
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraCountBeforeRowIds,
  extraCoveredTableSlots,
  extraRowsForSection,
  extraUncoveredColSpans,
  inflateBodyCellRowSpans,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "./rows/extraRows";
export {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowStickyStyle,
} from "./rows/pinnedRowChrome";
export { resolveRowHeight } from "./rows/rowPresentation";
export { rowSourceIndex } from "./virtual/virtualTableModel";

/**
 * The member types the signatures above hand back, so a consumer of this
 * entry can name every part of what it returns.
 */
export type { Command } from "./actions/commandRegistry";
export type {
  ContextMenuItem,
  ContextMenuTarget,
} from "./actions/contextMenuModel";
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  CustomAggregateOperation,
  ResolvedAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateFormatContext,
  AggregateName,
  AggregateOperationId,
  AggregateOptions,
  AggregateOrderedValue,
  AggregateSpec,
  Aggregator,
  DeclaredAggregates,
} from "./aggregate/aggregate";
export type {
  AggregationCandidate,
  AggregationItem,
  AggregationModel,
  AggregationOrigin,
} from "./aggregate/aggregationModel";
export type {
  ColumnAiOptions,
  ColumnGroupShow,
  ColumnModel,
  ColumnModelEditor,
  ColumnModelFilter,
  ExtraFilters,
  FilterValue,
  SortableValue,
  SortDirection,
} from "./columnModel";
export type {
  ColumnLayoutState,
  PinLeads,
  PinnedCellStyle,
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuChromeProps,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
  ColumnMenuSlotProps,
  PinnedSide,
} from "./columns/columnMenuModel";
export type {
  ColumnGroupDef,
  ColumnGroupRecord,
  ColumnInput,
  FlattenedColumns,
} from "./columns/columnTree";
export type { GroupedHeaderAlign } from "./columns/headerGroups";
export type { DisplayValue } from "./display";
export type {
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
  CustomCellEditorRender,
} from "./editing/cellEditing";
export type {
  TableEngine,
  TableEngineConfigPatch,
  TableEngineReader,
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
  TableSnapshot,
} from "./engine/createTableEngine";
export type { NeutralTable } from "./engine/neutralTable";
export type {
  ExportPayload,
  ExportRowMeta,
  ExportRowRole,
  ExportTable,
  ExportWriteContext,
  ExportWriter,
} from "./export/exportWriter";
export type {
  ColumnMenuActionFactory,
  ContextMenuItemsFactory,
  FeatureHostState,
  FilterTypeExtend,
  SidePanelEntry,
} from "./features/currentHost";
export type { ChecklistValue } from "./filters/checklistValues";
export type { FacetCounts, FacetMap } from "./filters/facets";
export {
  type ChipLabelResolver,
  FILTER_TYPES,
  type FilterAiOptions,
  type FilterDef,
  type FilterOption,
  type FilterOptionsSource,
  type FilterType,
} from "./filters/filterDefs";
export type { FilterFormSource } from "./filters/filterFormModel";
export type {
  FilterTypeRegistry,
  FilterTypeSpec,
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type {
  GroupAggregateOverride,
  GroupAggregateOverrides,
} from "./grouping/groupAggregateOverrides";
export type {
  GroupingChipKeyboardProps,
  GroupingDragProps,
  GroupingDragSource,
  GroupingDragState,
  GroupingDropProps,
  GroupingPanelInteractions,
  GroupingPanelState,
} from "./grouping/groupingPanelModel";
export type { GroupAggregateOps } from "./grouping/groupRowLayout";
export type {
  GroupAggregatesFn,
  GroupedFlatEntry,
  GroupNode,
  GroupPaging,
  GroupSort,
  RowGroupLevel,
  RowGroupRef,
} from "./grouping/groupRows";
export type { ExtraEntry, ExtraRow, ExtraRowKind } from "./rows/extraRows";
export type { IncrementalViewConfig } from "./rows/incremental";
export type { RowPinLookup, RowPinSide } from "./rows/rowPinModel";
export { ROW_DND_MIME } from "./rows/rowReorderEngine";
export type { RowReorderDigest } from "./rows/rowReorderModel";
export type { RowHeight, RowStyle } from "./rows/rowStyle";
export type { SortLevel } from "./sort/compare";
export type {
  ExportScopeCapability,
  GroupingCapability,
  TableSourceCapabilities,
  TotalCountCapability,
} from "./source/capabilities";
export type {
  AggregateFn,
  QueryAggregate,
  QueryCondition,
  QueryFilterGroup,
} from "./source/queryContract";
export type { QueryGroupRow } from "./source/queryGroups";
export type { TableSource } from "./source/TableSource";
export type { CssProperties } from "./style/cssProperties";
export type { TableStateMutators } from "./tableStateMutators";
export type {
  ActionAiOptions,
  ActionApprovalPolicy,
  ActionConfirm,
  ApprovalPresentation,
  BulkAction,
  BulkActionContext,
  ColumnMetadata,
  Direction,
  ResolvedPaginationMode,
  RowAction,
  TableLabels,
} from "./types";
export type {
  VirtualItemMeta,
  VirtualTableRow,
} from "./virtual/virtualTableModel";
