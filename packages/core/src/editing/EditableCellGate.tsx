import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

import type { ColumnDef } from "../types";
import { booleanDraft, formatMultiDraft, isCustomEditor } from "./cellEditing";
import {
  editableCellController,
  type EditableCellEditing,
  focusEditorOnMount,
  stopCellEditKeyboard,
} from "./editableCellController";
import { BatchEditCell, RowEditCell } from "./RowEditGate";

/**
 * Props for a kit-native editor while a cell is active.
 *
 * @public
 */
export interface EditableCellEditorCtrl {
  draft: string;
  setDraft: (value: string) => void;
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  commitOnBlur: () => void;
  editor: NonNullable<ReturnType<typeof editableCellController>["editor"]>;
  selectOptions: ReturnType<typeof editableCellController>["selectOptions"];
  /**
   * A validator's message for this cell, when the last commit was rejected.
   * Wire it to the kit's own error surface (Mantine's `error`, MUI's
   * `helperText`, …) — and it is on the DOM either way, see `errorId`.
   */
  error?: string;
  /** Whether an async validator is still deciding. */
  validating: boolean;
  /**
   * `id` of the element holding the message. Put it on the editor's
   * `aria-describedby` so the message is announced with the field, and set
   * `aria-invalid` when `error` is set.
   */
  errorId: string;
  /**
   * Attach as the editor's `ref` so the table decides what takes focus.
   *
   * In cell mode that is this editor, every time. In row mode a whole row opens
   * at once, and only the FIRST field should take focus — nine editors each
   * calling focus on mount would leave the reader at the last column of the row
   * they just opened.
   */
  focusRef: (node: { focus: () => void } | null) => void;
  /** A live row changed under this editor. */
  conflict?: boolean;
}

/**
 * Whether a column is the first editable one — the field a row edit focuses.
 *
 * By column order rather than by which cell renders first, so the answer is the
 * same in a windowed body and in a reordered one.
 */
function isFirstEditableColumn(
  columns: readonly { key: string; editable?: unknown }[],
  key: string
): boolean {
  const first = columns.find(
    (column) => column.editable !== undefined && column.editable !== false
  );
  return first?.key === key;
}

/**
 * Opt-in cell wrapper: plain display when editing is off; double-click /
 * Enter / F2 to activate; kit supplies the editor via `renderEditor`.
 *
 * When `editing` is omitted this is a pure pass-through of `display` —
 * zero DOM / behavior change for tables that never opted into cell edit.
 *
 * @public
 */
export interface EditableCellGateProps<TRow> {
  readonly editing: EditableCellEditing<TRow> | undefined;
  readonly row: TRow;
  readonly column: ColumnDef<TRow>;
  readonly rowId: string;
  readonly rows: readonly TRow[];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly rowKey: (row: TRow) => string;
  /** Accessible name for the activate control. */
  readonly editLabel: string;
  /** Optional class for the activate button (adapters' styling hook). */
  readonly activateClassName?: string;
  /** Optional class for the validation message (adapters' styling hook). */
  readonly errorClassName?: string;
  /** Optional class for a failed save's message. */
  readonly saveErrorClassName?: string;
  /** Optional class for the undo control beside it. */
  readonly rollbackClassName?: string;
  /**
   * Label for the undo control a failed save offers (`labels.undoEdit`). Omit
   * it and the message shows without one — right for a table that refetches
   * rather than rolling back.
   */
  readonly undoLabel?: string;
  /**
   * Set by a kit whose own input renders the message — Mantine's `error`, MUI's
   * `helperText`. Those components own the input's `aria-describedby`, so a
   * second copy of the text would be both duplicated in the DOM and announced
   * twice. The gate then renders no message of its own and leaves the ARIA to
   * the kit.
   */
  readonly kitRendersError?: boolean;
  readonly display: ReactNode;
  /**
   * Kit-native editor. Only called while this cell is the active edit.
   * Wire `value`/`onChange`/`onKeyDown`/`onBlur` from the controller.
   */
  readonly renderEditor: (ctrl: EditableCellEditorCtrl) => ReactElement;
  /** Kit activate control and conflict / undo buttons. */
  readonly slots: EditableCellSlots;
}

