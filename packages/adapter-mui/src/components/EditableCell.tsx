import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
} from "@adapttable/core";
import { focusEditorOnMount } from "@adapttable/core/adapter";
import { MenuItem, TextField } from "@mui/material";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

function stopEditKeys(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/** MUI text / number / select editor for the active cell. */
export function MuiCellEditor({
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
      <TextField
        inputRef={focusEditorOnMount}
        select
        size="small"
        fullWidth
        value={ctrl.draft}
        onChange={(event) => ctrl.setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
        slotProps={{
          htmlInput: {
            "aria-label": label,
            "data-adapttable-part": "edit-cell-editor",
          },
        }}
      >
        {ctrl.selectOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      inputRef={focusEditorOnMount}
      size="small"
      fullWidth
      type={ctrl.editor === "number" ? "number" : "text"}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      slotProps={{
        htmlInput: {
          "aria-label": label,
          "data-adapttable-part": "edit-cell-editor",
        },
      }}
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
        <MuiCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
