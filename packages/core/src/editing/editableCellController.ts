import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import type { FeatureHostState } from "../features/currentHost";
import type { ColumnDef } from "../types";
import type { BatchEditingState } from "./batchEditing";
import {
  type CellEditCommit,
  type CellEditor,
  type EditableColumnLike,
  isCellEditable,
  isMultiSelectEditor,
  isSelectEditor,
  normalizeEditorOptions,
  readEditableCellValue,
  resolveCellEditor,
  resolveCommitValue,
} from "./cellEditing";
import type { DirtyCellState } from "./dirtyCells";
import type { EditConflict, EditConflictState } from "./editConflict";
import type { EditLifecycle } from "./editingEvents";
import { observeEdit } from "./editingEvents";
import type { RowEditingState } from "./rowEditing";
import type {
  CellSaveState,
  CellSaveStatus,
  FailedCellSave,
} from "./saveState";
import {
  beginCellEdit as beginEdit,
  type CellEditingState,
} from "./useCellEditing";
import type { CellValidator, EditValidationState } from "./validation";

/**
 * Opt-in editing bundle from {@link TableChrome.editing}.
 *
 * @public
 */
export interface EditableCellEditing<TRow> {
  /**
   * The per-cell change channel. Return a promise and the cell shows it is
   * saving until that promise settles, and shows why if it rejects.
   *
   * Absent when the host wants row-level commits only: the bundle still exists
   * (row mode needs it) and every cell stays display-only until a reader opens
   * the row.
   */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
  /** Current editing state. */
  state: CellEditingState;
  /**
   * Validation, when the host declared any. A commit runs the validators first
   * and is dropped if one rejects — the editor stays open with the message on
   * it, so the reader fixes what they typed instead of losing it.
   */
  validation?: EditValidationState<TRow>;
  /**
   * Save state, when the host's `onCellEdit` returns promises. Inert for a
   * host that saves synchronously.
   */
  saving?: CellSaveState<TRow>;
  /** Dirty marks, when the host asked for them (`dirtyIndicators`). */
  dirty?: DirtyCellState;
  /**
   * Row-mode state, when the host armed it. While a row is open its cells render
   * row editors instead of the per-cell activate control.
   */
  rowEditing?: RowEditingState<TRow>;
  /**
   * Batch state, when the host armed it. Every editable cell renders a field
   * and nothing reaches the host until the reader saves them all.
   */
  batch?: BatchEditingState<TRow>;
  /** Lifecycle observers — fire from the same place the transition happens. */
  lifecycle?: EditLifecycle<TRow>;
  /** Live-update conflict for the open editor, when one is being asked about. */
  conflict?: EditConflictState<TRow>;
  /** Labels for the conflict notice — already resolved. */
  conflictLabels?: {
    message: string;
    keepMine: string;
    takeTheirs: string;
    theirsValue: (value: string) => string;
  };
  /** The host of THIS table — plugin editors resolve from here. */
  featureHost?: FeatureHostState;
}

/**
 * Display / edit mode for one cell.
 *
 * @public
 */
export type EditableCellMode = "display" | "activatable" | "editing";

/**
 * Controller returned by `editableCellController`.
 *
 * @public
 */
export interface EditableCellController<TRow = unknown> {
  /** Which editing mode is active. */
  mode: EditableCellMode;
  /** The validator's message for this cell, if it rejected the last commit. */
  error?: string;
  /** Whether an async validator is still deciding about this cell. */
  validating: boolean;
  /** What this cell's last save is doing: in flight, or failed. */
  saveStatus?: CellSaveStatus;
  /** Why this cell's last save failed, and what it takes to undo it. */
  saveFailure?: FailedCellSave<TRow>;
  /** Whether this cell holds a change nobody has confirmed yet. */
  isDirty: boolean;
  /** Whether an undo can be offered — the host said how to perform one. */
  canRollback: boolean;
  /** Put the previous value back after a failed save. */
  rollback: () => void;
  /** Forget a failed save without restoring anything. */
  dismissFailure: () => void;
  /** Resolved editor when the column is editable; always set for activatable/editing. */
  editor: CellEditor | null;
  /** Normalized select options (empty for text/number). */
  selectOptions: ReturnType<typeof normalizeEditorOptions>;
  /** The value being edited, as text. */
  draft: string;
  /** Opens the editor. */
  begin: () => void;
  /** Replaces the draft. */
  setDraft: (value: string) => void;
  /** Commit the draft now, without waiting for Enter or a blur. */
  commit: () => void;
  /** Abandon the draft, exactly as Escape does. */
  cancel: () => void;
  /** Wire to the editor's keydown — Enter/Tab/Escape. */
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  /** Commit on blur (click-away). No-op when not editing. */
  commitOnBlur: () => void;
  /**
   * A live row changed under this editor. Present only while the policy is
   * asking; Keep mine / Take theirs resolve it.
   */
  conflict?: EditConflict<TRow>;
  /** Labels for the conflict notice. */
  conflictLabels?: {
    message: string;
    keepMine: string;
    takeTheirs: string;
    theirsValue: (value: string) => string;
  };
  /** Keep the draft. */
  keepConflict: () => void;
  /** Take the incoming value. */
  takeConflict: () => void;
}

