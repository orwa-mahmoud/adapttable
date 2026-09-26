/**
 * The editing controller: the active cell and its draft, the save state of
 * every commit, validation, and undo/redo.
 *
 * Each part is a small store — `getSnapshot`, `subscribe` and the actions —
 * whose snapshot is immutable, with pure selectors that read it. A binding
 * subscribes (`useSyncExternalStore` in React) and renders the editors; the
 * rules for what opens, what commits, what a rejected save leaves behind,
 * which validation answer counts and what an undo puts back live here.
 */
import type { CellEdit } from "../focus/cellEdits";
import { devWarn } from "../utils/devWarn";
import { getPath } from "../utils/path";
import {
  type CellEditCommit,
  type CellEditTarget,
  type EditableColumnLike,
  stepEditableCell,
} from "./cellEditing";
import type {
  BatchRowEdit,
  CellValidator,
  EditEvent,
  EditEventHandler,
  RowValidator,
  ValidationTarget,
} from "./editContracts";

/* ── Shared plumbing ───────────────────────────────────────────────── */

/** A store's listener set. */
function listenerSet(): {
  readonly subscribe: (listener: () => void) => () => void;
  readonly notify: () => void;
} {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      for (const listener of listeners) listener();
    },
  };
}

/**
 * Call an observer without letting it own the outcome. A throw is reported
 * and swallowed: the commit already happened, or the cancel already did, and
 * a side-effect that blows up must not rewind it.
 *
 * @public
 */
