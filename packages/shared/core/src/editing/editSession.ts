/**
 * The editing transaction: the open cell and its draft, and the save that
 * follows a commit.
 *
 * A newer save of the same cell supersedes an older one. A late answer is
 * ignored, including a success, so it cannot clear the save the cell is in now.
 */
import { devWarn } from "../utils/devWarn";
import {
  type CellEditCommit,
  type CellEditTarget,
  type EditableColumnLike,
  stepEditableCell,
} from "./cellEditing";
import type { EditEvent, EditEventHandler } from "./editContracts";
import { isThenable, listenerSet } from "./storePlumbing";

/* ── Observers ─────────────────────────────────────────────────────── */

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
  const tokens = new Map<string, symbol>();
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
      const key = cellSaveKey(rowId, columnKey);
      if (!isThenable(result)) {
        tokens.delete(key);
        setFailure(key, undefined);
        markSaving(key, false);
        return true;
      }
      const token = Symbol();
      tokens.set(key, token);
      const live = (): boolean => tokens.get(key) === token;
      setFailure(key, undefined);
      markSaving(key, true);
      try {
        await result;
        if (!live()) return false;
        setFailure(key, undefined);
        return true;
      } catch (error) {
        if (!live()) return false;
        let message: string;
        try {
          message = (current.formatError ?? defaultSaveErrorMessage)(error);
        } catch {
          message = defaultSaveErrorMessage(error);
        }
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
        if (live()) {
          tokens.delete(key);
          markSaving(key, false);
        }
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