/**
 * Derive the per-cell editing controller. When `editing` is omitted (host
 * did not pass `onCellEdit`), always returns `mode: "display"` — zero UI
 * change for tables that never opted in.
 */
export function editableCellController<TRow>(options: {
  editing: EditableCellEditing<TRow> | undefined;
  row: TRow;
  column: ColumnDef<TRow>;
  rowId: string;
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  rowKey: (row: TRow) => string;
}): EditableCellController {
  const { editing, row, column, rowId, rows, columns, rowKey } = options;

  const idle: EditableCellController<TRow> = {
    mode: "display",
    validating: false,
    isDirty: false,
    canRollback: false,
    rollback: () => undefined,
    dismissFailure: () => undefined,
    editor: null,
    selectOptions: [],
    draft: "",
    begin: () => undefined,
    setDraft: () => undefined,
    commit: () => undefined,
    cancel: () => undefined,
    onEditorKeyDown: () => undefined,
    commitOnBlur: () => undefined,
    keepConflict: () => undefined,
    takeConflict: () => undefined,
  };

  // No per-cell channel means no per-cell editing, whatever else the bundle
  // carries: a cell that opened an editor with nowhere to send the value would
  // lose whatever the reader typed.
  if (!editing?.onCellEdit) return idle;
  const onCellEdit = editing.onCellEdit;

  const editor = resolveCellEditor(column, editing.featureHost);
  if (!editor || !isCellEditable(column, row)) return idle;

  // Both kinds of chooser carry options; only the number chosen differs.
  const selectOptions =
    isSelectEditor(editor) || isMultiSelectEditor(editor)
      ? normalizeEditorOptions(editor.options)
      : [];

  const { state, validation, saving, dirty } = editing;
  const isEditing = state.isActive(rowId, column.key);

  const validateCell = asCellValidator<TRow>(column);
  // Nothing validates this cell, so the commit stays exactly as synchronous as
  // it has always been. A microtask on every Tab, paid by every table, to
  // support validators most tables never declare, is not a trade worth making.
  const gated =
    validation !== undefined &&
    (validateCell !== undefined || validation.hasRowValidator);

  /**
   * Hand a resolved value to the host, and watch whatever it hands back: a
   * promise means the value is still on its way somewhere, which is something
   * the reader cannot see unless the cell says so.
   */
  const sendToHost = (resolved: {
    row: TRow;
    column: EditableColumnLike<TRow>;
    value: unknown;
  }) => {
    const result = onCellEdit(
      resolved.row,
      resolved.column.key,
      resolved.value
    );
    const columnKey = resolved.column.key;
    observeEdit(editing.lifecycle?.onEditCommit, {
      row: resolved.row,
      rowId,
      columnKey,
      value: resolved.value,
      previousValue: readEditableCellValue(resolved.row, resolved.column),
      unit: "cell",
    });
    // Changed, and not settled by anything the reader trusts yet.
    dirty?.mark(rowId, columnKey);
    if (!saving) return;
    void saving
      .track({
        rowId,
        columnKey,
        previous: resolved.row,
        attempted: resolved.value,
        previousValue: readEditableCellValue(resolved.row, resolved.column),
        result,
      })
      .then((saved) => {
        // The host agreeing is what settles a value, so the mark clears here and
        // nowhere else. A failed save keeps it: the value is still at risk until
        // the reader undoes it or tries again.
        if (saved) dirty?.confirm(rowId, columnKey);
      });
  };

  /** Send a commit straight through — the path for an ungated column. */
  const commitNow = (commit: CellEditCommit | null): boolean => {
    if (!commit) return false;
    const resolved = resolveCommitValue({ commit, rows, columns, rowKey });
    if (!resolved) return false;
    sendToHost(resolved);
    return true;
  };

  /**
   * Run the validators, then send the value if they allow it.
   *
   * Resolves to whether the host received it, so a Tab that advances can stop
   * short: moving on while this cell is rejected would put the cursor past the
   * message the reader needs to read.
   */
  const commitValidated = async (
    commit: CellEditCommit | null
  ): Promise<boolean> => {
    if (!commit || !validation) return false;
    const resolved = resolveCommitValue({ commit, rows, columns, rowKey });
    if (!resolved) return false;
    // Hold the reader in the editor while the check runs — a cell that closes
    // and reopens on a rejection loses the caret, and an async check would
    // leave nothing on screen to mark busy.
    beginEdit(state, resolved.row, resolved.column, rowKey);
    state.setDraft(commit.draft);
    const verdict = await validation.check({
      target: { rowId: commit.rowId, columnKey: commit.columnKey },
      value: resolved.value,
      row: resolved.row,
      validateCell,
    });
    // A rejection leaves the editor exactly where it is, message attached.
    // A superseded check (`allowed: false` with no `error`) is silence: a
    // newer draft owns the cell and this one must not speak for it.
    if (!verdict.allowed) {
      if (verdict.error !== undefined) {
        observeEdit(editing.lifecycle?.onValidationFail, {
          row: resolved.row,
          rowId: commit.rowId,
          columnKey: commit.columnKey,
          value: resolved.value,
          previousValue: readEditableCellValue(resolved.row, resolved.column),
          unit: "cell",
          error: verdict.error,
        });
      }
      return false;
    }
    // Allowed: close the editor, then hand the value over.
    state.close();
    sendToHost(resolved);
    return true;
  };

  const beginNext = (target: { rowId: string; columnKey: string } | null) => {
    if (!target) return;
    const nextRow = rows.find((r) => rowKey(r) === target.rowId);
    const nextCol = columns.find((c) => c.key === target.columnKey);
    if (!nextRow || !nextCol) return;
    beginEdit(state, nextRow, nextCol, rowKey);
  };

  const liveConflict = editing.conflict?.isConflict(rowId, column.key)
    ? (editing.conflict.current ?? undefined)
    : undefined;
  let validationError = validation?.errorFor(rowId, column.key);
  if (validationError === undefined && isEditing) {
    validationError = validation?.rowErrorFor(rowId);
  }

  return {
    mode: isEditing ? "editing" : "activatable",
    // A row-level message has no cell of its own, so it shows under the cell
    // the reader just edited — where they are looking. A live conflict uses
    // the same channel: the message is what `aria-describedby` points at.
    error: liveConflict ? editing.conflictLabels?.message : validationError,
    validating: validation?.isValidating(rowId, column.key) ?? false,
    saveStatus: saving?.statusFor(rowId, column.key),
    saveFailure: saving?.failureFor(rowId, column.key),
    isDirty: dirty?.isDirty(rowId, column.key) ?? false,
    canRollback: saving?.canRollback ?? false,
    rollback: () => {
      saving?.rollback(rowId, column.key);
      // The value the reader typed is gone, so nothing is waiting on it.
      dirty?.confirm(rowId, column.key);
    },
    dismissFailure: () => {
      saving?.clear(rowId, column.key);
    },
    editor,
    selectOptions,
    draft: isEditing ? state.draft : "",
    begin: () => {
      beginEdit(state, row, column, rowKey);
    },
    setDraft: state.setDraft,
    commit: () => {
      if (!state.isActive(rowId, column.key)) return;
      if (editing.conflict?.isConflict(rowId, column.key)) return;
      const pending = state.commit();
      if (gated) void commitValidated(pending);
      else commitNow(pending);
    },
    cancel: () => {
      validation?.clear(rowId, column.key);
      state.cancel();
    },
    onEditorKeyDown: (event) => {
      // Enter / Tab would commit through the state machine, which does not
      // know about the ask. Hold them until the reader chooses; Escape still
      // throws the draft away.
      if (
        editing.conflict?.isConflict(rowId, column.key) &&
        (event.key === "Enter" || event.key === "Tab")
      ) {
        event.preventDefault();
        return;
      }
      const outcome = state.handleKeyDown(event, {
        rows,
        columns,
        rowKey: (r) => rowKey(r as TRow),
      });
      if (!outcome) return;
      if (outcome.action === "cancel") {
        validation?.clear(rowId, column.key);
        return;
      }
      const advance = () => {
        if (outcome.action === "commit-advance")
          beginNext(outcome.advanceTarget);
      };
      if (!gated) {
        if (commitNow(outcome.commit)) advance();
        return;
      }
      void commitValidated(outcome.commit).then((committed) => {
        if (committed) advance();
      });
    },
    commitOnBlur: () => {
      if (!state.isActive(rowId, column.key)) return;
      if (editing.conflict?.isConflict(rowId, column.key)) return;
      const commit = state.commit();
      if (gated) void commitValidated(commit);
      else commitNow(commit);
    },
    conflict: liveConflict,
    conflictLabels: liveConflict ? editing.conflictLabels : undefined,
    keepConflict: () => {
      editing.conflict?.keep();
    },
    takeConflict: () => {
      editing.conflict?.take();
    },
  };
}

