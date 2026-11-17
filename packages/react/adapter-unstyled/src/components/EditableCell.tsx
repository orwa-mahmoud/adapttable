/** The in-place cell editor and editable cell, drawn with native inputs. */
import {
  createCellEditor,
  createEditableCell,
  type KitCellCheckboxProps,
  type KitCellEditorProps,
  type KitCellInputProps,
  multiDraftFromSelect,
  readMultiDraft,
} from "@adapttable/react/adapter";

import { editableCellSlots } from "./kitControls";

function Checkbox({
  ctrl,
  label,
  className,
  aria,
  checked,
  onCheckedChange,
  onKeyDown,
}: Readonly<KitCellCheckboxProps>) {
  "use no memo";
  return (
    <input
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      className={className}
      aria-label={label}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
      onKeyDown={onKeyDown}
    />
  );
}

/** Several choices, as a native multiple select. */
function MultiSelect({
  ctrl,
  label,
  className,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <select
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      className={className}
      aria-label={label}
      multiple
      value={readMultiDraft(ctrl.draft)}
      onChange={(event) => ctrl.setDraft(multiDraftFromSelect(event.target))}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    >
      {ctrl.selectOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** One choice, as a native select. */
function Select({
  ctrl,
  label,
  className,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <select
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      className={className}
      aria-label={label}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    >
      {ctrl.selectOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  ctrl,
  label,
  className,
  aria,
  type,
  onKeyDown,
}: Readonly<KitCellInputProps>) {
  "use no memo";
  return (
    <input
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...aria}
      className={className}
      aria-label={label}
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/** The editor for the active cell, with native inputs. */
export const NativeCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: false,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: NativeCellEditor,
  slots: editableCellSlots,
  rendersError: false,
});
