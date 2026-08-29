import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
  editorInputType,
  isBooleanEditor,
  isDraftChecked,
  isMultiSelectEditor,
  isSelectEditor,
  type MultiSelectEditorCheckboxProps,
  MultiSelectEditorChrome,
  type MultiSelectEditorSlots,
} from "@adapttable/core";
import {
  commitBooleanDraft,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/core/adapter";
import { TextField } from "@radix-ui/themes";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { editableCellSlots } from "./kitControls";
import { Checkbox, NativeSelect } from "./primitives";

/** The multi-select editor's options, as Radix Themes checkboxes. */
function MultiSelectOption({
  label,
  checked,
  onToggle,
  onKeyDown,
  focusRef,
}: Readonly<MultiSelectEditorCheckboxProps>) {
  return (
    <Checkbox
      checked={checked}
      onToggle={onToggle}
      onKeyDown={onKeyDown}
      inputRef={focusRef}
    >
      {label}
    </Checkbox>
  );
}

const multiSelectSlots: MultiSelectEditorSlots = {
  Checkbox: MultiSelectOption,
};

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

  if (isBooleanEditor(ctrl.editor)) {
    return (
      <Checkbox
        size="1"
        aria-label={label}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        inputRef={ctrl.focusRef}
        checked={isDraftChecked(ctrl.draft)}
        onKeyDown={onKeyDown}
        onToggle={() => commitBooleanDraft(ctrl, !isDraftChecked(ctrl.draft))}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
    return (
      <MultiSelectEditorChrome
        ctrl={ctrl}
        label={label}
        onKeyDown={onKeyDown}
        slots={multiSelectSlots}
      />
    );
  }

  if (isSelectEditor(ctrl.editor)) {
    return (
      <NativeSelect
        size="1"
        width="100%"
        aria-label={label}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        triggerRef={ctrl.focusRef}
        value={ctrl.draft}
        options={ctrl.selectOptions}
        onKeyDown={onKeyDown}
        onValueChange={(value) => {
          ctrl.setDraft(value);
          ctrl.commitOnBlur();
        }}
      />
    );
  }

  return (
    <TextField.Root
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...editorValidationProps(ctrl)}
      aria-label={label}
      size="1"
      type={editorInputType(ctrl.editor)}
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
  /** `labels.undoEdit` — the control a failed save offers. */
  readonly undoLabel?: string;
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
        <RadixCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