/**
 * A column's own validator, if it declared one.
 *
 * Read off the column rather than passed in, so a validator lives beside the
 * `editor` and `parseValue` that produce the value it judges.
 */
function asCellValidator<TRow>(column: {
  validate?: (
    value: unknown,
    row: TRow
  ) => string | undefined | Promise<string | undefined>;
}): CellValidator<TRow> | undefined {
  return column.validate;
}

/** Convenience: stop React keyboard events from bubbling to row click. */
export function stopCellEditKeyboard(
  event: Pick<ReactKeyboardEvent, "stopPropagation">
): void {
  event.stopPropagation();
}

/**
 * Attach as a `ref` (or kit `inputRef`) so the editor receives focus when the
 * cell enters edit mode — replaces the `autoFocus` attribute (axe/a11y).
 * Accepts DOM nodes and kit refs that expose `.focus()` (e.g. antd InputRef).
 *
 * @public
 */
export function focusEditorOnMount(node: { focus: () => void } | null): void {
  node?.focus();
}

/**
 * Whether any cell in a row holds a change nobody has confirmed.
 *
 * Read by every adapter's row so the mark exists at both scales: a reader
 * scanning a long table sees which rows are unsettled without hunting for the
 * cell inside them.
 *
 * @typeParam TRow - The row type.
 * @param editing - The editing bundle from the chrome.
 * @param rowId - The row's stable id.
 * @returns Whether to mark the row.
 *
 * @public
 */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return editing?.dirty?.isRowDirty(rowId) ?? false;
}

