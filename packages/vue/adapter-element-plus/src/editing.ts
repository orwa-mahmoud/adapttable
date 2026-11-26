import {
  type CellEditHandler,
  type StaticTableFeature,
  type TableEditingOptions,
  type TableFeature,
} from "@adapttable/vue";
import {
  batchEditBarSlotKey,
  editableCellSlotKey,
  editingFamilyList,
  extendFeature,
  rowEditActionsSlotKey,
  slotRender,
  UNDO_REDO_CONTROL,
} from "@adapttable/vue/adapter";
import {
  batchEditing as bindingBatchEditing,
  dirtyIndicators,
  editHistory,
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
export { dirtyIndicators, editHistory };

/** Opt-in Element Plus Undo and Redo buttons use the shell's history projection. */
export function undoRedoButtons(): StaticTableFeature {
  return extendFeature(bindingUndoRedoButtons(), [
    slotRender(UNDO_REDO_CONTROL, (props) =>
      h(ElementHistoryButtons, { ...props })
    ),
  ]);
}

/**
 * All of editing — cell editing, dirty marks, edit history and undo
 * controls — with this kit's controls, passed to `features` as one entry.
 * Row and batch editing join beside it.
 *
 * @public
 */
export function editingFamily<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras?: EditingLifecycleExtras<TRow>
): readonly TableFeature<TRow>[] {
  return editingFamilyList<
    TableFeature<TRow>,
    CellEditHandler<TRow>,
    EditingLifecycleExtras<TRow> | undefined
  >(
    {
      editing: (save, more) => editing(save, more),
      dirtyIndicators,
      editHistory: () => editHistory(),
      undoRedoButtons,
    },
    onCellEdit,
    extras
  );
}