/** Kit activate control the gate calls while the cell is idle. */
export interface EditableCellActivateProps {
  readonly title: string;
  readonly className?: string;
  readonly saveStatus: string | undefined;
  readonly dirty: boolean;
  readonly activateRef: (node: HTMLButtonElement | null) => void;
  readonly display: ReactNode;
  readonly onDoubleClick: (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => void;
  readonly onClick: (event: { stopPropagation: () => void }) => void;
  readonly onKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => void;
}

/** Kit button the gate calls for conflict choices and undo. */
export interface EditableCellButtonProps {
  readonly label: string;
  readonly part: string;
  readonly className?: string;
  readonly onMouseDown?: (event: { preventDefault: () => void }) => void;
  readonly onClick: (event: { stopPropagation: () => void }) => void;
}

/** Adapter-supplied controls for `EditableCellGate`. */
export interface EditableCellSlots {
  readonly Activate: (props: EditableCellActivateProps) => ReactNode;
  readonly Button: (props: EditableCellButtonProps) => ReactNode;
}

/**
 * Keep an editor's own keys out of the table's key handler.
 *
 * Enter, Escape and Tab all mean something to BOTH an open editor and the grid
 * around it: the editor commits, cancels or moves to the next field, and the
 * table would also move focus or leave edit mode on the same press. The editor
 * is the one the user is typing in, so it wins — and the table never sees it.
 *
 * Structural event on purpose, so this stays usable from any framework's
 * handler and from a plain listener.
 *
 * @public
 */
export function stopEditKeys(
  event: Readonly<{ key: string; stopPropagation: () => void }>
): void {
  if (event.key === "Enter" || event.key === "Escape" || event.key === "Tab") {
    event.stopPropagation();
  }
}

/**
 * The ARIA a kit's editor needs when validation is in play.
 *
 * Spread onto the input or select: invalid marks the field, `describedby`
 * points at the message so it is read WITH the field rather than announced
 * once and lost, and busy says an async check is still deciding.
 *
 * @param ctrl - The editor controller the gate handed the kit.
 * @returns Attributes to spread; empty while the value is fine.
 *
 * @public
 */
export function editorValidationProps(ctrl: EditableCellEditorCtrl): {
  "aria-invalid"?: true;
  "aria-describedby"?: string;
  "aria-busy"?: true;
  "data-conflict"?: "";
} {
  return {
    "aria-invalid": ctrl.error === undefined ? undefined : true,
    "aria-describedby": ctrl.error === undefined ? undefined : ctrl.errorId,
    "aria-busy": ctrl.validating ? true : undefined,
    "data-conflict": ctrl.conflict === true ? "" : undefined,
  };
}

/**
 * Busy and conflict marks, for a kit whose own input owns `aria-invalid`
 * (Mantine, MUI). `data-conflict` still belongs on the field so the same
 * selector works on every kit; `aria-describedby` points at the notice
 * while one is up.
 *
 * @param ctrl - The editor controller the gate handed the kit.
 * @returns Attributes to spread; empty unless a check is running or a
 *   conflict is being asked.
 *
 * @public
 */
export function editorBusyProps(ctrl: EditableCellEditorCtrl): {
  "aria-busy"?: true;
  "aria-describedby"?: string;
  "data-conflict"?: "";
} {
  const describedBy =
    ctrl.conflict === true ? { "aria-describedby": ctrl.errorId } : {};
  return {
    "aria-busy": ctrl.validating ? true : undefined,
    ...describedBy,
    "data-conflict": ctrl.conflict === true ? "" : undefined,
  };
}

/** Keep mine / Take theirs — same channel as a validation message. */
function ConflictNotice(
  props: Readonly<{
    ctrl: ReturnType<typeof editableCellController>;
    errorId: string;
    errorClassName?: string;
    slots: EditableCellSlots;
  }>
): ReactElement | null {
  "use no memo";
  const { ctrl, errorId, errorClassName, slots } = props;
  const Button = slots.Button;
  if (ctrl.conflict === undefined || ctrl.conflictLabels === undefined) {
    return null;
  }
  const holdFocus = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };
  return (
    <span
      id={errorId}
      role="alert"
      data-adapttable-part="edit-cell-conflict"
      data-conflict=""
      className={errorClassName}
    >
      {ctrl.conflictLabels.message}
      <span data-adapttable-part="edit-cell-incoming">
        {ctrl.conflictLabels.theirsValue(ctrl.conflict.incomingValue)}
      </span>
      <Button
        label={ctrl.conflictLabels.keepMine}
        part="edit-cell-keep-mine"
        onMouseDown={holdFocus}
        onClick={(event) => {
          event.stopPropagation();
          ctrl.keepConflict();
        }}
      />
      <Button
        label={ctrl.conflictLabels.takeTheirs}
        part="edit-cell-take-theirs"
        onMouseDown={holdFocus}
        onClick={(event) => {
          event.stopPropagation();
          ctrl.takeConflict();
        }}
      />
    </span>
  );
}