/**
 * Memo digest for one desktop/card row: `null` when editing is off (host
 * never passed `onCellEdit`); empty string when this row is idle; otherwise
 * `columnKey:draft` so only the active edit row re-renders on keystrokes.
 *
 * @public
 */
export function rowEditingSignature<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): string | null {
  if (!editing) return null;
  const { active, draft } = editing.state;
  // A validation message belongs to a ROW that may not hold the active editor:
  // a cross-field rule marks the cell it points at, and that row has to repaint
  // to show it. Left out, a rejected commit paints nothing.
  const marked = editing.validation?.rowHasError(rowId) ?? false;
  const busy = editing.validation?.isValidating(rowId, active?.columnKey ?? "");
  // A save is in flight or has failed on a cell of this row, which may hold no
  // editor at all by then — the reader closed it and moved on.
  const save = editing.saving?.signature ?? "";
  const rowSave = save.includes(`${rowId} `) ? save : "";
  // A dirty mark belongs to the row too, and outlives the editor that made it.
  const marks = editing.dirty?.signature ?? "";
  const rowMarks = marks.includes(`${rowId} `) ? marks : "";
  // Row mode replaces every cell in the open row with an editor, so the row it
  // belongs to has to repaint — including on every keystroke in any field.
  const rowMode = editing.rowEditing;
  const rowDrafts =
    rowMode?.activeRowId === rowId ? (rowMode.signature ?? "") : "";
  // A batch holds drafts for many rows at once, so each row watches its own
  // slice of the digest — without it a typed cell never repaints.
  const batchAll = editing.batch?.signature ?? "";
  const batchRow =
    batchAll.split(";").find((entry) => entry.startsWith(`${rowId}:`)) ?? "";
  // A live conflict is asked on the open editor. Left out, the row memo
  // sees the same draft and never paints Keep mine / Take theirs.
  const live = editing.conflict?.current;
  const conflictMark =
    live?.rowId === rowId
      ? `conflict:${live.columnKey}:${live.incomingValue}`
      : "";
  if (active?.rowId !== rowId) {
    const base = `${rowSave}${rowMarks}${rowDrafts}${batchRow}${conflictMark}`;
    return marked ? `invalid${base}` : base;
  }
  const message = editing.validation?.errorFor(rowId, active.columnKey) ?? "";
  return `${active.columnKey}:${draft}:${message}:${busy === true ? "1" : ""}${rowSave}${rowMarks}${rowDrafts}${batchRow}${conflictMark}`;
}
