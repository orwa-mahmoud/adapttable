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
import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";
import type { BatchEditingState } from "./batchEditing";
import {
  type CellEditor,
  type EditableColumnLike,
  isCustomEditor,
  normalizeEditorOptions,
  resolveCellEditor,
} from "./cellEditing";
import { focusEditorOnMount } from "./editableCellController";
import type { EditableCellEditorCtrl } from "./EditableCellGate";
import type { RowEditingState } from "./rowEditing";

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
}: Readonly<RowEditCellProps<TRow>>): ReactElement {
  const editor = resolveCellEditor(column, rowEditing.featureHost);
  if (!editor) return <>{display}</>;
  const focusRef = takesFocus ? focusEditorOnMount : () => undefined;

  const ctrl: EditableCellEditorCtrl = {
    draft: rowEditing.draftFor(column.key),
    setDraft: (value) => {
      rowEditing.setDraft(column.key, value);
    },
    // Enter saves the whole row, Escape cancels it: in row mode the unit is the
    // row, so a per-cell commit would be a different feature wearing this one's
    // keys.
    onEditorKeyDown: (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        rowEditing.save();
      } else if (event.key === "Escape") {
        event.preventDefault();
        rowEditing.cancel();
      }
    },
    // Nothing commits on blur: the reader is moving between fields of one form.
    commitOnBlur: () => undefined,
    editor,
    selectOptions: selectOptionsFor(editor),
    validating: false,
    errorId: `adapttable-row-edit-${column.key}`,
    focusRef,
  };

  if (isCustomEditor(editor)) {
    return editor.render({
      draft: ctrl.draft,
      setDraft: ctrl.setDraft,
      commit: rowEditing.save,
      cancel: rowEditing.cancel,
      onKeyDown: ctrl.onEditorKeyDown,
      onBlur: ctrl.commitOnBlur,
      focusRef,
      label: editLabel,
      validating: false,
      errorId: ctrl.errorId,
    });
  }
  return renderEditor(ctrl);
}

/** The options a chooser editor carries, normalized. */
function selectOptionsFor(editor: CellEditor) {
  if (
    typeof editor === "object" &&
    (editor.type === "select" || editor.type === "multi-select")
  ) {
    return normalizeEditorOptions(editor.options);
  }
  return [];
}

/**
 * Props for {@link rowEditControls}.
 *
 * @public
 */
export interface RowEditControlsOptions<TRow> {
  /** The row-editing state from the chrome. */
  rowEditing: RowEditingState<TRow>;
  /** The row this control set belongs to. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
}

/**
 * What a kit needs to render the row's edit / save / cancel controls.
 *
 * @public
 */
export interface RowEditControls {
  /** Whether this row is the one being edited. */
  editing: boolean;
  /** Open this row for editing. */
  begin: () => void;
  /** Hand the host everything that changed. */
  save: () => void;
  /** Throw the drafts away. */
  cancel: () => void;
  /** Accessible name for the control that opens the row. */
  editLabel: string;
  /** Accessible name for save. */
  saveLabel: string;
  /** Accessible name for cancel. */
  cancelLabel: string;
  /** Whether anything actually changed — a save with nothing to save is inert. */
  dirty: boolean;
}

/**
 * The row-mode controls, resolved.
 *
 * A helper rather than a component because each kit renders its own buttons —
 * what is shared is which ones exist, what they are called, and what they do.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link RowEditControlsOptions}.
 * @returns The controls to render.
 *
 * @public
 */
export function rowEditControls<TRow>({
  rowEditing,
  row,
  rowId,
  labels,
}: Readonly<RowEditControlsOptions<TRow>>): RowEditControls {
  return {
    editing: rowEditing.isEditing(rowId),
    begin: () => {
      rowEditing.begin(row, rowId);
    },
    save: rowEditing.save,
    cancel: rowEditing.cancel,
    editLabel: labels?.editRow ?? "Edit row",
    saveLabel: labels?.saveRow ?? "Save row",
    cancelLabel: labels?.cancel ?? "Cancel",
    dirty: rowEditing.isDirty,
  };
}

/**
 * Props for an adapter `RowEditActions` — no slots on the public API.
 *
 * @public
 */
export interface RowEditActionsProps<
  TRow,
> extends RowEditControlsOptions<TRow> {
  /** Class for the control group. */
  className?: string;
  /** Class for each button. */
  buttonClassName?: string;
}

/**
 * Kit button the row-edit chrome calls.
 *
 * @public
 */
export interface RowEditButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: (event: { stopPropagation: () => void }) => void;
}

