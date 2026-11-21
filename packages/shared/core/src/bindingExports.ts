/**
 * Extra public names the framework bindings import. Kept as a dedicated
 * barrel so the main entry stays grouped by concern. The names are
 * framework-neutral; each binding re-exports what its adapters need.
 */

export { contextMenuItems } from "./actions/contextMenuModel";
export type { ResolvedContextTarget } from "./actions/contextMenuRegion";
export { resolveContextTarget } from "./actions/contextMenuRegion";
export type {
  ColumnLayoutState,
  PinLeads,
  PinnedCellStyle,
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columns/columnLayoutModel";
export {
  edgePinStyle,
  PIN_Z,
  pinnedCellStyle,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuChromeProps,
  ColumnMenuSlotProps,
} from "./columns/columnMenuModel";
export { REORDER_COLUMN_KEY } from "./columns/columnMenuModel";
export { resolveCommitValue } from "./editing/cellEditing";
export type { FeatureHostState } from "./features/currentHost";
export { bindFeatureHostFn } from "./features/currentHost";
export type { FilterEngine } from "./filters/filterEngine";
export type { DateOp, NumberOp, TextOp } from "./filters/operators";
export {
  type BinaryOp,
  deserializeFormulaColumns,
  type FormulaColumnSpec,
  type FormulaColumnsResult,
  type FormulaErrorCode,
  type FormulaNode,
  type FormulaScope,
  type FormulaValue,
  type ParseResult,
  serializeFormulaColumns,
} from "./formula";
export { filterDefForColumn, rowIsDirty } from "./layout/leanAssembly";
export type {
  PaginationItem,
  PaginationSlot,
} from "./pagination/paginationMath";
export { paginationSlots } from "./pagination/paginationMath";
export {
  deserializePivot,
  deserializePivotState,
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
  serializePivot,
  serializePivotState,
  type ServerPivotOptions,
} from "./pivot";
export { partitionPinnedRows } from "./rows/rowPresentation";
export { isDeclarativeFilters } from "./source/isDeclarativeFilters";
export type { TableQuery } from "./source/tableQuery";
export type { FeatureNotice, FeatureNoticeKind } from "./state/featureNotices";
export {
  type OpenRowPatchStreamOptions,
  type RowPatchStreamHandle,
  type RowPatchStreamReconnect,
  type RowPatchStreamStatus,
  type StreamSocket,
  type StreamSocketEvent,
} from "./stream";
export {
  FILTER_PREFIX,
  isEmptyFilterValue,
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
export { devWarn } from "./utils/devWarn";
export { type ElementRef } from "./virtual/mobileCardList";
export type { RowPairMeasurer } from "./virtual/rowPairModel";
export type { KeyedVirtualization } from "./virtual/virtualTableModel";
export { virtualItemMeta } from "./virtual/virtualTableModel";

/**
 * Member types the exported signatures above hand back. A consumer that can
 * call the function can now name every part of what it returns.
 */
export type { ContextMenuModelOptions } from "./actions/contextMenuModel";
export type { ColumnModelEditor, ColumnModelFilter } from "./columnModel";
export type { SidePanelEntry } from "./features/currentHost";
export type { EditableCellEditing } from "./rows/rowEditingDigest";
export type { RowPinSide, RowPinState } from "./rows/rowPinModel";
export type { HeaderSelectionState } from "./selection/selectionState";
