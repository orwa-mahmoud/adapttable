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
  readMultiDraft,
} from "@adapttable/core";
import {
  commitBooleanDraft,
  editorValidationProps,
  multiDraftFromSelect,
  stopEditKeys,
} from "@adapttable/core/adapter";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

import { editableCellSlots } from "./kitControls";

/** Native text / number / select editor for the unstyled adapter. */
export function NativeCellEditor({
  ctrl,
  label,
  className,
}: Readonly<{
  ctrl: EditableCellEditorCtrl;
  label: string;
  className?: string;
}>): ReactElement {
  const onKeyDown = (event: KeyboardEvent) => {
    ctrl.onEditorKeyDown(event);
    stopEditKeys(event);
  };

  if (isBooleanEditor(ctrl.editor)) {
    return (
      <input
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        className={className}
        aria-label={label}
        type="checkbox"
        checked={isDraftChecked(ctrl.draft)}
        // One gesture: a ticked box that changed nothing is a bug, not a draft.
        onChange={(event) => commitBooleanDraft(ctrl, event.target.checked)}
        onKeyDown={onKeyDown}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
    return (
      <select
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
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

  if (isSelectEditor(ctrl.editor)) {
    return (
      <select
        ref={ctrl.focusRef}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
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

  return (
    <input
      ref={ctrl.focusRef}
      data-adapttable-part="edit-cell-editor"
      {...editorValidationProps(ctrl)}
      className={className}
      aria-label={label}
      type={editorInputType(ctrl.editor)}
      value={ctrl.draft}
      onChange={(event) => ctrl.setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={ctrl.commitOnBlur}
    />
  );
}

/**
 * Opt-in editable cell — pass-through when `editing` is omitted.
 * Callers must precompute `display` in the row so memoized rows still
 * re-invoke accessors when selection/expansion changes.
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
  /** Class for the invisible activate button. */
  readonly activateClassName?: string;
  readonly errorClassName?: string;
  readonly saveErrorClassName?: string;
  readonly rollbackClassName?: string;
  /** Class for the active inline editor. */
  readonly editorClassName?: string;
}): ReactElement {
  return (
    <EditableCellGate
      activateClassName={props.activateClassName}
      errorClassName={props.errorClassName}
      saveErrorClassName={props.saveErrorClassName}
      rollbackClassName={props.rollbackClassName}
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
        <NativeCellEditor
          ctrl={ctrl}
          label={props.editLabel}
          className={props.editorClassName}
        />
      )}
    />
  );
}
