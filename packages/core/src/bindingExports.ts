/**
 * Extra public names the React binding imports. Kept as a dedicated
 * barrel so the main entry stays grouped by concern.
 */

export { resolveDisabledReason } from "./actions/confirm";
export { contextMenuItems } from "./actions/contextMenuModel";
export type { ResolvedContextTarget } from "./actions/contextMenuRegion";
export {
  ROW_ID_ATTRIBUTE,
  resolveContextTarget,
} from "./actions/contextMenuRegion";
export type {
  UseColumnLayoutResult,
  ColumnLayoutState,
  PinSide,
  PinOffset,
  PinnedCellStyle,
  PinLeads,
} from "./columns/columnLayoutModel";
export {
  EMPTY_COLUMN_LAYOUT,
  applyColumnOrder,
  PIN_Z,
  edgePinStyle,
  pinnedCellStyle,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuChromeProps,
  ColumnMenuSlotProps,
} from "./columns/columnMenuModel";
export {
  REORDER_COLUMN_KEY,
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "./columns/columnMenuModel";
export { applyColumnNames, declaredColumnName } from "./columns/columnNames";
export { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "./columns/columnResize";
export type { ColumnSizingOptions } from "./columns/columnSizing";
export {
  columnFlexShares,
  columnSizeStyle,
  fittedTableStyle,
} from "./columns/columnSizing";
export {
  applyCollapsedColumnGroups,
  flattenColumnTree,
} from "./columns/columnTree";
export { FALLBACK_PIN_WIDTH, pinnedColumnWidth } from "./columns/columnWidths";
export { declaredColumnLayout } from "./columns/declaredColumnLayout";
export type {
  HeaderGroupCell,
  HtmlGroupedHeaderCell,
} from "./columns/headerGroups";
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
  headerGroupRow,
  headerGroupRows,
  htmlGroupedHeaderPlan,
  isColumnGroupRenderKey,
  isColumnGroupStubKey,
  isColumnGroupSummaryKey,
  toggleCollapsedColumnGroup,
} from "./columns/headerGroups";
export { responsiveColumns } from "./columns/responsiveColumns";
export {
  DEFAULT_CARD_SIZE_PX,
  DEFAULT_ROW_SIZE_PX,
  MOBILE_BREAKPOINT_PX,
  VIRTUAL_OVERSCAN,
} from "./constants";
export {
  readEditableCellValue,
  resolveCommitValue,
  stepEditableCell,
} from "./editing/cellEditing";
export { exportButtonLabel } from "./export/exportLabel";
export { columnLetter, safeSheetName } from "./export/xlsx";
export {
  appendByKey,
  applyFilterExtends,
  bindFeatureHostFn,
  currentFeatureHost,
  runWithFeatureHost,
} from "./features/currentHost";
export type { FeatureHostState } from "./features/currentHost";
export type { FilterEngine } from "./filters/filterEngine";
export { FILTER_ENGINE_IMPL } from "./filters/filterEngine";
export type { DateOp, NumberOp, TextOp } from "./filters/operators";
export { withFilterType } from "./filters/filterRegistry";
export {
  type BinaryOp,
  FORMULA_BLANK,
  FORMULA_ERRORS,
  FORMULA_FUNCTIONS,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
  type FormulaErrorCode,
  type FormulaNode,
  type FormulaScope,
  type FormulaValue,
  type ParseResult,
  buildFormulaColumns,
  deserializeFormulaColumns,
  evaluateFormula,
  formulaBoolean,
  formulaDisplay,
  formulaError,
  formulaNumber,
  formulaRefs,
  formulaSortValue,
  formulaText,
  isFormulaError,
  parseFormula,
  serializeFormulaColumns,
  toFormulaValue,
} from "./formula";
export { applyGroupLeafSelection } from "./grouping/groupSelection";
export {
  GROUPING_COLUMN_DND_MIME,
  groupingDragKey,
  hasGroupingColumnDrag,
  moveGroupingKey,
  moveGroupingKeyBy,
  removeGroupingKey,
} from "./grouping/groupingPanelModel";
export {
  groupedEntriesForStrategy,
  groupingComputationKind,
} from "./grouping/groupingStrategy";
export type { AssemblyFns } from "./layout/leanAssembly";
export {
  REORDER_COLUMN_WIDTH,
  bodyCellsHaveRowSpan,
  cellsForRow,
  columnSelectLabel,
  extraHostFillStyle,
  filterDefForColumn,
  isExtraEntry,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  resolveAssembly,
  resolveRowStyle,
  rowEditingSignature,
  rowFlashSignature,
  rowIsDirty,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "./layout/leanAssembly";
export { isRtlElement } from "./layout/writingDirection";
export type {
  PaginationItem,
  PaginationSlot,
} from "./pagination/paginationMath";
export { paginationItems, paginationSlots } from "./pagination/paginationMath";
export {
  EMPTY_PIVOT_CONFIG,
  PIVOT_BLANK,
  PIVOT_GRAND_TOTAL_KEY,
  PIVOT_ZONES,
  type PivotColumnLeaf,
  type PivotColumnNode,
  type PivotConfig,
  type PivotField,
  type PivotMeasure,
  type PivotOptions,
  type PivotResult,
  type PivotRow,
  type PivotRowKind,
  type PivotUrlState,
  type PivotZone,
  type QueryPivotPage,
  type QueryPivotRow,
  type ServerPivotOptions,
  assignField,
  availableFields,
  deserializePivot,
  deserializePivotState,
  isPivotReady,
  measureLabel,
  moveField,
  pivot,
  removeField,
  serializePivot,
  serializePivotState,
  serverPivotResult,
  setMeasureAgg,
} from "./pivot";
export { cellFlashAttr } from "./rows/cellFlashPaint";
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
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  orderedCardEntries,
  pinnedRowStickyStyle,
} from "./rows/pinnedRowChrome";
export type { RowClickProps } from "./rows/rowClickProps";
export { rowClickProps } from "./rows/rowClickProps";
export { partitionPinnedRows, resolveRowHeight } from "./rows/rowPresentation";
export { deriveSortByOptions } from "./sort/sortByOptions";
export type { TableQuery } from "./source/tableQuery";
export { isDeclarativeFilters } from "./source/isDeclarativeFilters";
export { applyQuerySupport } from "./source/queryContract";
export { fillSlot, tableErrorState } from "./state/errorState";
export type { FeatureNotice, FeatureNoticeKind } from "./state/featureNotices";
export { collectFeatureNotices } from "./state/featureNotices";
export {
  type OpenRowPatchStreamOptions,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type RowPatchStreamStatus,
  type StreamSocket,
  type StreamSocketEvent,
  isStreamLive,
  isStreamSettled,
  openRowPatchStream,
  parseRowPatchFrame,
} from "./stream";
export { FakeSocket } from "./stream/fakes";
export {
  FILTER_PREFIX,
  MAX_LIMIT,
  PARAM_COL_HIDDEN,
  PARAM_DENSITY,
  PARAM_FIND,
  PARAM_FORMULA,
  PARAM_GROUP_AGGREGATES,
  PARAM_GROUP_BY,
  PARAM_GROUP_CLOSED,
  PARAM_LIMIT,
  PARAM_PAGE,
  PARAM_PIVOT,
  PARAM_SEARCH,
  PARAM_SORT_BY,
  PARAM_SORT_DIR,
  isEmptyFilterValue,
  readCollapsedGroups,
  readColumnLayout,
  readExtra,
  readFilterTreeParam,
  readLimit,
  readPage,
  readRowPins,
  readSortDir,
  readSortLevels,
  writeCollapsedGroups,
  writeColumnLayout,
  writeExtra,
  writeFilterTreeParam,
  writeRowPins,
  writeSortLevels,
} from "./url/serialize";
export {
  applyTableUrlState,
  captureTableUrlState,
  parseTableUrlState,
  updateTableUrlState,
} from "./url/urlStateCodec";
export { devWarn, resetDevWarnings } from "./utils/devWarn";
export { safeLocalStorage } from "./utils/env";
export {
  bindMobileCardList,
  mobileCardListStyle,
} from "./virtual/mobileCardList";
export type { KeyedVirtualization } from "./virtual/virtualTableModel";
export {
  resolveVirtualRows,
  rowSourceIndex,
  virtualColumnSpan,
} from "./virtual/virtualTableModel";
export { buildTableXlsx, xlsxWriter } from "./xlsx";
