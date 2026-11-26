import {
  createAdapterEditingFamily,
  createAdapterEditingFeatures,
} from "@adapttable/react/adapter";

import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";
import { UndoRedoButtons } from "./components/toolbarExtras";

const editingFeatures = createAdapterEditingFeatures({
  EditableCell: EditableDataCell,
  RowEditActions,
  BatchEditBar,
  UndoRedoButtons,
  historyIncludesControls: true,
});

/** Edit a single cell in place with this kit's controls. @public */
export const editing = editingFeatures.editing;
/** Edit a whole row with this kit's controls. @public */
export const rowEditing = editingFeatures.rowEditing;
/** Mark unsaved rows and cells. @public */
export const dirtyIndicators = editingFeatures.dirtyIndicators;
/** Track edit history. @public */
export const editHistory = editingFeatures.editHistory;
/** Add undo and redo controls. @public */
export const undoRedoButtons = editingFeatures.undoRedoButtons;
/** Hold edits until the batch is saved or discarded. @public */
export const batchEditing = editingFeatures.batchEditing;

/**
 * All of editing — cell editing, dirty marks, edit history and undo
 * controls — with this kit's controls, passed to `features` as one entry.
 * Row and batch editing join beside it.
 *
 * @public
 */
export const editingFamily = /* @__PURE__ */ createAdapterEditingFamily({
  editing,
  dirtyIndicators,
  editHistory,
  undoRedoButtons,
});