export function observeEdit<TRow>(
  handler: EditEventHandler<TRow> | undefined,
  event: EditEvent<TRow>
): void {
  if (!handler) return;
  try {
    handler(event);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    devWarn(
      `an onEdit* handler threw (${detail}) — the table ignored it so the commit could finish`
    );
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/* ── The active cell and its draft ─────────────────────────────────── */

/**
 * What a key press inside an open editor did.
 *
 * @public
 */
export type CellEditKeyAction = "commit" | "cancel" | "commit-advance";

/**
 * What Tab needs to find the next editable cell.
 *
 * @public
 */
export interface CellEditNavigation {
  /** The rows in view, in order. */
  rows: readonly unknown[];
  /** The columns in view, in order. */
  columns: readonly EditableColumnLike[];
  /** A row's id. */
  rowKey: (row: unknown) => string;
}

/**
 * The outcome of a key press inside an open editor.
 *
 * @public
 */
export interface CellEditKeyOutcome {
  /** What the key did. */
  action: CellEditKeyAction;
  /** The draft committed, if the key committed one. */
  commit: CellEditCommit | null;
  /** The cell to open next, after Tab. */
  advanceTarget: CellEditTarget | null;
}

/**
 * The open editor, if any, and what it holds.
 *
 * @public
 */
export interface CellEditSnapshot {
  /** The cell being edited, or `null`. */
  readonly active: CellEditTarget | null;
  /** The text in the open editor. */
  readonly draft: string;
}

/**
 * Observers of the cell editor's lifecycle.
 *
 * @public
 */
export interface CellEditSessionOptions<TRow = unknown> {
  /** An editor opened. */
  readonly onEditStart?: EditEventHandler<TRow>;
  /** The reader threw a draft away. */
  readonly onEditCancel?: EditEventHandler<TRow>;
}

/**
 * The active cell and its draft.
 *
 * @public
 */
export interface CellEditSession<TRow = unknown> {
  /** The open editor. */
  readonly getSnapshot: () => CellEditSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the lifecycle observers. */
  readonly configure: (options: CellEditSessionOptions<TRow>) => void;
  /** Open a cell. Opening another cancels the open one. */
  readonly begin: (
    rowId: string,
    columnKey: string,
    initialValue: string,
    row?: unknown
  ) => void;
  /** Change the draft. */
  readonly setDraft: (value: string) => void;
  /** Close the editor and hand back its draft. */
  readonly commit: () => CellEditCommit | null;
  /** Throw the draft away, telling `onEditCancel`. */
  readonly cancel: () => void;
  /** Close the editor without an event — a successful commit's close. */
  readonly close: () => void;
  /** Close the editor when its row left the data. */
  readonly discardIfRowMissing: (
    rows: readonly unknown[],
    rowKey: (row: unknown) => string
  ) => void;
  /** The row the editor opened against, or its latest accepted version. */
  readonly openedRow: () => unknown;
  /** Keep the draft over a live update, adopting the incoming row. */
  readonly keepLive: (row: unknown) => void;
  /** Take a live update's value into the draft. */
  readonly takeLive: (row: unknown, value: string) => void;
  /** Handle Escape, Enter and Tab inside the editor. */
  readonly handleKeyDown: (
    event: { key: string; preventDefault: () => void; shiftKey?: boolean },
    navigation?: CellEditNavigation
  ) => CellEditKeyOutcome | null;
}

const NO_EDIT: CellEditSnapshot = { active: null, draft: "" };

/**
 * Whether a cell is the one being edited.
 *
 * @public
 */
export function isCellEditActive(
  snapshot: CellEditSnapshot,
  rowId: string,
  columnKey: string
): boolean {
  return (
    snapshot.active?.rowId === rowId && snapshot.active.columnKey === columnKey
  );
}

/**
 * Create the cell edit session.
 *
 * @public
 */
export function createCellEditSession<TRow = unknown>(
  options: CellEditSessionOptions<TRow> = {}
): CellEditSession<TRow> {
  let observers = options;
  let snapshot = NO_EDIT;
  let opened: {
    rowId: string;
    columnKey: string;
    initial: string;
    row: TRow | undefined;
  } | null = null;
  const { subscribe, notify } = listenerSet();

  const write = (next: CellEditSnapshot): void => {
    if (next.active === snapshot.active && next.draft === snapshot.draft) {
      return;
    }
    snapshot = next;
    notify();
  };

  const fireCancel = (): void => {
    if (!opened?.row) return;
    observeEdit(observers.onEditCancel, {
      row: opened.row,
      rowId: opened.rowId,
      columnKey: opened.columnKey,
      value: snapshot.draft,
      previousValue: opened.initial,
      unit: "cell",
    });
  };

  const clear = (): void => {
    opened = null;
    write(NO_EDIT);
  };

  const commit = (): CellEditCommit | null => {
    const { active, draft } = snapshot;
    if (!active) return null;
    clear();
    return { rowId: active.rowId, columnKey: active.columnKey, draft };
  };

  const cancel = (): void => {
    fireCancel();
    clear();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure(next) {
      observers = next;
    },
    begin(rowId, columnKey, initialValue, row) {
      if (isCellEditActive(snapshot, rowId, columnKey)) return;
      if (snapshot.active) fireCancel();
      const typed = row as TRow | undefined;
      opened = { rowId, columnKey, initial: initialValue, row: typed };
      write({ active: { rowId, columnKey }, draft: initialValue });
      if (typed !== undefined) {
        observeEdit(observers.onEditStart, {
          row: typed,
          rowId,
          columnKey,
          value: initialValue,
          previousValue: initialValue,
          unit: "cell",
        });
      }
    },
    setDraft(value) {
      write({ active: snapshot.active, draft: value });
    },
    commit,
    cancel,
    close: clear,
    discardIfRowMissing(rows, rowKey) {
      const { active } = snapshot;
      if (!active) return;
      if (rows.some((row) => rowKey(row) === active.rowId)) return;
      clear();
    },
    openedRow: () => opened?.row,
    keepLive(row) {
      if (!opened) return;
      opened = { ...opened, row: row as TRow };
    },
    takeLive(row, value) {
      if (!opened) return;
      opened = { ...opened, row: row as TRow, initial: value };
      write({ active: snapshot.active, draft: value });
    },
    handleKeyDown(event, navigation) {
      if (!snapshot.active) return null;
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return { action: "cancel", commit: null, advanceTarget: null };
      }
      if (event.key === "Enter") {
        event.preventDefault();
        return { action: "commit", commit: commit(), advanceTarget: null };
      }
      if (event.key === "Tab" && navigation) {
        event.preventDefault();
        const result = commit();
        const advanceTarget = result
          ? stepEditableCell({
              rows: navigation.rows,
              columns: navigation.columns,
              rowKey: navigation.rowKey,
              from: { rowId: result.rowId, columnKey: result.columnKey },
              direction: event.shiftKey ? -1 : 1,
            })
          : null;
        return { action: "commit-advance", commit: result, advanceTarget };
      }
      return null;
    },
  };
}

/* ── Save state ────────────────────────────────────────────────────── */

/**
 * A cell's save, while it is in flight or after it failed.
 *
 * @public
 */
export type CellSaveStatus = "saving" | "failed";

/**
 * What a rejected save leaves behind, so the cell can say why and undo.
 *
 * @public
 */
export interface FailedCellSave<TRow> {
  /** The row as it was before the edit. */
  previous: TRow;
  /** The value the reader tried to save. */
  attempted: unknown;
  /** Why the save failed, as the cell shows it. */
  message: string;
}

/**
 * The save state of every tracked cell.
 *
 * @public
 */
export interface CellSaveSnapshot<TRow> {
  /** Cells whose save is in flight. */
  readonly saving: ReadonlySet<string>;
  /** Cells whose save failed. */
  readonly failures: ReadonlyMap<string, FailedCellSave<TRow>>;
}

/**
 * How a save state reports and undoes failures.
 *
 * @public
 */
export interface CellSaveStoreOptions<TRow> {
  /** Put a row back after a rejected save. */
  readonly onRollback?: (previous: TRow, columnKey: string) => void;
  /** Turn a rejection into the sentence the cell shows. */
  readonly formatError?: (error: unknown) => string;
  /** Observe a rejected save. */
  readonly onEditError?: EditEventHandler<TRow>;
}

/**
 * The save state of every commit.
 *
 * @public
 */
export interface CellSaveStore<TRow> {
  /** The save state now. */
  readonly getSnapshot: () => CellSaveSnapshot<TRow>;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: CellSaveStoreOptions<TRow>) => void;
  /**
   * Follow a commit's result. A non-promise settles at once; a promise marks
   * the cell saving until it settles and failed if it rejects. A newer save
   * of the same cell supersedes an older one, whose answer is ignored.
   */
  readonly track: (input: {
    rowId: string;
    columnKey: string;
    previous: TRow;
    attempted: unknown;
    previousValue?: unknown;
    result: unknown;
  }) => Promise<boolean>;
  /** Undo a failed save through `onRollback` and clear its mark. */
  readonly rollback: (rowId: string, columnKey: string) => void;
  /** Clear a cell's failure mark. */
  readonly clear: (rowId: string, columnKey: string) => void;
  /** Whether a rejected save can be put back. */
  readonly canRollback: () => boolean;
}

