/** The in-place cell editor and editable cell, drawn with MUI's inputs. */
import {
  createCellEditor,
  createEditableCell,
  type KitCellCheckboxProps,
  type KitCellEditorProps,
  type KitCellInputProps,
  multiDraftFromSelect,
  readMultiDraft,
} from "@adapttable/react/adapter";
import { Checkbox as MuiCheckbox, MenuItem, TextField } from "@mui/material";

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
  const input = {
    ref: ctrl.focusRef,
    "aria-label": label,
    "data-adapttable-part": "edit-cell-editor",
    ...aria,
  };
  return (
    <MuiCheckbox
      slotProps={{ input }}
      checked={checked}
      onChange={(_, next) => onCheckedChange(next)}
      onKeyDown={onKeyDown}
    />
  );
}

function MultiSelect({
  ctrl,
  label,
  aria,
  onKeyDown,
}: Readonly<KitCellEditorProps>) {
  "use no memo";
  return (
    <TextField
      inputRef={ctrl.focusRef}
      select
      size="small"
      fullWidth
      value={readMultiDraft(ctrl.draft)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      data-adapttable-part="edit-cell-editor"
      slotProps={{
        select: {
          multiple: true,
          native: true,
          onChange: (event) => {
            const select = event.target as unknown as HTMLSelectElement;
            ctrl.setDraft(multiDraftFromSelect(select));
          },
        },
        htmlInput: { "aria-label": label, ...aria },
      }}
    >
      {ctrl.selectOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </TextField>
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
    <TextField
      inputRef={ctrl.focusRef}
      select
      size="small"
      fullWidth
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      error={error !== undefined}
      helperText={error}
      data-adapttable-part="edit-cell-editor"
      slotProps={{ htmlInput: { "aria-label": label, ...aria } }}
    >
      {ctrl.selectOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
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
    <TextField
      inputRef={ctrl.focusRef}
      size="small"
      fullWidth
      type={type}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      error={error !== undefined}
      helperText={error}
      slotProps={{
        htmlInput: {
          "aria-label": label,
          "data-adapttable-part": "edit-cell-editor",
          ...aria,
        },
      }}
    />
  );
}

/** The editor for the active cell, with MUI's inputs. */
export const MuiCellEditor = /* @__PURE__ */ createCellEditor({
  Checkbox,
  MultiSelect,
  Select,
  Input,
  rendersError: true,
});

/** A cell that edits in place; shows its value until editing starts. */
export const EditableDataCell = /* @__PURE__ */ createEditableCell({
  Editor: MuiCellEditor,
  slots: editableCellSlots,
  rendersError: true,
});
