import {
  booleanDraft,
  type CellConflictAsk,
  cellConflictAsk,
  controllerConflictAsk,
  editableCellErrorId,
  editableCellPresentation,
  editorKeyRestoresFocus,
  formatMultiDraft,
  isCustomEditor,
  isEditActivateKey,
  isFirstEditableColumn,
} from "@adapttable/core";
import type {
  EditableCellActivateProps as NeutralEditableCellActivateProps,
  EditableCellSlots as NeutralEditableCellSlots,
} from "@adapttable/core/binding";
import {
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";

import type { ColumnDef } from "../columnDef";
import {
  editableCellController,
  type EditableCellEditing,
  focusEditorOnMount,
  stopCellEditKeyboard,
} from "./editableCellController";
import { EditingCellFrame } from "./EditingCellFrame";
import { BatchEditCell, RowEditCell } from "./RowEditGate";

export type { EditableCellButtonProps } from "@adapttable/core/binding";

/**
 * Kit activate control the gate calls while the cell is idle —
 * `@adapttable/core`'s `EditableCellActivateProps` with React's node.
 *
 * @public
 */
export type EditableCellActivateProps =
  NeutralEditableCellActivateProps<ReactNode>;

/**
 * Adapter-supplied controls for `EditableCellGate` — `@adapttable/core`'s
 * `EditableCellSlots` drawing React nodes.
 *
 * @public
 */
export type EditableCellSlots = NeutralEditableCellSlots<ReactNode>;

/**
 * Props for a kit-native editor while a cell is active.
 *
 * @public
 */
export interface EditableCellEditorCtrl {
  /** The value being edited, as text. */
  draft: string;
  /** Replaces the draft on every keystroke. */
  setDraft: (value: string) => void;
  /** Handles Enter, Escape and Tab for the editor. */
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  /** Commits the draft when focus leaves the editor. */
  commitOnBlur: () => void;
  /** The editor shape this column declared. */
  editor: NonNullable<ReturnType<typeof editableCellController>["editor"]>;
  /** Choices for a select editor, empty for other shapes. */
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
 * Opt-in cell wrapper: plain display when editing is off; double-click /
 * Enter / F2 to activate; kit supplies the editor via `renderEditor`.
 *
 * When `editing` is omitted this is a pure pass-through of `display` —
 * zero DOM / behavior change for tables that never opted into cell edit.
 *
 * @public
 */
export interface EditableCellGateProps<TRow> {
  /** Cell-editing state; the gate is a pass-through when absent. */
  readonly editing: EditableCellEditing<TRow> | undefined;
  /** The row being rendered. */
  readonly row: TRow;
  /** The column being rendered. */
  readonly column: ColumnDef<TRow>;
  /** Identity of the row being edited. */
  readonly rowId: string;
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** Visible columns, in order. */
  readonly columns: readonly ColumnDef<TRow>[];
  /** Row identity function. */
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
  /** What the cell shows when it is not being edited. */
  readonly display: ReactNode;
  /**
   * Kit-native editor. Only called while this cell is the active edit.
   * Wire `value`/`onChange`/`onKeyDown`/`onBlur` from the controller.
   */
  readonly renderEditor: (ctrl: EditableCellEditorCtrl) => ReactElement;
  /** Kit activate control and conflict / undo buttons. */
  readonly slots: EditableCellSlots;
}

export {
  type CellConflictAsk,
  editorBusyProps,
  editorValidationProps,
  stopEditKeys,
} from "@adapttable/core";

/**
 * Props for {@link CellConflictNotice}.
 *
 * @public
 */
export interface CellConflictNoticeProps {
  /** The question, or `undefined` when this cell is not being asked about. */
  readonly ask?: CellConflictAsk;
  /** Labels for the notice — already resolved. */
  readonly labels?: NonNullable<EditableCellEditing<never>["conflictLabels"]>;
  /** Id the editor points at with `aria-describedby`. */
  readonly errorId: string;
  /** Class for the notice. */
  readonly errorClassName?: string;
  /** The kit's components for each part. */
  readonly slots: EditableCellSlots;
}

/**
 * The notice one cell shows when its stored value moved under the editor.
 *
 * A cell and a row form ask the same question of the same field, so they draw
 * the same notice — a row that changed underneath marks every field that
 * moved, rather than one strip standing in for all of them.
 *
 * @param props - See {@link CellConflictNoticeProps}.
 * @returns The notice, or nothing.
 *
 * @public
 */
export function CellConflictNotice({
  ask,
  labels,
  errorId,
  errorClassName,
  slots,
}: Readonly<CellConflictNoticeProps>): ReactElement | null {
  "use no memo";
  const Button = slots.Button;
  if (!ask || !labels) return null;
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
      <span data-adapttable-part="edit-cell-conflict-message">
        {labels.message}
      </span>
      {"\n"}
      <span
        data-adapttable-part="edit-cell-incoming"
        style={{ display: "block" }}
      >
        {labels.theirsValue(ask.incomingValue)}
      </span>
      <Button
        label={labels.keepMine}
        part="edit-cell-keep-mine"
        onMouseDown={holdFocus}
        onClick={(event) => {
          event.stopPropagation();
          ask.keep();
        }}
      />
      <Button
        label={labels.takeTheirs}
        part="edit-cell-take-theirs"
        onMouseDown={holdFocus}
        onClick={(event) => {
          event.stopPropagation();
          ask.take();
        }}
      />
    </span>
  );
}

/** Receives a gesture or a ref and does nothing with it. */
function ignore(): void {
  // The held idle control answers nothing; the editor above it does.
}

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
  return (
    <CellConflictNotice
      ask={controllerConflictAsk(ctrl)}
      labels={ctrl.conflictLabels}
      errorId={errorId}
      errorClassName={errorClassName}
      slots={slots}
    />
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

  // Which unit owns this cell — a batch, then an open row form, then the
  // cell's own controller.
  const presentation = editableCellPresentation(
    props.editing,
    props.rowId,
    ctrl
  );
  const batch = props.editing?.batch;
  if (presentation === "batch" && batch) {
    return (
      <BatchEditCell
        batch={batch}
        row={props.row}
        rowId={props.rowId}
        column={props.column}
        display={<>{props.display}</>}
        editLabel={props.editLabel}
        renderEditor={props.renderEditor}
        ask={cellConflictAsk(props.editing, props.rowId, props.column.key)}
        conflictLabels={props.editing?.conflictLabels}
        errorClassName={props.errorClassName}
        slots={props.slots}
      />
    );
  }

  const rowEditing = props.editing?.rowEditing;
  if (presentation === "row" && rowEditing) {
    return (
      <RowEditCell
        rowEditing={rowEditing}
        column={props.column}
        display={<>{props.display}</>}
        editLabel={props.editLabel}
        takesFocus={isFirstEditableColumn(props.columns, props.column.key)}
        renderEditor={props.renderEditor}
        ask={cellConflictAsk(props.editing, props.rowId, props.column.key)}
        rowAsking={props.editing?.conflict?.isRowContested(props.rowId)}
        conflictLabels={props.editing?.conflictLabels}
        errorClassName={props.errorClassName}
        slots={props.slots}
      />
    );
  }

  if (presentation === "display") {
    return <>{props.display}</>;
  }

  const errorId = editableCellErrorId(props.rowId, props.column.key);

  /** Hand the reader's keys to the table, and focus back to the cell after. */
  const onEditorKeyDown = (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => {
    // Escape cancels, Enter commits — BOTH must hand keyboard focus
    // back to the activate button, or it falls to <body>. (Tab moves
    // to the next editable cell, which manages its own focus.)
    if (editorKeyRestoresFocus(event.key)) {
      restoreFocusRef.current = true;
    }
    ctrl.onEditorKeyDown(event);
  };

  // The idle cell as the kit draws it, held under the editor for its size
  // alone: no ref, and no gesture reaches it.
  const IdleActivate = props.slots.Activate;
  const idle = (
    <IdleActivate
      title={props.editLabel}
      className={props.activateClassName}
      saveStatus={ctrl.saveStatus}
      dirty={ctrl.isDirty}
      activateRef={ignore}
      display={props.display}
      onDoubleClick={ignore}
      onClick={ignore}
      onKeyDown={ignore}
    />
  );

  // A column that brought its own component renders it here rather than in each
  // kit: activation, focus, the keyboard flow, validation and the commit are
  // all the table's either way, so nine copies of this branch would differ only
  // in which file they sat in.
  if (presentation === "custom-editor" && isCustomEditor(ctrl.editor)) {
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
      conflict: controllerConflictAsk(ctrl),
    });
    return (
      <EditingCellFrame display={idle}>
        <>{custom}</>
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
      </EditingCellFrame>
    );
  }

  if (presentation === "editor" && ctrl.editor) {
    return (
      <EditingCellFrame display={idle}>
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
      </EditingCellFrame>
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
          if (props.editing?.activation === "click") ctrl.begin();
        }}
        onKeyDown={(event) => {
          if (isEditActivateKey(event.key)) {
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
