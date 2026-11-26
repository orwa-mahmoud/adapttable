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

import NuxtBatchEditBar from "./editing/NuxtBatchEditBar.vue";
import NuxtEditableCell from "./editing/NuxtEditableCell.vue";
import { NuxtHistoryButtons } from "./editing/NuxtHistoryButtons";
import NuxtRowEditActions from "./editing/NuxtRowEditActions.vue";
function cellSlot<TRow>() {
  return slotRender(editableCellSlotKey<TRow>(), (props) =>
    h(NuxtEditableCell<TRow>, { ...props })
  );
}
/** Nuxt editors keep draft, validation and host writes in the shared binding. */
export function editing<TRow>(
  onCellEdit: CellEditHandler<TRow>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingEditing(onCellEdit, extras), [cellSlot<TRow>()]);
}
export function rowEditing<TRow>(
  onRowEdit: NonNullable<TableEditingOptions<TRow>["onRowEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingRowEditing(onRowEdit, extras), [
    cellSlot<TRow>(),
    slotRender(rowEditActionsSlotKey<TRow>(), (props) =>
      h(NuxtRowEditActions<TRow>, { ...props })
    ),
  ]);
}
export function batchEditing<TRow>(
  onBatchEdit: NonNullable<TableEditingOptions<TRow>["onBatchEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  return extendFeature(bindingBatchEditing(onBatchEdit, extras), [
    cellSlot<TRow>(),
    slotRender(batchEditBarSlotKey<TRow>(), (props) =>
      h(NuxtBatchEditBar<TRow>, { ...props })
    ),
  ]);
}
export function undoRedoButtons(): StaticTableFeature {
  return extendFeature(bindingUndoRedoButtons(), [
    slotRender(UNDO_REDO_CONTROL, (props) =>
      h(NuxtHistoryButtons, { ...props })
    ),
  ]);
}
export { default as NuxtBatchEditBar } from "./editing/NuxtBatchEditBar.vue";
export { default as NuxtEditableCell } from "./editing/NuxtEditableCell.vue";
export { default as NuxtRowEditActions } from "./editing/NuxtRowEditActions.vue";
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
