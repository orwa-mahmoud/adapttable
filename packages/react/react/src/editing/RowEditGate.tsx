/**
 * A cell inside a row that is being edited as one unit, and the controls that
 * end that edit.
 *
 * Row mode reuses everything cell mode already has — the same editor set, the
 * same validation ARIA, the same custom-editor contract — so the only thing that
 * differs is where the draft lives and when it reaches the host. Both live here
 * rather than in nine adapters, because a second copy of "which editor does this
 * column want" is a second place for the answer to drift.
 */
import {
  batchEditBarModel,
  batchEditErrorId,
  customEditorConflict,
  type EditableColumnLike,
  editorSelectOptions,
  handleRowEditorKey,
  isCustomEditor,
  resolveCellEditor,
  rowEditActionsLayout,
  rowEditControls,
  rowEditErrorId,
  rowEditSaveBlocked,
} from "@adapttable/core";
import type {
  BatchEditBarProps,
  BatchEditBarSlots as NeutralBatchEditBarSlots,
  RowEditActionsProps,
  RowEditActionsSlots as NeutralRowEditActionsSlots,
} from "@adapttable/core/binding";
import type { ReactElement, ReactNode } from "react";

import type { BatchEditingState } from "./batchEditing";
import {
  type EditableCellEditing,
  focusEditorOnMount,
} from "./editableCellController";
import {
  type CellConflictAsk,
  CellConflictNotice,
  type EditableCellEditorCtrl,
  type EditableCellSlots,
} from "./EditableCellGate";
import type { RowEditingState } from "./rowEditing";

export type { BatchEditingState } from "./batchEditing";
export type { EditableCellEditorCtrl } from "./EditableCellGate";
export type { RowEditingState } from "./rowEditing";
export type { EditableColumnLike, TableLabels } from "@adapttable/core";
export {
  type RowEditConflict,
  type RowEditControls,
  rowEditControls,
  type RowEditControlsOptions,
} from "@adapttable/core";
export type {
  BatchEditBarProps,
  BatchEditButtonProps,
  RowEditActionsProps,
  RowEditButtonProps,
  RowEditIcons,
} from "@adapttable/core/binding";

/**
 * Adapter-supplied controls for {@link RowEditActionsChrome} —
 * `@adapttable/core`'s `RowEditActionsSlots` drawing React nodes.
 *
 * @public
 */
export type RowEditActionsSlots = NeutralRowEditActionsSlots<ReactNode>;

/**
 * Adapter-supplied controls for {@link BatchEditBarChrome} —
 * `@adapttable/core`'s `BatchEditBarSlots` drawing React nodes.
 *
 * @public
 */
export type BatchEditBarSlots = NeutralBatchEditBarSlots<ReactNode>;

/**
 * Props for {@link RowEditCell}.
 *
 * @public
 */
export interface RowEditCellProps<TRow> {
  /** The row-editing state from the chrome. */
  rowEditing: RowEditingState<TRow>;
  /** The column this cell belongs to. */
  column: EditableColumnLike<TRow>;
  /** The cell's display content, for a column that is not editable. */
  display: ReactElement | string | number | null;
  /** Accessible name for the editor (`labels.editCell`). */
  editLabel: string;
  /**
   * Whether this is the first editable column of the row, and so the field the
   * table hands focus to when the row opens. Every field calling focus on mount
   * would leave the reader at the last column of the row they just opened.
   *
   * Not the DOM's `autoFocus`: focus moves because a reader asked to edit this
   * row, which is the case the accessibility guidance carves out.
   */
  takesFocus: boolean;
  /**
   * Render the kit's own editor from a controller — the same callback shape the
   * cell gate uses, so a kit writes one editor and both modes use it.
   */
  renderEditor: (ctrl: EditableCellEditorCtrl) => ReactElement;
  /**
   * The incoming value waiting on this field, when the row changed underneath
   * the form and this is one of the fields that moved.
   */
  ask?: CellConflictAsk;
  /**
   * Whether any field of this row is waiting on an answer — not just this one.
   * Saving is the row's gesture, so it is the row's state that gates it: Enter
   * in an untouched field would otherwise write the draft of a field the
   * reader has not looked at.
   */
  rowAsking?: boolean;
  /** Labels for the notice — already resolved. */
  conflictLabels?: NonNullable<EditableCellEditing<never>["conflictLabels"]>;
  /** Class for the notice. */
  errorClassName?: string;
  /** The kit's components, for the notice's buttons. */
  slots?: EditableCellSlots;
}

/**
 * One cell of a row being edited: the kit's editor bound to the row's draft, or
 * the plain display when the column is not editable.
 *
 * @typeParam TRow - The row type.
 * @param props - See {@link RowEditCellProps}.
 * @returns The editor, or the display content.
 *
 * @public
 */
