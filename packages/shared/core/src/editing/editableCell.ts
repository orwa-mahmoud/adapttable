/**
 * One editable cell: the state every editing unit hands it, and the pipeline
 * that runs when the reader commits — validation, the hold while an async
 * check decides, the stale-result guard, the send to the host, the dirty mark
 * and the save it watches, and the step to the next cell.
 *
 * A binding builds the bundle from the stores in this folder and calls
 * {@link editableCellController} per cell; it renders what the controller
 * returns and wires its handlers. Nothing here renders.
 */
import type { FeatureHostState } from "../features/currentHost";
import type { BatchEditingState } from "./batchEditing";
import {
  type CellEditCommit,
  type CellEditor,
  type CellEditTarget,
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
import type { EditConflictState } from "./editConflict";
import type {
  CellValidator,
  EditConflict,
  EditLifecycle,
  ValidationTarget,
} from "./editContracts";
import {
  type CellEditKeyOutcome,
  type CellEditNavigation,
  type CellEditSession,
  type CellEditSnapshot,
  cellSaveFailure,
  cellSaveSignature,
  type CellSaveSnapshot,
  type CellSaveStatus,
  cellSaveStatus,
  type CellSaveStore,
  type EditValidationSnapshot,
  type EditValidationStore,
  type FailedCellSave,
  isCellEditActive,
  observeEdit,
  rowHasValidationError,
  type ValidationCheckResult,
  validationErrorFor,
  validationKey,
  validationSignature,
} from "./editingController";
import type { RowEditingState } from "./rowEditing";

/* ── The state each store hands a cell ─────────────────────────────── */

/**
 * Headless cell-editing state: one active cell, its draft, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * @public
 */
export interface CellEditingState {
  /** The cell currently being edited, or `null` when idle. */
  active: CellEditTarget | null;
  /** Live draft string for the active editor. */
  draft: string;
  /** Whether `(rowId, columnKey)` is the active cell. */
  isActive: (rowId: string, columnKey: string) => boolean;
  /**
   * Start editing a cell. Re-beginning the same cell keeps the draft;
   * switching cells abandons the previous draft without committing.
   * Pass the row so lifecycle observers can name what opened.
   */
  begin: (
    rowId: string,
    columnKey: string,
    initialValue: string,
    row?: unknown
  ) => void;
  /** Update the draft without committing. */
  setDraft: (value: string) => void;
  /**
   * Commit the draft. Returns the commit payload, or `null` when idle.
   * Clears the active cell. The table never mutates rows — callers must
   * apply the result through `onCellEdit` (see `applyCellEditCommit`).
   */
  commit: () => CellEditCommit | null;
  /**
   * Cancel editing and clear the active cell (Escape). Adapters should
   * restore focus to the cell that was being edited.
   */
  cancel: () => void;
  /**
   * Close the editor without treating it as a cancel — what a successful
   * validation does before handing the value to the host. Observers do not
   * hear about this; the commit event fires from the send instead.
   */
  close: () => void;
  /**
   * Drop the active edit when its row leaves the current page/filter set
   * (no commit). No-op when idle or the row is still present.
   */
  discardIfRowMissing: (
    rows: readonly unknown[],
    rowKey: (row: unknown) => string
  ) => void;
  /**
   * The row the editor opened against, so a live update can be compared to
   * what the reader started from.
   */
  openedRow: () => unknown;
  /**
   * Keep the draft and accept `row` as the new snapshot — the incoming
   * change is acknowledged, the typing is not.
   */
  keepLive: (row: unknown) => void;
  /**
   * Replace the draft with `value` and accept `row` as the new snapshot —
   * the reader takes the incoming cell.
   */
  takeLive: (row: unknown, value: string) => void;
  /**
   * Keyboard flow:
   * - Enter → commit
   * - Escape → cancel (adapters restore focus)
   * - Tab → commit and advance; Shift+Tab → commit and go previous
   *
   * Returns `null` when idle or for unrelated keys (so the input keeps
   * default behaviour).
   */
  handleKeyDown: (
    event: { key: string; preventDefault: () => void; shiftKey?: boolean },
    navigation?: CellEditNavigation
  ) => CellEditKeyOutcome | null;
}

/**
 * The state a binding hands its cells, read off one session snapshot.
 *
 * @public
 */
export function cellEditingView<TRow>(
  session: CellEditSession<TRow>,
  snapshot: CellEditSnapshot
): CellEditingState {
  return {
    active: snapshot.active,
    draft: snapshot.draft,
    isActive: (rowId, columnKey) =>
      isCellEditActive(snapshot, rowId, columnKey),
    begin: session.begin,
    setDraft: session.setDraft,
    commit: session.commit,
    cancel: session.cancel,
    close: session.close,
    discardIfRowMissing: session.discardIfRowMissing,
    openedRow: session.openedRow,
    keepLive: session.keepLive,
    takeLive: session.takeLive,
    handleKeyDown: session.handleKeyDown,
  };
}

/**
 * Validation state for the whole table.
 *
 * @public
 */
export interface EditValidationState<TRow> {
  /** The message on one cell, if any. */
  errorFor: (rowId: string, columnKey: string) => string | undefined;
  /** The row-level message, if any. */
  rowErrorFor: (rowId: string) => string | undefined;
  /** Whether a cell's validators are still running. */
  isValidating: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in this row carries a message. */
  rowHasError: (rowId: string) => boolean;
  /**
   * Run the validators for one commit.
   *
   * `allowed` is whether the commit may proceed. A rejection also carries
   * `error` — the sentence the editor shows — so a caller that fires in the
   * same tick as the check does not have to wait for a render to read it.
   */
  check: (options: {
    target: ValidationTarget;
    value: unknown;
    row: TRow;
    validateCell?: CellValidator<TRow>;
  }) => Promise<ValidationCheckResult>;
  /** Forget everything about one cell — what cancelling an edit does. */
  clear: (rowId: string, columnKey: string) => void;
  /** Forget every message. */
  clearAll: () => void;
  /** A digest of the messages, for a row memo comparator. */
  signature: string;
  /**
   * Whether a row validator is armed. A cell with no validator of its own still
   * has to run the check when the table has one — a cross-field rule fires on
   * whichever cell was edited.
   */
  hasRowValidator: boolean;
}

/**
 * The validation state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The messages to read.
 * @param hasRowValidator - Whether the host declared a row validator.
 * @returns The validation state.
 *
 * @public
 */
export function editValidationView<TRow>(
  store: EditValidationStore<TRow>,
  snapshot: EditValidationSnapshot,
  hasRowValidator: boolean
): EditValidationState<TRow> {
  return {
    errorFor: (rowId, columnKey) =>
      validationErrorFor(snapshot, rowId, columnKey),
    rowErrorFor: (rowId) => snapshot.rowErrors.get(rowId),
    isValidating: (rowId, columnKey) =>
      snapshot.validating.has(validationKey(rowId, columnKey)),
    rowHasError: (rowId) => rowHasValidationError(snapshot, rowId),
    check: store.check,
    clear: store.clear,
    clearAll: store.clearAll,
    signature: validationSignature(snapshot),
    hasRowValidator,
  };
}

/**
 * Per-cell save state for the whole table.
 *
 * @public
 */
export interface CellSaveState<TRow> {
  /** What this cell's last save is doing, if anything. */
  statusFor: (rowId: string, columnKey: string) => CellSaveStatus | undefined;
  /** Why this cell's last save failed, if it did. */
  failureFor: (
    rowId: string,
    columnKey: string
  ) => FailedCellSave<TRow> | undefined;
  /**
   * Watch one commit, and report how it went: `true` when the value reached
   * wherever it was going, `false` when it did not.
   *
   * The outcome comes back from here rather than being read off the state
   * afterwards, because a caller holding a render-old closure would read the
   * state as it was BEFORE the failure and conclude the save succeeded.
   */
  track: (options: {
    rowId: string;
    columnKey: string;
    /** The row before the edit — what a rollback restores. */
    previous: TRow;
    /** The value being saved. */
    attempted: unknown;
    /**
     * The cell's previous value, when the caller has it. The error event
     * reports this as `previousValue`; without it the event uses the row.
     */
    previousValue?: unknown;
    /** Whatever `onCellEdit` returned. */
    result: unknown;
  }) => Promise<boolean>;
  /** Put a failed cell's previous row back, and forget the failure. */
  rollback: (rowId: string, columnKey: string) => void;
  /** Forget a cell's failure without restoring anything — what a retry does. */
  clear: (rowId: string, columnKey: string) => void;
  /** A digest of the states, for a row memo comparator. */
  signature: string;
  /**
   * Whether the table was told how to put a row back. An undo control offered
   * without one would do nothing when pressed.
   */
  canRollback: boolean;
}

/**
 * The save state a binding hands its cells, read off one snapshot.
 *
 * @param store - The store the actions go to.
 * @param snapshot - The save states to read.
 * @param canRollback - Whether the host said how to put a row back.
 * @returns The save state.
 *
 * @public
 */
export function cellSaveView<TRow>(
  store: CellSaveStore<TRow>,
  snapshot: CellSaveSnapshot<TRow>,
  canRollback: boolean
): CellSaveState<TRow> {
  return {
    statusFor: (rowId, columnKey) => cellSaveStatus(snapshot, rowId, columnKey),
    failureFor: (rowId, columnKey) =>
      cellSaveFailure(snapshot, rowId, columnKey),
    track: store.track,
    rollback: store.rollback,
    clear: store.clear,
    signature: cellSaveSignature(snapshot),
    canRollback,
  };
}

/* ── The bundle ────────────────────────────────────────────────────── */

/**
 * The words the conflict notice uses — already resolved.
 *
 * @public
 */
export interface EditConflictLabels {
  /** What the notice says. */
  message: string;
  /** Keep the reader's draft. */
  keepMine: string;
  /** Take the incoming value. */
  takeTheirs: string;
  /** How the incoming value reads. */
  theirsValue: (value: string) => string;
}

/**
 * Everything a table's editing hands each cell: the channel, the state of
 * every unit the host armed, and the words the notices use.
 *
 * @public
 */
export interface EditingBundle<TRow> {
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
  conflictLabels?: EditConflictLabels;
  /** The host of THIS table — plugin editors resolve from here. */
  featureHost?: FeatureHostState;
  /**
   * The pointer gesture that opens a cell's editor —
   * `TableOptions.editActivation`. Absent means `"doubleClick"`.
   */
  activation?: "doubleClick" | "click";
}

/* ── One cell ──────────────────────────────────────────────────────── */

/**
 * Display / edit mode for one cell.
 *
 * @public
 */
export type EditableCellMode = "display" | "activatable" | "editing";

/**
 * Controller returned by {@link editableCellController}.
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
  conflictLabels?: EditConflictLabels;
  /** Keep the draft. */
  keepConflict: () => void;
  /** Take the incoming value. */
  takeConflict: () => void;
}

