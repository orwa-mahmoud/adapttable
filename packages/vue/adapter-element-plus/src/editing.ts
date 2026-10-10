import type {
  CellEditHandler,
  StaticTableFeature,
  TableEditingOptions,
  TableFeature,
} from "@adapttable/vue";
import {
  batchEditBarSlotKey,
  editableCellSlotKey,
  extendFeature,
  rowEditActionsSlotKey,
  slotRender,
  UNDO_REDO_CONTROL,
} from "@adapttable/vue/adapter";
import {
  batchEditing as bindingBatchEditing,
  editing as bindingEditing,
  type EditingLifecycleExtras,
  rowEditing as bindingRowEditing,
  undoRedoButtons as bindingUndoRedoButtons,
} from "@adapttable/vue/features";
import { h } from "vue";

import { ElementEditableCell } from "./editing/ElementEditableCell";
import {
  ElementBatchEditBar,
  ElementRowEditActions,
} from "./editing/ElementEditingActions";
import { ElementHistoryButtons } from "./editing/ElementHistoryButtons";

function cellSlot<TRow>() {
  return slotRender(editableCellSlotKey<TRow>(), (props) =>
    h(ElementEditableCell<TRow>, { ...props })
  );
}

/** Element controls keep all validation, save and host-write transitions in the binding. */
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingEditing(onCellEdit, extras), [cellSlot<TRow>()]);
}

/** Edit a row as one gesture with explicit Element Plus Save and Cancel controls. */
export function rowEditing<TRow>(
  onRowEdit: NonNullable<TableEditingOptions<TRow>["onRowEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingRowEditing(onRowEdit, extras), [
    cellSlot<TRow>(),
    slotRender(rowEditActionsSlotKey<TRow>(), (props) =>
      h(ElementRowEditActions<TRow>, { ...props })
    ),
  ]);
}

/** Stage edits across rows; host writes happen only on the batch Save action. */
export function batchEditing<TRow>(
  onBatchEdit: NonNullable<TableEditingOptions<TRow>["onBatchEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingBatchEditing(onBatchEdit, extras), [
    cellSlot<TRow>(),
    slotRender(batchEditBarSlotKey<TRow>(), (props) =>
      h(ElementBatchEditBar<TRow>, { ...props })
    ),
  ]);
}

export { ElementEditableCell } from "./editing/ElementEditableCell";
export {
  ElementBatchEditBar,
  ElementRowEditActions,
} from "./editing/ElementEditingActions";
export type {
  BatchEditingState,
  BatchRowEdit,
  CellEditHandler,
  RowEditingState,
  TableEditingOptions,
} from "@adapttable/vue";
export type { RowEditIcons } from "@adapttable/vue/adapter";
export type { EditingLifecycleExtras } from "@adapttable/vue/features";
export { dirtyIndicators, editHistory } from "@adapttable/vue/features";

/** Opt-in Element Plus Undo and Redo buttons use the shell's history projection. */
export function undoRedoButtons(): StaticTableFeature {
  return extendFeature(bindingUndoRedoButtons(), [
    slotRender(UNDO_REDO_CONTROL, (props) =>
      h(ElementHistoryButtons, { ...props })
    ),
  ]);
}
