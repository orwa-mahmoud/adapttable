/** The in-place cell editor and editable cell, drawn with Chakra's inputs. */
import {
  createCellEditor,
  createEditableCell,
  type KitCellCheckboxProps,
  type KitCellEditorProps,
  type KitCellInputProps,
  multiDraftFromSelect,
  readMultiDraft,
} from "@adapttable/react/adapter";
import { Input as ChakraInput } from "@chakra-ui/react";

import { editableCellSlots } from "./kitControls";
import { Checkbox as ChakraCheckbox, NativeSelect } from "./primitives";

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
    <ChakraCheckbox
      size="sm"
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

function Options({ ctrl }: Readonly<Pick<KitCellEditorProps, "ctrl">>) {
  "use no memo";
  return ctrl.selectOptions.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));
}

function MultiSelect({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <NativeSelect
      multiple
      size="sm"
      w="100%"
      aria-label={label}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      value={readMultiDraft(ctrl.draft)}
      onChange={(event) => ctrl.setDraft(multiDraftFromSelect(event.target))}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      fieldRef={ctrl.focusRef}
    >
      <Options ctrl={ctrl} />
    </NativeSelect>
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
    <NativeSelect
      size="sm"
      w="100%"
      aria-label={label}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      fieldRef={ctrl.focusRef}
    >
      <Options ctrl={ctrl} />
    </NativeSelect>
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
    <ChakraInput
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      aria-label={label}
      size="sm"
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** The editor for the active cell, with Chakra's inputs. */
export const ChakraCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: false,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: ChakraCellEditor,
  slots: editableCellSlots,
  rendersError: false,
});
