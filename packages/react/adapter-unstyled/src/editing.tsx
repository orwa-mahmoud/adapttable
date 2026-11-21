import type { StaticTableFeature } from "@adapttable/react";
import {
  createAdapterBatchEditing,
  createAdapterEditHistory,
  createAdapterEditing,
  createAdapterEditingFamily,
  createAdapterRowEditing,
  createAdapterUndoRedoButtons,
  type EditableCellRenderProps,
} from "@adapttable/react/adapter";
import { dirtyIndicators as bindingDirtyIndicators } from "@adapttable/react/features";

import { useClassNames } from "./components/classNamesContext";
import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";
import { UndoRedoButtons } from "./components/toolbarExtras";

function EditableSlot(props: Readonly<EditableCellRenderProps<unknown>>) {
  const classNames = useClassNames();
  return (
    <EditableDataCell
      {...props}
      activateClassName={classNames.editCellActivate}
      errorClassName={classNames.editCellError}
      saveErrorClassName={classNames.editCellSaveError}
      rollbackClassName={classNames.editCellRollback}
      editorClassName={classNames.editCellEditor}
    />
  );
}

// Each feature is built on its own, so a table keeps only the ones it names.

/** Edit a single cell in place with this kit's controls. @public */
export const editing = createAdapterEditing(EditableSlot);
/** Edit a whole row with this kit's controls. @public */
export const rowEditing = createAdapterRowEditing(EditableSlot, RowEditActions);
/** Mark unsaved rows and cells. @public */
export const dirtyIndicators: () => StaticTableFeature = bindingDirtyIndicators;
/** Track edit history. @public */
export const editHistory = createAdapterEditHistory();
/** Add undo and redo controls. @public */
export const undoRedoButtons = createAdapterUndoRedoButtons(UndoRedoButtons);
/** Hold edits until the batch is saved or discarded. @public */
export const batchEditing = createAdapterBatchEditing(
  EditableSlot,
  BatchEditBar
);

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
