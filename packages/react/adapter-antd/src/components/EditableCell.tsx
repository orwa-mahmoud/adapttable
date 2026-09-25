import {
  editorInputType,
  formatMultiDraft,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  readMultiDraft,
} from "@adapttable/core";
import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
} from "@adapttable/react";
import {
  commitBooleanDraft,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/react/adapter";
import { Checkbox, Input, Select } from "antd";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { editableCellSlots } from "./kitControls";

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

  if (isBooleanEditor(ctrl.editor)) {
    return (
      <Checkbox
        data-adapttable-part="edit-cell-editor"
        aria-label={label}
        checked={isDraftChecked(ctrl.draft)}
        onChange={(event) => commitBooleanDraft(ctrl, event.target.checked)}
        onKeyDown={onKeyDown}
        {...editorValidationProps(ctrl)}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
    return (
      <Select
        mode="multiple"
        status={ctrl.error === undefined ? undefined : "error"}
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        aria-label={label}
        size="small"
        style={{ width: "100%" }}
        options={ctrl.selectOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={readMultiDraft(ctrl.draft)}
        onChange={(values: string[]) => ctrl.setDraft(formatMultiDraft(values))}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
      />
    );
  }

  if (isSelectEditor(ctrl.editor)) {
    return (
      <Select
        status={ctrl.error === undefined ? undefined : "error"}
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
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
      status={ctrl.error === undefined ? undefined : "error"}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...editorValidationProps(ctrl)}
      aria-label={label}
      size="small"
      type={editorInputType(ctrl.editor)}
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
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rowKey: (row: TRow) => string;
  readonly editLabel: string;
  /** `labels.undoEdit` — the control a failed save offers. */
  readonly undoLabel?: string;
  /**
   * What the cell shows when nothing is being edited. The binding resolves it
   * — the row's precomputed display, the column's `Cell`, or its accessor —
   * so the accessor runs in this cell's own memo scope.
   */
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
      undoLabel={props.undoLabel}
      display={props.display}
      slots={editableCellSlots}
      renderEditor={(ctrl) => (
        <AntdCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
