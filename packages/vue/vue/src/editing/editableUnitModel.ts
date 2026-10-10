/** Choose a cell's editing unit; all draft, parse, validation and save transitions stay in core. */
import {
  type CellConflictAsk,
  cellConflictAsk,
  controllerConflictAsk,
  type EditableCellController,
  type EditableColumnLike,
  type EditingBundle,
  editorSelectOptions,
  handleRowEditorKey,
  isCellEditable,
  isFirstEditableColumn,
  resolveCellEditor,
} from "@adapttable/core";
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
  const invalid = commit?.validation?.find(
    (failure) =>
      failure.rowId === rowId &&
      (failure.columnKey === undefined || failure.columnKey === column.key)
  );
  const blocked = editing?.conflict?.isRowContested(rowId) ?? false;
  const ctrl: EditableCellController<TRow> = {
    ...controller,
    mode: "editing",
    editor,
    selectOptions: editorSelectOptions(editor),
    draft: batch
      ? batch.draftFor(row, rowId, column.key)
      : rowEditing!.draftFor(column.key),
    error: ask ? editing?.conflictLabels?.message : invalid?.message,
    validating: commit?.phase === "validating",
    saveStatus:
      commit?.phase === "saving" || commit?.phase === "failed"
        ? commit.phase
        : undefined,
    saveFailure: undefined,
    canRollback: false,
    isDirty: editing?.dirty?.isDirty(rowId, column.key) ?? false,
    begin: () => undefined,
    setDraft: (value) => {
      if (batch) batch.setDraft(row, rowId, column.key, value);
      else rowEditing!.setDraft(column.key, value);
    },
    commit: () => {
      if (!batch && !blocked) rowEditing!.save();
    },
    cancel: () => {
      if (batch) batch.cancelRow(rowId);
      else rowEditing!.cancel();
    },
    onEditorKeyDown: (event) => {
      if (!batch) handleRowEditorKey(event, rowEditing!, blocked);
    },
    commitOnBlur: () => undefined,
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