/**
 * Toggle a checkbox editor and commit in the same gesture.
 *
 * A checkbox has one gesture, so waiting for Enter or a blur would leave the
 * reader looking at a ticked box that has changed nothing. Safe to call
 * synchronously: the editing state writes its draft ref in the same tick, so the
 * commit that follows sees the new value.
 *
 * @param ctrl - The editor controller the gate handed the kit.
 * @param checked - The box's new state.
 *
 * @public
 */
export function commitBooleanDraft(
  ctrl: EditableCellEditorCtrl,
  checked: boolean
): void {
  ctrl.setDraft(booleanDraft(checked));
  ctrl.commitOnBlur();
}

/**
 * The draft for a native `<select multiple>`'s current selection.
 *
 * @param select - The select element.
 * @returns The draft string the editing state holds.
 *
 * @public
 */
export function multiDraftFromSelect(select: HTMLSelectElement): string {
  return formatMultiDraft(
    [...select.selectedOptions].map((option) => option.value)
  );
}

/**
 * Opt out of the React Compiler: early returns swap trees of different memo sizes.
 *
 * @public
 */
export function EditableCellGate<TRow>(
  props: EditableCellGateProps<TRow>
): ReactElement {
  "use no memo";
  const activateRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const ctrl = editableCellController({
    editing: props.editing,
    row: props.row,
    column: props.column,
    rowId: props.rowId,
    rows: props.rows,
    columns: props.columns,
    rowKey: props.rowKey,
  });

  useLayoutEffect(() => {
    if (!restoreFocusRef.current || ctrl.mode !== "activatable") return;
    restoreFocusRef.current = false;
    activateRef.current?.focus();
  });

  // A batch turns every editable cell into a field: the reader is walking a
  // list correcting values, and opening each cell first is the friction the
  // mode exists to remove.
  const batch = props.editing?.batch;
  if (batch) {
    return (
      <BatchEditCell
        batch={batch}
        row={props.row}
        rowId={props.rowId}
        column={props.column}
        display={<>{props.display}</>}
        editLabel={props.editLabel}
        renderEditor={props.renderEditor}
      />
    );
  }

  // A row being edited as one unit owns every cell in it: the per-cell activate
  // control would be a second way to start an edit that is already open.
  const rowEditing = props.editing?.rowEditing;
  if (rowEditing?.isEditing(props.rowId) === true) {
    return (
      <RowEditCell
        rowEditing={rowEditing}
        column={props.column}
        display={<>{props.display}</>}
        editLabel={props.editLabel}
        takesFocus={isFirstEditableColumn(props.columns, props.column.key)}
        renderEditor={props.renderEditor}
      />
    );
  }

  if (ctrl.mode === "display") {
    return <>{props.display}</>;
  }

  const errorId = `adapttable-edit-error-${props.rowId}-${props.column.key}`;

  /** Hand the reader's keys to the table, and focus back to the cell after. */
  const onEditorKeyDown = (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => {
    // Escape cancels, Enter commits — BOTH must hand keyboard focus
    // back to the activate button, or it falls to <body>. (Tab moves
    // to the next editable cell, which manages its own focus.)
    if (event.key === "Escape" || event.key === "Enter") {
      restoreFocusRef.current = true;
    }
    ctrl.onEditorKeyDown(event);
  };

  // A column that brought its own component renders it here rather than in each
  // kit: activation, focus, the keyboard flow, validation and the commit are
  // all the table's either way, so nine copies of this branch would differ only
  // in which file they sat in.
  if (ctrl.mode === "editing" && isCustomEditor(ctrl.editor)) {
    const custom = ctrl.editor.render({
      draft: ctrl.draft,
      setDraft: ctrl.setDraft,
      commit: () => {
        restoreFocusRef.current = true;
        ctrl.commit();
      },
      cancel: () => {
        restoreFocusRef.current = true;
        ctrl.cancel();
      },
      onKeyDown: onEditorKeyDown,
      onBlur: ctrl.commitOnBlur,
      focusRef: focusEditorOnMount,
      label: props.editLabel,
      error: ctrl.error,
      validating: ctrl.validating,
      errorId,
    });
    return (
      <>
        {custom}
        <ConflictNotice
          ctrl={ctrl}
          errorId={errorId}
          errorClassName={props.errorClassName}
          slots={props.slots}
        />
        {/* A kit that renders its own message does so through its own input,
            and a custom editor has none — so the message is always the gate's
            here, whatever the kit does for the built-in editors. */}
        {ctrl.conflict === undefined && ctrl.error !== undefined && (
          <span
            id={errorId}
            role="alert"
            data-adapttable-part="edit-cell-error"
            className={props.errorClassName}
          >
            {ctrl.error}
          </span>
        )}
      </>
    );
  }

  if (ctrl.mode === "editing" && ctrl.editor) {
    return (
      <>
        {props.renderEditor({
          draft: ctrl.draft,
          setDraft: ctrl.setDraft,
          onEditorKeyDown,
          commitOnBlur: ctrl.commitOnBlur,
          editor: ctrl.editor,
          selectOptions: ctrl.selectOptions,
          error: ctrl.error,
          validating: ctrl.validating,
          errorId,
          conflict: ctrl.conflict !== undefined,
          // One cell, so this editor is what takes focus.
          focusRef: focusEditorOnMount,
        })}
        <ConflictNotice
          ctrl={ctrl}
          errorId={errorId}
          errorClassName={props.errorClassName}
          slots={props.slots}
        />
        {/* The message is in the DOM whatever the kit does with `error`, and
            it is a live region so it is heard the moment it appears — a
            rejected commit that only paints red says nothing to a reader who
            cannot see it. A conflict uses the same channel, so this span stays
            off while that notice is up. */}
        {ctrl.conflict === undefined &&
          ctrl.error !== undefined &&
          props.kitRendersError !== true && (
            <span
              id={errorId}
              role="alert"
              data-adapttable-part="edit-cell-error"
              className={props.errorClassName}
            >
              {ctrl.error}
            </span>
          )}
      </>
    );
  }

  const Activate = props.slots.Activate;
  const Button = props.slots.Button;
  return (
    <>
      <Activate
        title={props.editLabel}
        className={props.activateClassName}
        saveStatus={ctrl.saveStatus}
        dirty={ctrl.isDirty}
        activateRef={(node) => {
          activateRef.current = node;
        }}
        display={props.display}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          ctrl.begin();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "F2") {
            event.preventDefault();
            stopCellEditKeyboard(event);
            ctrl.begin();
          }
        }}
      />
      {ctrl.saveFailure && (
        <span
          role="alert"
          data-adapttable-part="edit-cell-save-error"
          className={props.saveErrorClassName}
        >
          {ctrl.saveFailure.message}
          {ctrl.canRollback && props.undoLabel !== undefined ? (
            <Button
              label={props.undoLabel}
              part="edit-cell-rollback"
              className={props.rollbackClassName}
              onClick={(event) => {
                event.stopPropagation();
                ctrl.rollback();
              }}
            />
          ) : null}
        </span>
      )}
    </>
  );
}
