import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
} from "@adapttable/core";
import { focusEditorOnMount } from "@adapttable/core/adapter";
import { Input, Select } from "antd";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

function stopEditKeys(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/** Ant Design text / number / select editor for the active cell. */
export function AntdCellEditor({
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
        size="small"
        style={{ width: "100%" }}
        options={ctrl.selectOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={ctrl.draft}
        onChange={(value: string) => ctrl.setDraft(value)}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
      />
    );
  }

  return (
    <Input
      ref={focusEditorOnMount}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="small"
      type={ctrl.editor === "number" ? "number" : "text"}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** Opt-in editable cell — pass-through when `editing` is omitted. */
export function EditableDataCell<TRow>(props: {
  readonly editing: EditableCellEditing<TRow> | undefined;
  readonly row: TRow;
  readonly column: ColumnDef<TRow>;
  readonly rowId: string;
  readonly rowIndex: number;
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly editLabel: string;
}): ReactElement {
  const display: ReactNode = props.column.Cell ? (
    <props.column.Cell row={props.row} rowIndex={props.rowIndex} />
  ) : (
    props.column.accessor?.(props.row)
  );

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
      display={display}
      renderEditor={(ctrl) => (
        <AntdCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
