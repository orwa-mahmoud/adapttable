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
  HistoryButtonsChrome,
  rowEditActionsSlotKey,
  slotRender,
  UNDO_REDO_CONTROL,
} from "@adapttable/vue/adapter";
import {
  batchEditing as bindingBatchEditing,
  editing as bindingEditing,
  type EditingLifecycleExtras,
  rowEditing as bindingRowEditing,
  undoRedoButtons as bindingUndoRedo,
} from "@adapttable/vue/features";
import { h } from "vue";

import { rekaButton } from "./controls/basic";
import BatchEditBar from "./editing/BatchEditBar.vue";
import EditableCell from "./editing/EditableCell.vue";
import RowEditActions from "./editing/RowEditActions.vue";

const cell = <TRow>() =>
  slotRender(editableCellSlotKey<TRow>(), (props) =>
    h(EditableCell<TRow>, props)
  );
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingEditing(onCellEdit, extras), [cell<TRow>()]);
}
export function rowEditing<TRow>(
  onRowEdit: NonNullable<TableEditingOptions<TRow>["onRowEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingRowEditing(onRowEdit, extras), [
    cell<TRow>(),
    slotRender(rowEditActionsSlotKey<TRow>(), (props) =>
      h(RowEditActions<TRow>, props)
    ),
  ]);
}
export function batchEditing<TRow>(
  onBatchEdit: NonNullable<TableEditingOptions<TRow>["onBatchEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingBatchEditing(onBatchEdit, extras), [
    cell<TRow>(),
    slotRender(batchEditBarSlotKey<TRow>(), (props) =>
      h(BatchEditBar<TRow>, props)
    ),
  ]);
}
export function undoRedoButtons(): StaticTableFeature {
  return extendFeature(bindingUndoRedo(), [
    slotRender(UNDO_REDO_CONTROL, (props) =>
      HistoryButtonsChrome({
        ...props,
        slots: { Button: ({ attrs, label }) => rekaButton(attrs, label) },
      })
    ),
  ]);
}
export { default as BatchEditBar } from "./editing/BatchEditBar.vue";
export { default as EditableCell } from "./editing/EditableCell.vue";
export { default as RowEditActions } from "./editing/RowEditActions.vue";
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