/**
 * Adapter-supplied controls for {@link RowEditActionsChrome}.
 *
 * @public
 */
export interface RowEditActionsSlots {
  /** Renders a button. */
  readonly Button: (props: RowEditButtonProps) => ReactNode;
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
 * @returns The controls for this row.
 *
 * @public
 */
export function RowEditActionsChrome<TRow>({
  className,
  buttonClassName,
  slots,
  ...options
}: Readonly<RowEditActionsChromeProps<TRow>>): ReactElement {
  const controls = rowEditControls(options);
  const Button = slots.Button;
  if (!controls.editing) {
    return (
      <Button
        label={controls.editLabel}
        part="row-edit-begin"
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
      <Button
        label={controls.saveLabel}
        part="row-edit-save"
        className={buttonClassName}
        onClick={(event) => {
          event.stopPropagation();
          controls.save();
        }}
      />
      <Button
        label={controls.cancelLabel}
        part="row-edit-cancel"
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
    selectOptions: selectOptionsFor(editor),
    validating: false,
    errorId: `adapttable-batch-edit-${rowId}-${column.key}`,
    // Nothing steals focus: every cell is a field, and the reader chose where
    // to start.
    focusRef: () => undefined,
  };

  if (isCustomEditor(editor)) {
    return editor.render({
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
    });
  }
  return (
    <span
      data-adapttable-part="batch-edit-cell"
      data-changed={batch.isChanged(rowId, column.key) ? "" : undefined}
    >
      {renderEditor(ctrl)}
    </span>
  );
}

/**
 * Props for an adapter `BatchEditBar` — no slots on the public API.
 *
 * @public
 */
export interface BatchEditBarProps<TRow> {
  /** The batch state from the chrome. */
  batch: BatchEditingState<TRow>;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** Class for the bar. */
  className?: string;
  /** Class for each button. */
  buttonClassName?: string;
}

/**
 * Kit button the batch-edit bar calls.
 *
 * @public
 */
export interface BatchEditButtonProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Part name, so styling can target this element. */
  readonly part: string;
  /** Class for the element. */
  readonly className?: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Adapter-supplied controls for {@link BatchEditBarChrome}.
 *
 * @public
 */
export interface BatchEditBarSlots {
  /** Renders a button. */
  readonly Button: (props: BatchEditButtonProps) => ReactNode;
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
  labels,
  className,
  buttonClassName,
  slots,
}: Readonly<BatchEditBarChromeProps<TRow>>): ReactElement | null {
  if (!batch.pending) return null;
  const count = (labels?.pendingRows ?? defaultPendingRows)(batch.count);
  const Button = slots.Button;
  return (
    <div
      data-adapttable-part="batch-edit-bar"
      className={className}
      style={{ display: "flex", alignItems: "center", gap: "0.5em" }}
    >
      <output data-adapttable-part="batch-edit-count">{count}</output>
      <Button
        label={labels?.saveAll ?? "Save all"}
        part="batch-edit-save"
        className={buttonClassName}
        onClick={batch.saveAll}
      />
      <Button
        label={labels?.cancelAll ?? "Cancel all"}
        part="batch-edit-cancel"
        className={buttonClassName}
        onClick={batch.cancelAll}
      />
    </div>
  );
}

/** "3 unsaved rows" — replaceable through `labels.pendingRows`. */
function defaultPendingRows(count: number): string {
  return count === 1 ? "1 unsaved row" : `${String(count)} unsaved rows`;
}
