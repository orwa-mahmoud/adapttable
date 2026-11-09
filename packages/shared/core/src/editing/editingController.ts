/**
 * Compatible composition of the editing session, its validation, and history.
 *
 * The stores live with the concern they own. This module keeps the public
 * names on the import path they already had.
 */
export {
  asBatchGesture,
  asGesture,
  cellsOfBatch,
  createEditHistoryStack,
  DEFAULT_EDIT_HISTORY_DEPTH,
  type EditHistoryEntry,
  editHistoryEntry,
  type EditHistorySnapshot,
  type EditHistoryStack,
  readCellValue,
} from "./editHistory";
export {
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
  createCellEditSession,
  createCellSaveStore,
  defaultSaveErrorMessage,
  type FailedCellSave,
  isCellEditActive,
  observeEdit,
} from "./editSession";
export {
  createEditValidationStore,
  type EditValidationSnapshot,
  type EditValidationStore,
  type EditValidationStoreOptions,
  rowHasValidationError,
  type ValidationCheckResult,
  validationErrorFor,
  validationKey,
  validationSignature,
} from "./editValidation";
