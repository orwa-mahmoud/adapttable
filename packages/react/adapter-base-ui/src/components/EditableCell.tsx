/** The in-place cell editor and editable cell, drawn with Base UI's inputs. */
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
import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

import { TextField } from "../ui";
import { editableCellSlots } from "./kitControls";
import { Checkbox as UiCheckbox, NativeSelect } from "./primitives";

/** The multi-select editor's options, as Base UI checkboxes. */
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

/**
 * Hand the control inside to the table's focus ref.
 *
 * Base UI's fields do not forward a ref to their input, so the wrapper finds it
 * — and whether it actually takes focus is the table's call: in row mode only
 * the first field should, or the reader ends up at the last column of the row
 * they just opened.
 */
function FocusOnMount({
  focusRef,
  children,
}: Readonly<{
  focusRef: (node: { focus: () => void } | null) => void;
  children: ReactNode;
}>): ReactElement {
  const rootRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const control = rootRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button"
    );
    focusRef(control ?? null);
  }, [focusRef]);
  return (
    <span ref={rootRef} style={{ display: "contents" }}>
      {children}
    </span>
  );
}

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

/** One choice: Base UI's select, committed as soon as it is chosen. */
function Select({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <FocusOnMount focusRef={ctrl.focusRef}>
      <NativeSelect
        size="1"
        width="100%"
        aria-label={label}
        data-adapttable-part="edit-cell-editor"
        {...aria}
        value={ctrl.draft}
        options={ctrl.selectOptions}
        onKeyDown={onKeyDown}
        onValueChange={(value) => {
          ctrl.setDraft(value);
          ctrl.commitOnBlur();
        }}
      />
    </FocusOnMount>
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
    <FocusOnMount focusRef={ctrl.focusRef}>
      <TextField.Root
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
    </FocusOnMount>
  );
}

/** The editor for the active cell, with Base UI's inputs. */
export const BaseUiCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: false,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: BaseUiCellEditor,
  slots: editableCellSlots,
  rendersError: false,
});