/**
 * The key a cell's save state is kept under.
 *
 * @public
 */
export function cellSaveKey(rowId: string, columnKey: string): string {
  return `${rowId} ${columnKey}`;
}

/**
 * The sentence a rejection reads as when the host formats nothing.
 *
 * @public
 */
export function defaultSaveErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error !== "") return error;
  return "Could not save";
}

/**
 * A cell's save status.
 *
 * @public
 */
export function cellSaveStatus<TRow>(
  snapshot: CellSaveSnapshot<TRow>,
  rowId: string,
  columnKey: string
): CellSaveStatus | undefined {
  const key = cellSaveKey(rowId, columnKey);
  if (snapshot.saving.has(key)) return "saving";
  return snapshot.failures.has(key) ? "failed" : undefined;
}

/**
 * A cell's failed save, if it has one.
 *
 * @public
 */
export function cellSaveFailure<TRow>(
  snapshot: CellSaveSnapshot<TRow>,
  rowId: string,
  columnKey: string
): FailedCellSave<TRow> | undefined {
  return snapshot.failures.get(cellSaveKey(rowId, columnKey));
}

/**
 * A value-comparable digest of the save state, for a memoized row.
 *
 * @public
 */
export function cellSaveSignature<TRow>(
  snapshot: CellSaveSnapshot<TRow>
): string {
  return [
    ...snapshot.saving,
    ...[...snapshot.failures.entries()].map(
      ([key, failure]) => key + failure.message
    ),
  ].join("");
}

/**
 * Create the save state.
 *
 * @public
 */
