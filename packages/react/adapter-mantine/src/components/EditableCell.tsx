/** The in-place cell editor and editable cell, drawn with Mantine's inputs. */
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
  Checkbox as MantineCheckbox,
  MultiSelect as MantineMultiSelect,
  Select as MantineSelect,
  TextInput,
} from "@mantine/core";

import { editableCellSlots } from "./kitControls";

function Checkbox({
  ctrl,
  label,
  aria,
  checked,
  onCheckedChange,
  onKeyDown,
}: Readonly<KitCellCheckboxProps>) {
  "use no memo";
  return (
    <MantineCheckbox
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      checked={checked}
      onChange={(event) => onCheckedChange(event.currentTarget.checked)}
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

function MultiSelect({
  ctrl,
  label,
  aria,
  error,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <MantineMultiSelect
      error={error}
      {...aria}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="xs"
      data={optionsOf(ctrl)}
      value={readMultiDraft(ctrl.draft)}
      onChange={(values) => ctrl.setDraft(formatMultiDraft(values))}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

function Select({
  ctrl,
  label,
  aria,
  error,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <MantineSelect
      error={error}
      {...aria}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="xs"
      data={optionsOf(ctrl)}
      value={ctrl.draft}
      onChange={(value) => ctrl.setDraft(value ?? "")}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      allowDeselect={false}
    />
  );
}

function Input({
  ctrl,
  label,
  aria,
  error,
  type,
  onKeyDown,
}: Readonly<KitCellInputProps>) {
  "use no memo";
  return (
    <TextInput
      error={error}
      {...aria}
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      aria-label={label}
      size="xs"
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.currentTarget.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** The editor for the active cell, with Mantine's inputs. */
export const MantineCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: true,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: MantineCellEditor,
  slots: editableCellSlots,
  rendersError: true,
});
