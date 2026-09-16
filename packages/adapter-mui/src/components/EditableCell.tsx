import {
  editorInputType,
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
  editorBusyProps,
  editorValidationProps,
  multiDraftFromSelect,
  stopEditKeys,
} from "@adapttable/react/adapter";
import { Checkbox, MenuItem, TextField } from "@mui/material";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { editableCellSlots } from "./kitControls";

/** MUI text / number / select editor for the active cell. */
export function MuiCellEditor({
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
    const inputSlot = {
      ref: ctrl.focusRef,
      "aria-label": label,
      "data-adapttable-part": "edit-cell-editor",
      ...editorValidationProps(ctrl),
    };
    return (
      <Checkbox
        slotProps={{ input: inputSlot }}
        checked={isDraftChecked(ctrl.draft)}
        onChange={(_, checked) => commitBooleanDraft(ctrl, checked)}
        onKeyDown={onKeyDown}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
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
          htmlInput: { "aria-label": label, ...editorBusyProps(ctrl) },
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

  if (isSelectEditor(ctrl.editor)) {
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
        error={ctrl.conflict === true ? false : ctrl.error !== undefined}
        helperText={ctrl.conflict === true ? undefined : ctrl.error}
        data-adapttable-part="edit-cell-editor"
        slotProps={{
          htmlInput: { "aria-label": label, ...editorBusyProps(ctrl) },
        }}
      >
        {ctrl.selectOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <TextField
      inputRef={ctrl.focusRef}
      size="small"
      fullWidth
      type={editorInputType(ctrl.editor)}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
      error={ctrl.conflict === true ? false : ctrl.error !== undefined}
      helperText={ctrl.conflict === true ? undefined : ctrl.error}
      slotProps={{
        htmlInput: {
          "aria-label": label,
          "data-adapttable-part": "edit-cell-editor",
          ...editorBusyProps(ctrl),
        },
      }}
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
        <MuiCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