export function createCellSaveStore<TRow>(
  options: CellSaveStoreOptions<TRow> = {}
): CellSaveStore<TRow> {
  let current = options;
  let snapshot: CellSaveSnapshot<TRow> = {
    saving: new Set(),
    failures: new Map(),
  };
  const tokens = new Map<string, number>();
  const { subscribe, notify } = listenerSet();

  const markSaving = (key: string, busy: boolean): void => {
    if (snapshot.saving.has(key) === busy) return;
    const saving = new Set(snapshot.saving);
    if (busy) saving.add(key);
    else saving.delete(key);
    snapshot = { ...snapshot, saving };
    notify();
  };

  const setFailure = (
    key: string,
    failure: FailedCellSave<TRow> | undefined
  ): void => {
    if (failure === undefined && !snapshot.failures.has(key)) return;
    const failures = new Map(snapshot.failures);
    if (failure === undefined) failures.delete(key);
    else failures.set(key, failure);
    snapshot = { ...snapshot, failures };
    notify();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure(next) {
      current = next;
    },
    async track(input) {
      const { rowId, columnKey, previous, attempted, previousValue, result } =
        input;
      if (!isThenable(result)) return true;
      const key = cellSaveKey(rowId, columnKey);
      const token = (tokens.get(key) ?? 0) + 1;
      tokens.set(key, token);
      const live = (): boolean => tokens.get(key) === token;
      setFailure(key, undefined);
      markSaving(key, true);
      try {
        await result;
        if (live()) setFailure(key, undefined);
        return true;
      } catch (error) {
        if (!live()) return false;
        const message = (current.formatError ?? defaultSaveErrorMessage)(error);
        setFailure(key, { previous, attempted, message });
        observeEdit(current.onEditError, {
          row: previous,
          rowId,
          columnKey,
          value: attempted,
          previousValue: previousValue ?? previous,
          unit: "cell",
          error: message,
        });
        return false;
      } finally {
        if (live()) markSaving(key, false);
      }
    },
    rollback(rowId, columnKey) {
      const key = cellSaveKey(rowId, columnKey);
      const failure = snapshot.failures.get(key);
      if (!failure) return;
      setFailure(key, undefined);
      current.onRollback?.(failure.previous, columnKey);
    },
    clear(rowId, columnKey) {
      setFailure(cellSaveKey(rowId, columnKey), undefined);
    },
    canRollback: () => current.onRollback !== undefined,
  };
}

/* ── Validation ────────────────────────────────────────────────────── */

/**
 * Outcome of a validation check.
 *
 * @public
 */
export interface ValidationCheckResult {
  /** Whether the commit may proceed. */
  allowed: boolean;
  /** The message that refused it, when one did. */
  error?: string;
}

/**
 * Every validation message and in-flight check.
 *
 * @public
 */
export interface EditValidationSnapshot {
  /** Messages marking single cells. */
  readonly cellErrors: ReadonlyMap<string, string>;
  /** Messages marking whole rows. */
  readonly rowErrors: ReadonlyMap<string, string>;
  /** Cells whose check is still running. */
  readonly validating: ReadonlySet<string>;
}

/**
 * What validation checks with.
 *
 * @public
 */
export interface EditValidationStoreOptions<TRow> {
  /** The row-level validator, when the host declared one. */
  readonly validateRow?: RowValidator<TRow>;
  /**
   * Apply an edit to a row without mutating it, so the row validator sees
   * what the commit WOULD produce. Defaults to a shallow spread keyed by the
   * column key.
   */
  readonly applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
}

/**
 * Validation that gates a commit.
 *
 * @public
 */
export interface EditValidationStore<TRow> {
  /** Every message and in-flight check now. */
  readonly getSnapshot: () => EditValidationSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: EditValidationStoreOptions<TRow>) => void;
  /**
   * Check a value: the cell validator first, then the row validator against
   * the row the edit would produce. A newer check of the same cell
   * supersedes an older one, whose answer is ignored.
   */
  readonly check: (input: {
    target: ValidationTarget;
    value: unknown;
    row: TRow;
    validateCell?: CellValidator<TRow>;
  }) => Promise<ValidationCheckResult>;
  /** Clear a cell's messages and cancel its check. */
  readonly clear: (rowId: string, columnKey: string) => void;
  /** Clear every message and check. */
  readonly clearAll: () => void;
  /** Whether a row-level validator is declared. */
  readonly hasRowValidator: () => boolean;
}

/**
 * The key a cell's validation state is kept under.
 *
 * @public
 */
export function validationKey(rowId: string, columnKey: string): string {
  return `${rowId}\u0000${columnKey}`;
}

/**
 * A cell's validation message, if any.
 *
 * @public
 */
export function validationErrorFor(
  snapshot: EditValidationSnapshot,
  rowId: string,
  columnKey: string
): string | undefined {
  return snapshot.cellErrors.get(validationKey(rowId, columnKey));
}

/**
 * Whether a row carries any validation message, on itself or a cell.
 *
 * @public
 */
