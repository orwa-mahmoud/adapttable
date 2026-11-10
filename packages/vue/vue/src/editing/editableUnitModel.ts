/** Choose a cell's editing unit; all draft, parse, validation and save transitions stay in core. */
import {
  type CellConflictAsk,
  type EditableCellController,
  type EditableColumnLike,
  type EditingBundle,
} from "@adapttable/core";
import {
  batchEditorControl,
  cellConflictAsk,
  controllerConflictAsk,
  isCellEditable,
  isFirstEditableColumn,
  resolveCellEditor,
  rowEditorControl,
} from "@adapttable/core/editing";
export interface EditableUnitModel<TRow> {
  readonly controller: EditableCellController<TRow>;
  readonly unit: "cell" | "row" | "batch";
  readonly ask?: CellConflictAsk;
  readonly takesFocus: boolean;
}
export function editableUnitModel<TRow>(input: {
  readonly editing?: EditingBundle<TRow>;
  readonly controller: EditableCellController<TRow>;
  readonly row: TRow;
  readonly rowId: string;
  readonly column: EditableColumnLike<TRow>;
  readonly columns: readonly EditableColumnLike<TRow>[];
}): EditableUnitModel<TRow> {
  const { editing, row, rowId, column, controller } = input;
  const batch = editing?.batch;
  const rowEditing = editing?.rowEditing?.isEditing(rowId)
    ? editing.rowEditing
    : undefined;
  if (!batch && !rowEditing)
    return {
      controller,
      unit: "cell",
      ask: controllerConflictAsk(controller),
      takesFocus: true,
    };
  const unit = batch ? "batch" : "row";
  const editor = resolveCellEditor(column, editing?.featureHost);
  if (!editor || !isCellEditable(column, row))
    return {
      controller: { ...controller, mode: "display" },
      unit,
      takesFocus: false,
    };
  const ask = cellConflictAsk(editing, rowId, column.key);
  const commit = batch?.commit ?? rowEditing?.commit;
  const blocked = editing?.conflict?.isRowContested(rowId) ?? false;
  const control = batch
    ? batchEditorControl(batch, row, rowId, column.key, editor)
    : rowEditorControl(rowEditing!, column.key, editor, blocked);
  const ctrl: EditableCellController<TRow> = {
    ...controller,
    mode: "editing",
    editor: control.editor,
    selectOptions: control.selectOptions,
    draft: control.draft,
    error: ask ? editing?.conflictLabels?.message : control.error,
    validating: control.validating,
    saveStatus:
      commit?.phase === "saving" || commit?.phase === "failed"
        ? commit.phase
        : undefined,
    saveFailure: undefined,
    canRollback: false,
    isDirty: editing?.dirty?.isDirty(rowId, column.key) ?? false,
    begin: () => undefined,
    setDraft: control.setDraft,
    commit: () => {
      if (!batch && !blocked) rowEditing!.save();
    },
    cancel: () => {
      if (batch) batch.cancelRow(rowId);
      else rowEditing!.cancel();
    },
    onEditorKeyDown: control.onEditorKeyDown,
    commitOnBlur: control.commitOnBlur,
    keepConflict: () => ask?.keep(),
    takeConflict: () => ask?.take(),
    conflictLabels: ask ? editing?.conflictLabels : undefined,
  };
  return {
    controller: ctrl,
    unit,
    ask,
    takesFocus: !batch && isFirstEditableColumn(input.columns, column.key),
  };
}