export function RowEditCell<TRow>({
  rowEditing,
  column,
  display,
  editLabel,
  takesFocus,
  renderEditor,
  ask,
  rowAsking,
  conflictLabels,
  errorClassName,
  slots,
}: Readonly<RowEditCellProps<TRow>>): ReactElement {
  const editor = resolveCellEditor(column, rowEditing.featureHost);
  if (!editor) return <>{display}</>;
  const focusRef = takesFocus ? focusEditorOnMount : () => undefined;
  const errorId = rowEditErrorId(column.key);
  // The row's question, not this field's: every route that saves the row is
  // gated by the same answer.
  const saveBlocked = rowEditSaveBlocked(ask, rowAsking);

  const ctrl: EditableCellEditorCtrl = {
    draft: rowEditing.draftFor(column.key),
    setDraft: (value) => {
      rowEditing.setDraft(column.key, value);
    },
    // Enter saves the whole row, Escape cancels it, and Enter holds while any
    // field of the row is waiting on an answer.
    onEditorKeyDown: (event) => {
      handleRowEditorKey(event, rowEditing, saveBlocked);
    },
    // Nothing commits on blur: the reader is moving between fields of one form.
    commitOnBlur: () => undefined,
    editor,
    selectOptions: editorSelectOptions(editor),
    validating: false,
    conflict: ask !== undefined,
    errorId,
    focusRef,
  };

  if (isCustomEditor(editor)) {
    return (
      <>
        {
          editor.render({
            draft: ctrl.draft,
            setDraft: ctrl.setDraft,
            commit: () => {
              if (!saveBlocked) rowEditing.save();
            },
            cancel: rowEditing.cancel,
            onKeyDown: ctrl.onEditorKeyDown,
            onBlur: ctrl.commitOnBlur,
            focusRef,
            label: editLabel,
            validating: false,
            errorId: ctrl.errorId,
            conflict: customEditorConflict(ask),
          }) as ReactElement
        }
        {slots ? (
          <CellConflictNotice
            ask={ask}
            labels={conflictLabels}
            errorId={errorId}
            errorClassName={errorClassName}
            slots={slots}
          />
        ) : null}
      </>
    );
  }
  return (
    <>
      {renderEditor(ctrl)}
      {slots ? (
        <CellConflictNotice
          ask={ask}
          labels={conflictLabels}
          errorId={errorId}
          errorClassName={errorClassName}
          slots={slots}
        />
      ) : null}
    </>
  );
}

/**
 * Props for {@link RowEditActionsChrome}.
 *
 * @public
 */
export interface RowEditActionsChromeProps<
  TRow,
> extends RowEditActionsProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: RowEditActionsSlots;
}

/**
 * The row's edit / save / cancel controls.
 *
 * Layout and the shared {@link rowEditControls} contract — adapters pass the
 * buttons the end user clicks. A kit with a strong opinion about its buttons
 * can still use {@link rowEditControls} directly instead.
 *
 * @typeParam TRow - The row type.
 * @param props - See {@link RowEditActionsChromeProps}.
 * @returns The controls for this row, or nothing when a host action owns the
 *   trigger and the row is not open.
 *
 * @public
 */
export function RowEditActionsChrome<TRow>({
  className,
  buttonClassName,
  showBegin,
  icons,
  conflict,
  slots,
  ...options
}: Readonly<RowEditActionsChromeProps<TRow>>): ReactElement | null {
  const controls = rowEditControls(options);
  const Button = slots.Button;
  // No save while an incoming change waits on the reader; nothing at all on a
  // closed row whose trigger a host action owns.
  const layout = rowEditActionsLayout(controls, conflict, showBegin);
  if (layout.kind === "none") return null;
  if (layout.kind === "begin") {
    return (
      <Button
        label={controls.editLabel}
        part="row-edit-begin"
        icon={icons?.begin}
        className={buttonClassName}
        onClick={(event) => {
          event.stopPropagation();
          controls.begin();
        }}
      />
    );
  }
  return (
    <span
      data-adapttable-part="row-edit-actions"
      className={className}
      style={{ display: "inline-flex", gap: 4 }}
    >
      {layout.showSave ? (
        <Button
          label={controls.saveLabel}
          part="row-edit-save"
          icon={icons?.save}
          className={buttonClassName}
          onClick={(event) => {
            event.stopPropagation();
            controls.save();
          }}
        />
      ) : null}
      <Button
        label={controls.cancelLabel}
        part="row-edit-cancel"
        icon={icons?.cancel}
        className={buttonClassName}
        onClick={(event) => {
          event.stopPropagation();
          controls.cancel();
        }}
      />
    </span>
  );
}

/**
 * Props for {@link BatchEditCell}.
 *
 * @public
 */
export interface BatchEditCellProps<TRow> {
  /** The batch state from the chrome. */
  batch: BatchEditingState<TRow>;
  /** The row this cell belongs to. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column this cell belongs to. */
  column: EditableColumnLike<TRow>;
  /** The cell's display content, for a column that is not editable. */
  display: ReactElement | string | number | null;
  /** Accessible name for the editor (`labels.editCell`). */
  editLabel: string;
  /** Render the kit's own editor from a controller. */
  renderEditor: (ctrl: EditableCellEditorCtrl) => ReactElement;
  /**
   * The incoming value waiting on this cell, when its stored value moved
   * under a draft the reader typed.
   */
  ask?: CellConflictAsk;
  /** Labels for the notice — already resolved. */
  conflictLabels?: NonNullable<EditableCellEditing<never>["conflictLabels"]>;
  /** Class for the notice. */
  errorClassName?: string;
  /** The kit's components, for the notice's buttons. */
  slots?: EditableCellSlots;
}