export function rowHasValidationError(
  snapshot: EditValidationSnapshot,
  rowId: string
): boolean {
  if (snapshot.rowErrors.has(rowId)) return true;
  const prefix = `${rowId}\u0000`;
  for (const key of snapshot.cellErrors.keys()) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * A value-comparable digest of the validation state, for a memoized row.
 *
 * @public
 */
export function validationSignature(snapshot: EditValidationSnapshot): string {
  return [
    ...snapshot.cellErrors.entries(),
    ...snapshot.rowErrors.entries(),
    ...snapshot.validating,
  ]
    .flat()
    .join("\u0001");
}

function shallowApplyEdit<TRow>(
  row: TRow,
  columnKey: string,
  value: unknown
): TRow {
  return { ...row, [columnKey]: value };
}

/**
 * Create validation.
 *
 * @public
 */
export function createEditValidationStore<TRow>(
  options: EditValidationStoreOptions<TRow> = {}
): EditValidationStore<TRow> {
  let current = options;
  let snapshot: EditValidationSnapshot = {
    cellErrors: new Map(),
    rowErrors: new Map(),
    validating: new Set(),
  };
  const tokens = new Map<string, number>();
  const { subscribe, notify } = listenerSet();

  const setMap = (
    field: "cellErrors" | "rowErrors",
    key: string,
    message: string | undefined
  ): void => {
    const map = snapshot[field];
    if (map.get(key) === message) return;
    const next = new Map(map);
    if (message === undefined) next.delete(key);
    else next.set(key, message);
    snapshot = { ...snapshot, [field]: next };
    notify();
  };
  const setCellError = (key: string, message?: string): void =>
    setMap("cellErrors", key, message);
  const setRowError = (rowId: string, message?: string): void =>
    setMap("rowErrors", rowId, message);

  const markValidating = (key: string, busy: boolean): void => {
    if (snapshot.validating.has(key) === busy) return;
    const validating = new Set(snapshot.validating);
    if (busy) validating.add(key);
    else validating.delete(key);
    snapshot = { ...snapshot, validating };
    notify();
  };

  const settle = (
    verdict: string | Record<string, string> | undefined,
    target: ValidationTarget
  ): ValidationCheckResult => {
    const key = validationKey(target.rowId, target.columnKey);
    if (verdict === undefined) {
      setCellError(key);
      setRowError(target.rowId);
      return { allowed: true };
    }
    if (typeof verdict === "string") {
      setCellError(key);
      setRowError(target.rowId, verdict);
      return { allowed: false, error: verdict };
    }
    setRowError(target.rowId);
    for (const [columnKey, message] of Object.entries(verdict)) {
      setCellError(validationKey(target.rowId, columnKey), message);
    }
    const firstKey = Object.keys(verdict)[0];
    if (firstKey === undefined) return { allowed: true };
    return {
      allowed: false,
      error: verdict[target.columnKey] ?? verdict[firstKey],
    };
  };

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure(next) {
      current = next;
    },
    async check(input) {
      const { target, value, row, validateCell } = input;
      const { validateRow, applyEdit = shallowApplyEdit } = current;
      if (!validateCell && !validateRow) return { allowed: true };
      const key = validationKey(target.rowId, target.columnKey);
      const token = (tokens.get(key) ?? 0) + 1;
      tokens.set(key, token);
      const live = (): boolean => tokens.get(key) === token;
      markValidating(key, true);
      try {
        const cellMessage = await validateCell?.(value, row);
        if (!live()) return { allowed: false };
        if (cellMessage !== undefined) {
          setCellError(key, cellMessage);
          setRowError(target.rowId);
          return { allowed: false, error: cellMessage };
        }
        const rowVerdict = await validateRow?.(
          applyEdit(row, target.columnKey, value)
        );
        if (!live()) return { allowed: false };
        return settle(rowVerdict, target);
      } finally {
        if (live()) markValidating(key, false);
      }
    },
    clear(rowId, columnKey) {
      const key = validationKey(rowId, columnKey);
      tokens.set(key, (tokens.get(key) ?? 0) + 1);
      setCellError(key);
      setRowError(rowId);
      markValidating(key, false);
    },
    clearAll() {
      tokens.clear();
      snapshot = {
        cellErrors: new Map(),
        rowErrors: new Map(),
        validating: new Set(),
      };
      notify();
    },
    hasRowValidator: () => current.validateRow !== undefined,
  };
}

/* ── Undo / redo ───────────────────────────────────────────────────── */

/**
 * One gesture: the edits it made, and the edits that put it back.
 *
 * @public
 */
export interface EditHistoryEntry<TRow> {
  /** The edits the gesture made. */
  redo: readonly CellEdit<TRow>[];
  /** The edits that undo it. */
  undo: readonly CellEdit<TRow>[];
}

/**
 * How much can be undone and redone.
 *
 * @public
 */
export interface EditHistorySnapshot {
  /** Gestures that can be undone. */
  readonly past: number;
  /** Gestures that can be redone. */
  readonly future: number;
}

