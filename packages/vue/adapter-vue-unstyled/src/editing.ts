import {
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/vue/adapter";
import {
  batchEditBarSlotKey,
  batchEditing as bindingBatchEditing,
  type CellEditHandler,
  editableCellSlotKey,
  editing as bindingEditing,
  type EditingLifecycleExtras,
  rowEditActionsSlotKey,
  rowEditing as bindingRowEditing,
  type TableEditingOptions,
  undoRedoButtons as bindingUndoRedoButtons,
} from "@adapttable/vue/editing";
import { h } from "vue";

import { NativeEditableCell } from "./editing/NativeEditableCell";
import {
  NativeBatchEditBar,
  NativeRowEditActions,
} from "./editing/NativeEditingActions";
import { NativeHistoryButtons } from "./editing/NativeHistoryButtons";

function cellSlot<TRow>() {
  return slotRender(editableCellSlotKey<TRow>(), (props) =>
    h(NativeEditableCell<TRow>, { ...props })
  );
}

/** Native controls keep all validation, save and host-write transitions in the binding. */
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
) {
  return extendFeature(bindingEditing(onCellEdit, extras), [cellSlot<TRow>()]);
}

/** Edit a row as one gesture with explicit native Save and Cancel controls. */
export function rowEditing<TRow>(
  onRowEdit: NonNullable<TableEditingOptions<TRow>["onRowEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
) {
  return extendFeature(bindingRowEditing(onRowEdit, extras), [
    cellSlot<TRow>(),
    slotRender(rowEditActionsSlotKey<TRow>(), (props) =>
      h(NativeRowEditActions<TRow>, { ...props })
    ),
  ]);
}

/** Stage edits across rows; host writes happen only on the batch Save action. */
export function batchEditing<TRow>(
  onBatchEdit: NonNullable<TableEditingOptions<TRow>["onBatchEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
) {
  return extendFeature(bindingBatchEditing(onBatchEdit, extras), [
    cellSlot<TRow>(),
    slotRender(batchEditBarSlotKey<TRow>(), (props) =>
      h(NativeBatchEditBar<TRow>, { ...props })
    ),
  ]);
}

export { NativeEditableCell } from "./editing/NativeEditableCell";
export {
  NativeBatchEditBar,
  NativeRowEditActions,
} from "./editing/NativeEditingActions";
export type {
  BatchEditingState,
  BatchRowEdit,
  CellEditHandler,
  EditingLifecycleExtras,
  RowEditIcons,
  RowEditingState,
  TableEditingOptions,
} from "@adapttable/vue/editing";
export { dirtyIndicators, editHistory } from "@adapttable/vue/editing";

/** Opt-in native Undo and Redo buttons use the shell's history projection. */
export function undoRedoButtons() {
  return extendFeature(bindingUndoRedoButtons(), [
    slotRender(TOOLBAR_EXTRAS, (props) =>
      h(NativeHistoryButtons, { ...props })
    ),
  ]);
}
