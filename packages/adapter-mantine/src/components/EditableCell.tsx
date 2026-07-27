import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
} from "@adapttable/core";
import { focusEditorOnMount } from "@adapttable/core/adapter";
import { Select, TextInput } from "@mantine/core";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

function stopEditKeys(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/** Mantine text / number / select editor for the active cell. */
export function MantineCellEditor({
  ctrl,
  label,
}: Readonly<{
  ctrl: EditableCellEditorCtrl;
  label: string;
}>): ReactElement {
  const onKeyDown = (event: KeyboardEvent) => {
    ctrl.onEditorKeyDown(event);
    stopEditKeys(event);
  };

  if (typeof ctrl.editor === "object" && ctrl.editor.type === "select") {
    return (
      <Select
        ref={focusEditorOnMount}
        data-adapttable-part="edit-cell-editor"
        aria-label={label}
        size="xs"
        data={ctrl.selectOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={ctrl.draft}
        onChange={(value) => ctrl.setDraft(value ?? "")}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
        allowDeselect={false}
      />
    );
  }

  return (
    <TextInput
      ref={focusEditorOnMount}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="xs"
      type={ctrl.editor === "number" ? "number" : "text"}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** Opt-in editable cell — pass-through when `editing` is omitted.
 * Callers precompute `display` in the row so memoized rows still re-invoke
 * accessors when selection/expansion changes.
 */
export function EditableDataCell<TRow>(props: {
  readonly editing: EditableCellEditing<TRow> | undefined;
  readonly row: TRow;
  readonly column: ColumnDef<TRow>;
  readonly rowId: string;
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly editLabel: string;
  readonly display: ReactNode;
}): ReactElement {
  return (
    <EditableCellGate
      editing={props.editing}
      row={props.row}
      column={props.column}
      rowId={props.rowId}
      rows={props.rows}
      columns={props.columns}
      rowKey={props.rowKey}
      editLabel={props.editLabel}
      display={props.display}
      renderEditor={(ctrl) => (
        <MantineCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