/**
 * The undo and redo stacks.
 *
 * @public
 */
export interface EditHistoryStack<TRow> {
  /** The stack depths now. */
  readonly getSnapshot: () => EditHistorySnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Push a gesture, keeping at most `depth`, and drop every redo. */
  readonly record: (entry: EditHistoryEntry<TRow>, depth: number) => void;
  /** Pop the last gesture onto the redo stack and hand it back. */
  readonly undo: () => EditHistoryEntry<TRow> | undefined;
  /** Pop the last undone gesture back and hand it back. */
  readonly redo: () => EditHistoryEntry<TRow> | undefined;
  /** Forget every gesture. */
  readonly clear: () => void;
}

/**
 * How many gestures a history keeps when the host does not say.
 *
 * @public
 */
export const DEFAULT_EDIT_HISTORY_DEPTH = 50;

/**
 * Create the undo and redo stacks.
 *
 * @public
 */
export function createEditHistoryStack<TRow>(): EditHistoryStack<TRow> {
  let past: EditHistoryEntry<TRow>[] = [];
  let future: EditHistoryEntry<TRow>[] = [];
  let snapshot: EditHistorySnapshot = { past: 0, future: 0 };
  const { subscribe, notify } = listenerSet();
  const sync = (): void => {
    snapshot = { past: past.length, future: future.length };
    notify();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe,
    record(entry, depth) {
      past = [...past, entry].slice(-depth);
      future = [];
      sync();
    },
    undo() {
      const entry = past.at(-1);
      if (!entry) return undefined;
      past = past.slice(0, -1);
      future = [...future, entry];
      sync();
      return entry;
    },
    redo() {
      const entry = future.at(-1);
      if (!entry) return undefined;
      future = future.slice(0, -1);
      past = [...past, entry];
      sync();
      return entry;
    },
    clear() {
      past = [];
      future = [];
      sync();
    },
  };
}

/**
 * A cell's current value as an undo would restore it: the column's
 * `editValue`, else its `sortValue`, else the field at its key.
 *
 * @public
 */
export function readCellValue<TRow>(
  row: TRow,
  column: {
    readonly key: string;
    readonly editValue?: (row: TRow) => unknown;
    readonly sortValue?: (row: TRow) => unknown;
  }
): unknown {
  if (column.editValue) return column.editValue(row);
  if (column.sortValue) return column.sortValue(row);
  return getPath(row, column.key);
}

/**
 * The history entry for a gesture: the edits, and for each one whose column
 * is known, the value it replaces.
 *
 * @public
 */
export function editHistoryEntry<TRow>(
  edits: readonly CellEdit<TRow>[],
  readValue: (edit: CellEdit<TRow>) => { value: unknown } | undefined
): EditHistoryEntry<TRow> {
  const undo = edits.flatMap((edit) => {
    const read = readValue(edit);
    return read
      ? [{ row: edit.row, columnKey: edit.columnKey, value: read.value }]
      : [];
  });
  return { redo: edits, undo };
}

/**
 * Wrap a paste or fill handler so the batch is recorded as ONE gesture.
 *
 * @public
 */
export function asGesture<TRow>(
  apply: ((edits: CellEdit<TRow>[]) => void) | undefined,
  record: (edits: readonly CellEdit<TRow>[]) => void
): ((edits: CellEdit<TRow>[]) => void) | undefined {
  if (!apply) return undefined;
  return (edits) => {
    record(edits);
    apply(edits);
  };
}

/**
 * The cell edits a batch save is made of.
 *
 * @public
 */
export function cellsOfBatch<TRow>(
  edits: readonly BatchRowEdit<TRow>[]
): CellEdit<TRow>[] {
  const cells: CellEdit<TRow>[] = [];
  for (const edit of edits) {
    for (const [columnKey, value] of Object.entries(edit.patch)) {
      cells.push({ row: edit.row, columnKey, value });
    }
  }
  return cells;
}

/**
 * Wrap a batch save so the whole batch is recorded as ONE gesture.
 *
 * @public
 */
export function asBatchGesture<TRow>(
  apply: ((edits: readonly BatchRowEdit<TRow>[]) => unknown) | undefined,
  record: (edits: readonly CellEdit<TRow>[]) => void
): ((edits: readonly BatchRowEdit<TRow>[]) => unknown) | undefined {
  if (!apply) return undefined;
  return (edits) => {
    record(cellsOfBatch(edits));
    return apply(edits);
  };
}
