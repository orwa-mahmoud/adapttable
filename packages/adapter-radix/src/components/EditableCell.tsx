import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
} from "@adapttable/core";
import { focusEditorOnMount } from "@adapttable/core/adapter";
import { TextField } from "@radix-ui/themes";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { NativeSelect } from "./primitives";

function stopEditKeys(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/** Radix Themes text / number / select editor for the active cell. */
export function RadixCellEditor({
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
      <NativeSelect
        size="1"
        width="100%"
        aria-label={label}
        value={ctrl.draft}
        options={ctrl.selectOptions}
        onValueChange={(value) => {
          ctrl.setDraft(value);
          ctrl.commitOnBlur();
        }}
      />
    );
  }

  return (
    <TextField.Root
      ref={focusEditorOnMount}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="1"
      type={ctrl.editor === "number" ? "number" : "text"}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
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
        <RadixCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
