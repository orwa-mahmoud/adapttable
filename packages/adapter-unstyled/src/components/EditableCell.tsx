import {
  type ColumnDef,
  type EditableCellEditing,
  type EditableCellEditorCtrl,
  EditableCellGate,
  focusEditorOnMount,
} from "@adapttable/core";
import type { KeyboardEvent, ReactElement, ReactNode } from "react";

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
    if (
      event.key === "Enter" ||
      event.key === "Escape" ||
      event.key === "Tab"
    ) {
      event.stopPropagation();
    }
  };

  if (typeof ctrl.editor === "object" && ctrl.editor.type === "select") {
    return (
      <select
        ref={focusEditorOnMount}
        data-adapttable-part="edit-cell-editor"
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
      ref={focusEditorOnMount}
      data-adapttable-part="edit-cell-editor"
      className={className}
      aria-label={label}
      type={ctrl.editor === "number" ? "number" : "text"}
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
  readonly display: ReactNode;
  /** Class for the invisible activate button. */
  readonly activateClassName?: string;
  /** Class for the active inline editor. */
  readonly editorClassName?: string;
}): ReactElement {
  return (
    <EditableCellGate
      activateClassName={props.activateClassName}
      editing={props.editing}
      row={props.row}
      column={props.column}
      rowId={props.rowId}
      rows={props.rows}
      columns={props.columns}
      rowKey={props.rowKey}
      editLabel={props.editLabel}
      display={props.display}
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
