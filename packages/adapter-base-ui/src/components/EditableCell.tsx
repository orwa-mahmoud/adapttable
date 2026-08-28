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
  type MultiSelectEditorCheckboxProps,
  MultiSelectEditorChrome,
  type MultiSelectEditorSlots,
} from "@adapttable/core";
import {
  commitBooleanDraft,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/core/adapter";
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

import { TextField } from "../ui";
import { editableCellSlots } from "./kitControls";
import { Checkbox, NativeSelect } from "./primitives";

/** The multi-select editor's options, as Base UI checkboxes. */
function MultiSelectOption({
  label,
  checked,
  onToggle,
  onKeyDown,
  focusRef,
}: Readonly<MultiSelectEditorCheckboxProps>) {
  return (
    <Checkbox
      checked={checked}
      onToggle={onToggle}
      onKeyDown={onKeyDown}
      inputRef={focusRef}
    >
      {label}
    </Checkbox>
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

/** Base UI text / number / select editor for the active cell. */
export function BaseUiCellEditor({
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
    return (
      <Checkbox
        aria-label={label}
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        inputRef={ctrl.focusRef}
        checked={isDraftChecked(ctrl.draft)}
        onKeyDown={onKeyDown}
        onToggle={() => commitBooleanDraft(ctrl, !isDraftChecked(ctrl.draft))}
      />
    );
  }

  if (isMultiSelectEditor(ctrl.editor)) {
    return (
      <MultiSelectEditorChrome
        ctrl={ctrl}
        label={label}
        onKeyDown={onKeyDown}
        slots={multiSelectSlots}
      />
    );
  }

  if (isSelectEditor(ctrl.editor)) {
    return (
      <FocusOnMount focusRef={ctrl.focusRef}>
        <NativeSelect
          size="1"
          width="100%"
          aria-label={label}
          data-adapttable-part="edit-cell-editor"
          {...editorValidationProps(ctrl)}
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

  return (
    <FocusOnMount focusRef={ctrl.focusRef}>
      <TextField.Root
        data-adapttable-part="edit-cell-editor"
        {...editorValidationProps(ctrl)}
        aria-label={label}
        size="1"
        type={editorInputType(ctrl.editor)}
        value={ctrl.draft}
        onChange={(event) => ctrl.setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={ctrl.commitOnBlur}
      />
    </FocusOnMount>
  );
}

/** Opt-in editable cell — pass-through when `editing` is omitted.
 * Callers precompute `display` in the row so memoized rows still re-invoke
 * accessors when selection/expansion changes.
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
}): ReactElement {
  return (
    <EditableCellGate
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
        <BaseUiCellEditor ctrl={ctrl} label={props.editLabel} />
      )}
    />
  );
}
