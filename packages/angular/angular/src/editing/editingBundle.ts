/**
 * The editing controllers a composed editing feature owns.
 *
 * The compatibility shell and a feature mount both call this, so a table
 * gets one bundle. The structural host does not import it.
 */
import { type EditEventHandler } from "@adapttable/core";
import type { RowEditIcons } from "@adapttable/core/binding";
import {
  dirtyMarkerView,
  resolveEditingArming,
} from "@adapttable/core/editing";
import {
  computed,
  DestroyRef,
  type Injector,
  type Signal,
} from "@angular/core";

import type { ColumnDef } from "../columnDef";
import type { DataTable } from "../dataTable";
import { type DirtyEdits, injectDirtyCells } from "./dirtyCells";
import type { EditableCellEditing } from "./editableCellController";
import {
  injectLiveEditConflict,
  type LiveEditConflictInput,
} from "./editConflict";
import {
  type BatchEditHandler,
  type CellEditHandler,
  injectBatchEditing,
  injectCellEditing,
  injectRowEditing,
  type RowEditHandler,
} from "./editing";
import {
  type CellSaveStateInjectOptions,
  injectCellSaveState,
} from "./saveState";
import {
  type EditValidationInjectOptions,
  injectEditValidation,
} from "./validation";

/** Keep callbacks from a disposed editing scope from reaching the host. */
function scopedEditCallback<TArgs extends unknown[], TResult>(
  callback: ((...args: TArgs) => TResult) | undefined,
  destroyRef: DestroyRef
): ((...args: TArgs) => TResult | undefined) | undefined {
  if (!callback) return undefined;
  return (...args) => (destroyRef.destroyed ? undefined : callback(...args));
}

/**
 * The editing bundle for composed editing features, or absent.
 *
 * @public
 */
export function editingBundleFor<TRow>(options: {
  readonly live: Signal<LiveEditConflictInput<TRow>>;
  readonly featureOptions: Readonly<Record<string, unknown>>;
  readonly activation: Signal<"doubleClick" | "click" | undefined>;
  readonly columns: Signal<readonly ColumnDef<TRow>[]>;
  readonly featureHost: DataTable<TRow>["featureHost"];
  readonly labels: DataTable<TRow>["labels"];
  readonly injector: Injector;
}): Signal<EditableCellEditing<TRow>> | undefined {
  const armed = resolveEditingArming(options.featureOptions);
  if (!armed.any) return undefined;
  const destroyRef = options.injector.get(DestroyRef);
  const declaredCellEdit = options.featureOptions.onCellEdit as
    CellEditHandler<TRow> | undefined;
  const onCellEdit: CellEditHandler<TRow> | undefined = scopedEditCallback(
    declaredCellEdit,
    destroyRef
  );
  const declaredRowEdit = options.featureOptions.onRowEdit as
    RowEditHandler<TRow> | undefined;
  const onRowEdit: RowEditHandler<TRow> | undefined = scopedEditCallback(
    declaredRowEdit,
    destroyRef
  );
  const declaredBatchEdit = options.featureOptions.onBatchEdit as
    BatchEditHandler<TRow> | undefined;
  const onBatchEdit: BatchEditHandler<TRow> | undefined = scopedEditCallback(
    declaredBatchEdit,
    destroyRef
  );
  const declaredEditStart = options.featureOptions.onEditStart as
    EditEventHandler<TRow> | undefined;
  const onEditStart: EditEventHandler<TRow> | undefined = scopedEditCallback(
    declaredEditStart,
    destroyRef
  );
  const declaredEditCancel = options.featureOptions.onEditCancel as
    EditEventHandler<TRow> | undefined;
  const onEditCancel: EditEventHandler<TRow> | undefined = scopedEditCallback(
    declaredEditCancel,
    destroyRef
  );
  const declaredEditCommit = options.featureOptions.onEditCommit as
    EditEventHandler<TRow> | undefined;
  const onEditCommit: EditEventHandler<TRow> | undefined = scopedEditCallback(
    declaredEditCommit,
    destroyRef
  );
  const cellState = injectCellEditing<TRow>({
    onEditStart,
    onEditCancel,
    onEditCommit,
    injector: options.injector,
  });
  const validation = injectEditValidation<TRow>({
    validateRow: options.featureOptions
      .validateRow as EditValidationInjectOptions<TRow>["validateRow"],
    applyEdit: options.featureOptions
      .applyEdit as EditValidationInjectOptions<TRow>["applyEdit"],
    injector: options.injector,
  });
  const saving = injectCellSaveState<TRow>({
    onRollback: options.featureOptions
      .onEditRollback as CellSaveStateInjectOptions<TRow>["onRollback"],
    formatError: options.featureOptions
      .formatEditError as CellSaveStateInjectOptions<TRow>["formatError"],
    onEditError: options.featureOptions.onEditError as
      EditEventHandler<TRow> | undefined,
    injector: options.injector,
  });
  const tracked = injectDirtyCells({
    enabled: armed.trackDirty,
    onDirtyChange: options.featureOptions.onDirtyChange as
      ((dirty: DirtyEdits) => void) | undefined,
    injector: options.injector,
  });
  const rowEditIcons = options.featureOptions.rowEditIcons as
    RowEditIcons | undefined;
  const lifecycle = {
    onEditStart,
    onEditCancel,
    onEditCommit,
    onValidationFail: options.featureOptions.onValidationFail as
      EditEventHandler<TRow> | undefined,
  };
  const rowEditing = armed.row
    ? injectRowEditing<TRow>({
        enabled: true,
        columns: options.columns,
        onRowEdit,
        onEditStart,
        onEditCancel,
        onEditCommit,
        get featureHost() {
          return options.featureHost;
        },
        injector: options.injector,
      })
    : undefined;
  const batch = armed.batch
    ? injectBatchEditing<TRow>({
        enabled: true,
        columns: options.columns,
        onBatchEdit,
        onEditStart,
        onEditCancel,
        onEditCommit,
        get featureHost() {
          return options.featureHost;
        },
        injector: options.injector,
      })
    : undefined;
  const conflict = injectLiveEditConflict({
    input: options.live,
    cell: cellState,
    row: rowEditing,
    batch,
    injector: options.injector,
  });
  return computed((): EditableCellEditing<TRow> => {
    const labels = options.labels();
    return {
      onCellEdit,
      state: cellState(),
      validation: validation(),
      saving: saving(),
      dirty: dirtyMarkerView(tracked(), armed.dirtyMarkers),
      rowEditing: rowEditing?.(),
      rowEditIcons,
      batch: batch?.(),
      lifecycle,
      conflict: conflict(),
      conflictLabels: {
        message: labels.editConflict,
        keepMine: labels.keepMine,
        takeTheirs: labels.takeTheirs,
        theirsValue: labels.theirsValue,
      },
      featureHost: options.featureHost,
      activation: options.activation(),
    };
  });
}
