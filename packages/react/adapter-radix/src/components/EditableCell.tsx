/** The in-place cell editor and editable cell, drawn with Radix's inputs. */
import {
  type MultiSelectEditorCheckboxProps,
  MultiSelectEditorChrome,
  type MultiSelectEditorSlots,
} from "@adapttable/react";
import {
  createCellEditor,
  createEditableCell,
  type KitCellCheckboxProps,
  type KitCellEditorProps,
  type KitCellInputProps,
} from "@adapttable/react/adapter";
import { TextField } from "@radix-ui/themes";

import { editableCellSlots } from "./kitControls";
import { Checkbox as UiCheckbox, NativeSelect } from "./primitives";

/** The multi-select editor's options, as Radix Themes checkboxes. */
function MultiSelectOption({
  label,
  checked,
  onToggle,
  onKeyDown,
  focusRef,
}: Readonly<MultiSelectEditorCheckboxProps>) {
  return (
    <UiCheckbox
      checked={checked}
      onToggle={onToggle}
      onKeyDown={onKeyDown}
      inputRef={focusRef}
    >
      {label}
    </UiCheckbox>
  );
}

const multiSelectSlots: MultiSelectEditorSlots = {
  Checkbox: MultiSelectOption,
};

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
    <UiCheckbox
      size="1"
      aria-label={label}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      inputRef={ctrl.focusRef}
      checked={checked}
      onKeyDown={onKeyDown}
      onToggle={() => onCheckedChange(!checked)}
    />
  );
}

/** Several choices, as a list of Base UI checkboxes. */
function MultiSelect({ ctrl, label, onKeyDown }: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <MultiSelectEditorChrome
      ctrl={ctrl}
      label={label}
      onKeyDown={onKeyDown}
      slots={multiSelectSlots}
    />
  );
}

/** One choice: Radix's select, committed as soon as it is chosen. */
function Select({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <NativeSelect
      size="1"
      width="100%"
      aria-label={label}
      data-adapttable-part="edit-cell-editor"
      {...aria}
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

function Input({
  ctrl,
  label,
  aria,
  type,
  onKeyDown,
}: Readonly<KitCellInputProps>) {
  "use no memo";
  return (
    <TextField.Root
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      aria-label={label}
      size="1"
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** The editor for the active cell, with Radix's inputs. */
export const RadixCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: false,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: RadixCellEditor,
  slots: editableCellSlots,
  rendersError: false,
});
