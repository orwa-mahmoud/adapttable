import { resolveRowEditTrigger, rowEditConflict } from "@adapttable/core";
import {
  BATCH_EDIT_BAR,
  coreBatchEditing,
  coreDirtyIndicators,
  coreEditHistory,
  coreEditing,
  coreRowEditing,
  coreUndoRedoButtons,
  EDITABLE_CELL,
  ROW_EDIT_ACTIONS,
  type RowEditIcons,
} from "@adapttable/core/binding";
import { computed, watch } from "vue";

import { UNDO_REDO_CONTROL } from "./actions/contracts";
import {
  type TableEditingOptions,
  useTableEditing,
} from "./editing/editingModels";
import type {
  FeatureMountContext,
  StaticTableFeature,
  TableFeature,
} from "./features/tableFeature";
import {
  editHistoryModelKey,
  type EditingChromeModel,
  editingChromeModelKey,
  editingModelKey,
} from "./layout/modelChannels";
export type EditingLifecycleExtras<TRow> = Omit<
  TableEditingOptions<TRow>,
  | "rows"
  | "columns"
  | "rowKey"
  | "onCellEdit"
  | "onRowEdit"
  | "onBatchEdit"
  | "rowEditing"
  | "batchEditing"
> & { readonly rowEditIcons?: RowEditIcons };
/** One stable model factory shared by all three independently named editing features. */
function mountEditing<TRow>(context: FeatureMountContext<TRow>): void {
  // Editing only consumes the row-free editor registry; keep its projection stable.
  const editorHost = computed(() => ({
    ...context.featureHost.value,
    columnMenuActions: [],
    contextMenuItems: [],
  }));
  const model = useTableEditing(
    () => {
      const options = context.options.value;
      const labels = context.table.labels.value;
      return {
        ...options,
        rows:
          context.rowInventory?.value.loadedRows ?? context.table.rows.value,
        columns: context.table.allColumns.value,
        rowKey: context.table.rowKey,
        featureHost: editorHost.value,
        conflictLabels: {
          message: labels.editConflict,
          keepMine: labels.keepMine,
          takeTheirs: labels.takeTheirs,
          theirsValue: labels.theirsValue,
        },
      };
    },
    { active: context.active }
  );
  const chrome = computed<EditingChromeModel<TRow>>(() => {
    const bundle = model.bundle.value;
    const rowEditing = bundle.rowEditing;
    return {
      row: rowEditing
        ? (row, rowId, actions) => {
            const trigger = resolveRowEditTrigger(
              actions,
              rowEditing,
              row,
              rowId
            );
            return {
              actions: trigger.actions,
              props: {
                rowEditing,
                row,
                rowId,
                labels: context.table.labels.value,
                conflict: rowEditConflict(bundle, rowId),
                showBegin: trigger.showBegin,
                icons: context.options.value.rowEditIcons as
                  RowEditIcons | undefined,
              },
            };
          }
        : undefined,
      batch: bundle.batch
        ? {
            batch: bundle.batch,
            contested: bundle.conflict?.anyContested,
            labels: context.table.labels.value,
          }
        : undefined,
    };
  });
  watch(
    model.bundle,
    (value) => context.state.set(editingModelKey<TRow>(), value),
    { immediate: true, flush: "sync" }
  );
  watch(
    model.history,
    (value) => context.state.set(editHistoryModelKey<TRow>(), value),
    { immediate: true, flush: "sync" }
  );
  watch(
    chrome,
    (value) => context.state.set(editingChromeModelKey<TRow>(), value),
    { immediate: true, flush: "sync" }
  );
}
export function editing<TRow>(
  onCellEdit: NonNullable<TableEditingOptions<TRow>["onCellEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  const base = coreEditing<TRow>(onCellEdit, extras);
  return {
    id: base.id,
    apply: (input) => ({ ...base.apply?.(input), editingModel: mountEditing }),
    requiredSlots: [EDITABLE_CELL],
  };
}
export function rowEditing<TRow>(
  onRowEdit: NonNullable<TableEditingOptions<TRow>["onRowEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  const base = coreRowEditing<TRow>(onRowEdit, extras);
  return {
    id: base.id,
    apply: (input) => ({ ...base.apply?.(input), editingModel: mountEditing }),
    requiredSlots: [EDITABLE_CELL, ROW_EDIT_ACTIONS],
  };
}
export function batchEditing<TRow>(
  onBatchEdit: NonNullable<TableEditingOptions<TRow>["onBatchEdit"]>,
  extras: EditingLifecycleExtras<TRow> = {}
): TableFeature<TRow> {
  const base = coreBatchEditing<TRow>(onBatchEdit, extras);
  return {
    id: base.id,
    apply: (input) => ({ ...base.apply?.(input), editingModel: mountEditing }),
    requiredSlots: [EDITABLE_CELL, BATCH_EDIT_BAR],
  };
}
export function undoRedoButtons(): StaticTableFeature {
  return { ...coreUndoRedoButtons(), requiredSlots: [UNDO_REDO_CONTROL] };
}
export function dirtyIndicators(): StaticTableFeature {
  return coreDirtyIndicators();
}
export function editHistory(
  options: boolean | { readonly depth?: number } = true
): StaticTableFeature {
  return coreEditHistory(options);
}
export type { ColumnDef } from "./columnDef";
export * from "./editing/editableCellChrome";
export * from "./editing/editingModels";
export type {
  BatchEditBarProps,
  RowEditActionsProps,
} from "./editing/rowEditChrome";
export * from "./editing/rowEditChrome";
export type { StaticTableFeature, TableFeature } from "./features/tableFeature";
export type { EditingChromeModel } from "./layout/modelChannels";
export {
  batchEditBarSlotKey,
  editableCellSlotKey,
  editHistoryModelKey,
  editingChromeModelKey,
  editingModelKey,
  rowEditActionsSlotKey,
} from "./layout/modelChannels";
export type { ExternalStoreOptions } from "./store";
export type {
  BatchEditingState,
  BatchRowEdit,
  CellEditHandler,
  CellEditingState,
  CellSaveState,
  DisplayValue,
  EditableCellController,
  EditableColumnLike,
  EditHistoryState,
  EditingBundle,
  EditValidationState,
  RowEditingState,
} from "@adapttable/core";
export type {
  BatchEditStoreOptions,
  CellConflictAsk,
  CellEditSessionOptions,
  CellSaveStoreOptions,
  EditCommitSnapshot,
  EditCommitValidationFailure,
  EditHistoryControllerOptions,
  EditValidationStoreOptions,
  RowEditStoreOptions,
} from "@adapttable/core";
export type {
  CustomCellEditorConflict,
  CustomCellEditorCtrl,
} from "@adapttable/core";
export { formatMultiDraft, readMultiDraft } from "@adapttable/core";
export type { RowEditIcons } from "@adapttable/core/binding";

/** Public feature signatures share the binding's nameable member types. */
export { UNDO_REDO_CONTROL } from "./actions/contracts";
export type { HistoryButtonsChromeProps } from "./actions/simpleChrome";
export { HistoryButtonsChrome } from "./actions/simpleChrome";
export type * from "./index";