/**
 * One cell while a batch is being edited: always a field, never an activate
 * control.
 *
 * Batch mode's premise is that the reader is walking a list correcting values,
 * so making them open each cell first would be the friction the mode exists to
 * remove. A changed cell carries `data-changed`, which is how the reader finds
 * their way back to what they touched.
 *
 * @typeParam TRow - The row type.
 * @param props - See {@link BatchEditCellProps}.
 * @returns The field, or the display content.
 *
 * @public
 */
export function BatchEditCell<TRow>({
  batch,
  row,
  rowId,
  column,
  display,
  editLabel,
  renderEditor,
  ask,
  conflictLabels,
  errorClassName,
  slots,
}: Readonly<BatchEditCellProps<TRow>>): ReactElement {
  const editor = resolveCellEditor(column, batch.featureHost);
  if (!editor) return <>{display}</>;

  const ctrl: EditableCellEditorCtrl = {
    draft: batch.draftFor(row, rowId, column.key),
    setDraft: (value) => {
      batch.setDraft(row, rowId, column.key, value);
    },
    // No key ends a batch: the reader is moving through a list, and Enter would
    // send everything they have not finished.
    onEditorKeyDown: () => undefined,
    commitOnBlur: () => undefined,
    editor,
    selectOptions: editorSelectOptions(editor),
    validating: false,
    conflict: ask !== undefined,
    errorId: batchEditErrorId(rowId, column.key),
    // Nothing steals focus: every cell is a field, and the reader chose where
    // to start.
    focusRef: () => undefined,
  };

  if (isCustomEditor(editor)) {
    return (
      <span
        data-adapttable-part="batch-edit-cell"
        data-changed={batch.isChanged(rowId, column.key) ? "" : undefined}
      >
        {
          editor.render({
            draft: ctrl.draft,
            setDraft: ctrl.setDraft,
            commit: () => undefined,
            cancel: () => {
              batch.cancelRow(rowId);
            },
            onKeyDown: ctrl.onEditorKeyDown,
            onBlur: ctrl.commitOnBlur,
            focusRef: ctrl.focusRef,
            label: editLabel,
            validating: false,
            errorId: ctrl.errorId,
            conflict: customEditorConflict(ask),
          }) as ReactElement
        }
        {slots ? (
          <CellConflictNotice
            ask={ask}
            labels={conflictLabels}
            errorId={ctrl.errorId}
            errorClassName={errorClassName}
            slots={slots}
          />
        ) : null}
      </span>
    );
  }
  return (
    <span
      data-adapttable-part="batch-edit-cell"
      data-changed={batch.isChanged(rowId, column.key) ? "" : undefined}
    >
      {renderEditor(ctrl)}
      {slots ? (
        <CellConflictNotice
          ask={ask}
          labels={conflictLabels}
          errorId={ctrl.errorId}
          errorClassName={errorClassName}
          slots={slots}
        />
      ) : null}
    </span>
  );
}

/**
 * Props for {@link BatchEditBarChrome}.
 *
 * @public
 */
export interface BatchEditBarChromeProps<TRow> extends BatchEditBarProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: BatchEditBarSlots;
}

/**
 * The bar that ends a batch: how many rows are waiting, save all, cancel all.
 *
 * Rendered only while something is pending — a bar that is always there says
 * the table is in a mode, when what matters is that there are unsaved changes.
 *
 * @typeParam TRow - The row type.
 * @param props - See {@link BatchEditBarChromeProps}.
 * @returns The bar, or nothing.
 *
 * @public
 */
export function BatchEditBarChrome<TRow>({
  batch,
  contested,
  labels,
  className,
  buttonClassName,
  slots,
}: Readonly<BatchEditBarChromeProps<TRow>>): ReactElement | null {
  const model = batchEditBarModel(batch, contested, labels);
  if (!model) return null;
  const Button = slots.Button;
  return (
    <div
      data-adapttable-part="batch-edit-bar"
      className={className}
      style={{ display: "flex", alignItems: "center", gap: "0.5em" }}
    >
      <output data-adapttable-part="batch-edit-count">{model.count}</output>
      {model.conflictMessage !== undefined ? (
        <output data-adapttable-part="batch-edit-conflict">
          {model.conflictMessage}
        </output>
      ) : (
        <Button
          label={model.saveLabel}
          part="batch-edit-save"
          className={buttonClassName}
          onClick={batch.saveAll}
        />
      )}
      <Button
        label={model.cancelLabel}
        part="batch-edit-cancel"
        className={buttonClassName}
        onClick={batch.cancelAll}
      />
    </div>
  );
}
