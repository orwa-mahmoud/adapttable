import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
  editorInputType,
  formatMultiDraft,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  readMultiDraft,
} from "@adapttable/core";
import {
  commitBooleanDraft,
  editorBusyProps,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/core/adapter";
import { Checkbox, MultiSelect, Select, TextInput } from "@mantine/core";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { editableCellSlots } from "./kitControls";

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

  if (isBooleanEditor(ctrl.editor)) {
    return (
      <Checkbox
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        aria-label={label}
        checked={isDraftChecked(ctrl.draft)}
        onChange={(event) =>
          commitBooleanDraft(ctrl, event.currentTarget.checked)
        }
        onKeyDown={onKeyDown}
        {...editorValidationProps(ctrl)}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
    return (
      <MultiSelect
        error={ctrl.conflict === true ? undefined : ctrl.error}
        {...editorBusyProps(ctrl)}
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        aria-label={label}
        size="xs"
        data={ctrl.selectOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={readMultiDraft(ctrl.draft)}
        onChange={(values) => ctrl.setDraft(formatMultiDraft(values))}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
      />
    );
  }

  if (isSelectEditor(ctrl.editor)) {
    return (
      <Select
        error={ctrl.conflict === true ? undefined : ctrl.error}
        {...editorBusyProps(ctrl)}
        ref={ctrl.focusRef}
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
      error={ctrl.conflict === true ? undefined : ctrl.error}
      {...editorBusyProps(ctrl)}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="xs"
      type={editorInputType(ctrl.editor)}
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
  /** `labels.undoEdit` — the control a failed save offers. */
  readonly undoLabel?: string;
  readonly display: ReactNode;
}): ReactElement {
  return (
    <EditableCellGate
      kitRendersError
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
        <MantineCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
