import {
  createAdapterEditingFeatures,
  type EditableCellRenderProps,
} from "@adapttable/react/adapter";

import { useClassNames } from "./components/classNamesContext";
import { EditableDataCell } from "./components/EditableCell";
import { BatchEditBar, RowEditActions } from "./components/kitControls";
import { UndoRedoButtons } from "./components/toolbarExtras";

function EditableSlot(props: Readonly<EditableCellRenderProps<never>>) {
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

const editingFeatures = createAdapterEditingFeatures({
  EditableCell: EditableSlot,
  RowEditActions,
  BatchEditBar,
  UndoRedoButtons,
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
