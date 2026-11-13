/** The in-place cell editor and editable cell, drawn with antd's inputs. */
import {
  createCellEditor,
  createEditableCell,
  formatMultiDraft,
  type KitCellCheckboxProps,
  type KitCellEditorProps,
  type KitCellInputProps,
  readMultiDraft,
} from "@adapttable/react/adapter";
import {
  Checkbox as AntCheckbox,
  Input as AntInput,
  Select as AntSelect,
} from "antd";

import { editableCellSlots } from "./kitControls";

const FULL_WIDTH = { width: "100%" } as const;

const statusOf = (error: unknown) =>
  error === undefined ? undefined : "error";

function Checkbox({
  label,
  aria,
  checked,
  onCheckedChange,
  onKeyDown,
}: Readonly<KitCellCheckboxProps>) {
  "use no memo";
  return (
    <AntCheckbox
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      onKeyDown={onKeyDown}
      {...aria}
    />
  );
}

const optionsOf = (ctrl: KitCellEditorProps["ctrl"]) =>
  ctrl.selectOptions.map((option) => ({
    value: option.value,
    label: option.label,
  }));

/** Several choices: antd's multiple select. */
function MultiSelect({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <AntSelect
      mode="multiple"
      status={statusOf(ctrl.error)}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      aria-label={label}
      size="small"
      style={FULL_WIDTH}
      options={optionsOf(ctrl)}
      value={readMultiDraft(ctrl.draft)}
      onChange={(values: string[]) => ctrl.setDraft(formatMultiDraft(values))}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

function Select({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <AntSelect
      status={statusOf(ctrl.error)}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      aria-label={label}
      size="small"
      style={FULL_WIDTH}
      options={optionsOf(ctrl)}
      value={ctrl.draft}
      onChange={(value: string) => ctrl.setDraft(value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

function Input({
  ctrl,
  label,
  aria,
  type,
  onKeyDown,
}: Readonly<KitCellInputProps>) {
  "use no memo";
  return (
    <AntInput
      status={statusOf(ctrl.error)}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      aria-label={label}
      size="small"
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** The editor for the active cell, with antd's inputs. */
export const AntdCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: false,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: AntdCellEditor,
  slots: editableCellSlots,
  rendersError: false,
});
