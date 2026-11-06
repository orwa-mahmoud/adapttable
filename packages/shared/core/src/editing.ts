/**
 * Cell and row editing — `@adapttable/core/editing`.
 *
 * The session, validation, history and the editors the bindings already
 * share. Every name here is also exported from `@adapttable/core`, from the
 * same source module.
 *
 * @packageDocumentation
 */
export {
  type BatchEditEntry,
  type BatchEditingState,
  batchEditingView,
  type BatchEditSnapshot,
  type BatchEditStore,
  type BatchEditStoreOptions,
  type BatchPendingDrafts,
  createBatchEditStore,
} from "./editing/batchEditing";
export {
  booleanDraft,
  type CellEditCommit,
  type CellEditor,
  type CellEditorOption,
  type CellEditTarget,
  type CustomCellEditorConflict,
  type CustomCellEditorCtrl,
  type CustomCellEditorRender,
  type EditableColumnLike,
  editorInputType,
  formatMultiDraft,
  hasEditableColumns,
  isBooleanEditor,
  isCellEditable,
  isCustomEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  MULTI_SEPARATOR,
  normalizeEditorOptions,
  parseCellEditValue,
  readMultiDraft,
  resolveCellEditor,
} from "./editing/cellEditing";
export {
  createDirtyCellStore,
  dirtyCellKey,
  type DirtyCellSnapshot,
  type DirtyCellState,
  type DirtyCellStore,
  type DirtyCellStoreOptions,
  dirtyCellView,
  dirtyMarkerView,
} from "./editing/dirtyCells";
export {
  beginCellEdit,
  type CellEditingState,
  cellEditingView,
  type CellSaveState,
  cellSaveView,
  type EditableCellController,
  editableCellController,
  type EditableCellMode,
  type EditConflictLabels,
  type EditingBundle,
  type EditValidationState,
  editValidationView,
  focusEditorOnMount,
  stopCellEditKeyboard,
} from "./editing/editableCell";
export type {
  EditCommitSnapshot,
  EditCommitValidationFailure,
  EditCommitValidationOptions,
} from "./editing/editCommitLifecycle";
export {
  contestedCellKey,
  type ContestedEditCell,
  contestedRowSignature,
  createEditConflictStore,
  type EditConflictSnapshot,
  type EditConflictState,
  type EditConflictStore,
  editConflictView,
  isCellInConflict,
  isRowContested,
  liveRowChanged,
  type ReconcileLiveBatchEdit,
  type ReconcileLiveEdit,
  type ReconcileLiveRowEdit,
  resolveConflictChoice,
} from "./editing/editConflict";
export type {
  BatchRowEdit,
  CellValidator,
  EditConflict,
  EditConflictChange,
  EditConflictChoice,
  EditConflictHandler,
  EditConflictPolicy,
  EditEvent,
  EditEventHandler,
  EditLifecycle,
  EditUnit,
  RowValidator,
  ValidationTarget,
} from "./editing/editContracts";
export {
  type CellEditHandler,
  createEditHistory,
  type EditHistoryController,
  type EditHistoryControllerOptions,
  type EditHistoryState,
  editHistoryView,
  recordingCellEdit,
  resolveEditHistory,
} from "./editing/editHistory";
export {
  asBatchGesture,
  asGesture,
  type CellEditKeyAction,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  type CellEditSession,
  type CellEditSessionOptions,
  type CellEditSnapshot,
  cellSaveFailure,
  cellSaveKey,
  cellSaveSignature,
  type CellSaveSnapshot,
  type CellSaveStatus,
  cellSaveStatus,
  type CellSaveStore,
  type CellSaveStoreOptions,
  cellsOfBatch,
  createCellEditSession,
  createCellSaveStore,
  createEditHistoryStack,
  createEditValidationStore,
  DEFAULT_EDIT_HISTORY_DEPTH,
  defaultSaveErrorMessage,
  type EditHistoryEntry,
  editHistoryEntry,
  type EditHistorySnapshot,
  type EditHistoryStack,
  type EditValidationSnapshot,
  type EditValidationStore,
  type EditValidationStoreOptions,
  type FailedCellSave,
  isCellEditActive,
  observeEdit,
  readCellValue,
  rowHasValidationError,
  type ValidationCheckResult,
  validationErrorFor,
  validationKey,
  validationSignature,
} from "./editing/editingController";
export {
  type BatchEditBarModel,
  batchEditBarModel,
  batchEditErrorId,
  type CellConflictAsk,
  cellConflictAsk,
  controllerConflictAsk,
  customEditorConflict,
  defaultPendingRows,
  editableCellErrorId,
  type EditableCellPresentation,
  editableCellPresentation,
  type EditingArming,
  type EditingArmingProps,
  type EditorAriaState,
  editorBusyProps,
  editorKeyRestoresFocus,
  editorSelectOptions,
  editorValidationProps,
  handleRowEditorKey,
  isEditActivateKey,
  isFirstEditableColumn,
  resolveEditableCellDisplay,
  resolveEditingArming,
  resolveRowEditTrigger,
  type RowEditActionsLayout,
  rowEditActionsLayout,
  type RowEditConflict,
  rowEditConflict,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
  rowEditErrorId,
  rowEditSaveBlocked,
  type RowEditTrigger,
  stopEditKeys,
} from "./editing/editingGate";
export {
  createRowEditStore,
  parseColumnDraft,
  type RowEditDrafts,
  type RowEditingState,
  rowEditingView,
  rowEditSignature,
  type RowEditSnapshot,
  type RowEditStore,
  type RowEditStoreOptions,
} from "./editing/rowEditing";

/**
 * Member types the signatures above hand back. Already public on
 * `@adapttable/core`.
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
} from "./aggregate/aggregate";
export type { DeclaredAggregates } from "./aggregate/aggregate";
export type {
  AggregationCandidate,
  AggregationItem,
  AggregationModel,
  AggregationOrigin,
} from "./aggregate/aggregationModel";
export type {
  ColumnAiOptions,
  ColumnGroupShow,
  ColumnMetadata,
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
  PinOffset,
  PinSide,
  UseColumnLayoutResult,
} from "./columns/columnLayoutModel";
export type {
  ColumnMenuAction,
  ColumnMenuActionContext,
  ColumnMenuChoice,
  ColumnMenuChoiceOption,
  ColumnMenuItem,
  ColumnMenuLabels,
  ColumnMenuRow,
  PinnedSide,
} from "./columns/columnMenuModel";
export type { DisplayValue } from "./display";
export type {
  TableCallbackRefresh,
  TableEngine,
  TableEngineConfigPatch,
  TableEngineReader,
  TableOperation,
  TableRevisionAxis,
  TableRevisions,
  TableRowScope,
  TableSnapshot,
} from "./engine/createTableEngine";
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
  FilterTypeSpec,
  FilterWidgetKind,
  FilterWidgetRenderProps,
} from "./filters/filterRegistry";
export type { CellEdit } from "./focus/cellEdits";
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
  GroupNode,
  GroupPaging,
  GroupSort,
} from "./grouping/groupRows";
export type { IncrementalViewConfig } from "./rows/incremental";
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
export type { TableStateMutators } from "./tableStateMutators";
export type { ResolvedPaginationMode } from "./types";
export type {
  ActionAiOptions,
  ActionApprovalPolicy,
  ActionConfirm,
  ApprovalPresentation,
  RowAction,
  TableLabels,
} from "./types";