/**
 * Begin editing when the column is editable for this row; no-op otherwise.
 * Prefer this over raw `begin` so adapters never open an editor the host
 * didn't opt into.
 *
 * @returns Whether an editor opened.
 *
 * @public
 */
export function beginCellEdit<TRow>(
  editing: Pick<CellEditingState, "begin">,
  row: TRow,
  column: EditableColumnLike<TRow>,
  rowKey: (row: TRow) => string
): boolean {
  if (!isCellEditable(column, row)) return false;
  editing.begin(
    rowKey(row),
    column.key,
    readEditableCellValue(row, column),
    row
  );
  return true;
}

/**
 * Derive the per-cell editing controller. When `editing` is omitted (host
 * did not compose editing), always returns `mode: "display"` — zero UI
 * change for tables that never opted in.
 *
 * @public
 */
export function editableCellController<TRow>(options: {
  editing: EditingBundle<TRow> | undefined;
  row: TRow;
  column: EditableColumnLike<TRow>;
  rowId: string;
  rows: readonly TRow[];
  columns: readonly EditableColumnLike<TRow>[];
  rowKey: (row: TRow) => string;
}): EditableCellController<TRow> {
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

  // A column's own validator lives beside the `editor` and `parseValue` that
  // produce the value it judges.
  const validateCell: CellValidator<TRow> | undefined = column.validate;
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
    beginCellEdit(state, resolved.row, resolved.column, rowKey);
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
    beginCellEdit(state, nextRow, nextCol, rowKey);
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
      beginCellEdit(state, row, column, rowKey);
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
 * Stop a key event from bubbling to the row's own handlers.
 *
 * @public
 */
export function stopCellEditKeyboard(event: {
  stopPropagation: () => void;
}): void {
  event.stopPropagation();
}

/**
 * Attach as a `ref` (or kit `inputRef`) so the editor receives focus when the
 * cell enters edit mode — replaces the `autoFocus` attribute (axe/a11y).
 * Accepts DOM nodes and kit refs that expose `.focus()`.
 *
 * @public
 */
export function focusEditorOnMount(node: { focus: () => void } | null): void {
  const element = editorRefElement(node);
  if (element) {
    const root = element.closest('[data-adapttable-part="root"]');
    const active = element.ownerDocument.activeElement;
    // Remounting a row must not take focus from an explicit layout chooser.
    if (
      root &&
      active &&
      active !== element.ownerDocument.body &&
      !root.contains(active)
    )
      return;
  }
  node?.focus();
}

/** Kits can expose the actual input through an imperative focus handle. */
function editorRefElement(
  node: { focus(): void } | null
): HTMLElement | undefined {
  if (typeof HTMLElement === "undefined" || !node) return undefined;
  if (node instanceof HTMLElement) return node;
  if ("input" in node && node.input instanceof HTMLElement) return node.input;
  if ("nativeElement" in node && node.nativeElement instanceof HTMLElement)
    return node.nativeElement;
  return undefined;
}
