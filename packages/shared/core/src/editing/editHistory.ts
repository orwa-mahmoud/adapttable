/**
 * Undo and redo, without the table ever owning the data.
 *
 * The boundary is the whole design: AdaptTable never mutates rows, so it
 * cannot "restore" anything. What it can do is remember the value a cell held
 * before an edit and, on undo, COMMIT that value back through `onCellEdit` —
 * the same call the original edit made. Everything the host wrapped around
 * editing (validation, a mutation, an optimistic update, a toast) runs on the
 * way back exactly as it ran on the way out.
 *
 * A gesture is one entry, not one cell. Pasting two hundred cells and pressing
 * undo once puts all two hundred back, because that is what a person means by
 * "undo that paste" — and it is why the batch routes record themselves rather
 * than each cell recording itself.
 */
import type { CellEdit } from "../focus/cellEdits";
import { getPath } from "../utils/path";
import type { BatchRowEdit } from "./editContracts";
import { PREPARE_RECORDING, recordedGesture } from "./recordedGesture";
import { listenerSet } from "./storePlumbing";

/**
 * The host's commit channel — what an undo replays through.
 *
 * @public
 */
export type CellEditHandler<TRow> = (
  row: TRow,
  key: string,
  nextValue: unknown
) => unknown;

/**
 * What an edit history needs: whether it runs, how deep it goes, how a cell's
 * value is read before it changes, and where a replay goes.
 *
 * @public
 */
export interface EditHistoryControllerOptions<TRow> {
  /** Off unless the host asked for it; when false nothing is recorded. */
  readonly enabled: boolean;
  /** How many gestures to remember. Defaults to 50. */
  readonly depth?: number;
  /** The columns, for reading a cell's value before it changes. */
  readonly columns: readonly {
    readonly key: string;
    readonly editValue?: (row: TRow) => unknown;
    readonly sortValue?: (row: TRow) => unknown;
  }[];
  /** The host's commit channel — every replay goes back out through it. */
  readonly onCellEdit?: CellEditHandler<TRow>;
}

/**
 * What an edit history offers — the state a binding hands its chrome.
 *
 * @public
 */
export interface EditHistoryState<TRow> {
  /**
   * Whether the host armed a history at all.
   *
   * `canUndo` answers "is there something to put back", which is false
   * both when the feature is off and when nothing has been edited yet.
   * Chrome that should not exist without a history needs the other
   * question, and this is it.
   */
  enabled: boolean;
  /** Whether anything can be undone right now. */
  canUndo: boolean;
  /** Whether anything can be redone right now. */
  canRedo: boolean;
  /**
   * Put the last gesture back, through the host's own commit channel.
   *
   * @returns How many cells were restored; zero when there was nothing to undo.
   */
  undo: () => number;
  /**
   * Do the last undone gesture again.
   *
   * @returns How many cells were rewritten; zero when there was nothing to redo.
   */
  redo: () => number;
  /** Forget everything — what a host calls when the data is replaced. */
  clear: () => void;
  /**
   * Record a batch as ONE gesture. Records nothing when history is off, in
   * which case the caller's own handler still runs.
   */
  record: (edits: readonly CellEdit<TRow>[]) => void;
}

/**
 * The edit history: the stack, plus the rules for what a gesture records and
 * where its replay goes.
 *
 * @public
 */
export interface EditHistoryController<TRow> {
  /** The stack's counts now. */
  readonly getSnapshot: () => EditHistorySnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the options. */
  readonly configure: (options: EditHistoryControllerOptions<TRow>) => void;
  /** Record a gesture, reading each cell's value before it changes. */
  readonly record: (edits: readonly CellEdit<TRow>[]) => void;
  /** Replay the last gesture backwards. */
  readonly undo: () => number;
  /** Replay the last undone gesture forwards. */
  readonly redo: () => number;
  /** Forget everything. */
  readonly clear: () => void;
}

/**
 * Create an edit history.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link EditHistoryControllerOptions}.
 * @returns The controller; records nothing while `enabled` is false.
 *
 * @public
 */
export function createEditHistory<TRow>(
  options: EditHistoryControllerOptions<TRow>
): EditHistoryController<TRow> {
  let current = options;
  const stack = createEditHistoryStack<TRow>();
  let generation = 0;
  const prepare = (edits: readonly CellEdit<TRow>[]): (() => void) => {
    if (!current.enabled || edits.length === 0) return () => undefined;
    const version = generation;
    const entry = editHistoryEntry(edits, (edit) => {
      const column = current.columns.find(
        (item) => item.key === edit.columnKey
      );
      return column ? { value: readCellValue(edit.row, column) } : undefined;
    });
    return () => {
      if (version !== generation || !current.enabled) return;
      stack.record(entry, current.depth ?? DEFAULT_EDIT_HISTORY_DEPTH);
    };
  };
  const record = Object.assign(
    (edits: readonly CellEdit<TRow>[]) => prepare(edits)(),
    { [PREPARE_RECORDING]: prepare }
  );

  // An undo does not rewrite the host's data: it COMMITS the previous value
  // back through the host's own channel, so whatever wraps editing runs on
  // the way back exactly as it ran on the way out.
  const replay = (edits: readonly CellEdit<TRow>[]): number => {
    for (const edit of edits) {
      current.onCellEdit?.(edit.row, edit.columnKey, edit.value);
    }
    return edits.length;
  };

  return {
    getSnapshot: stack.getSnapshot,
    subscribe: stack.subscribe,
    configure(next) {
      if (current.enabled && !next.enabled) generation++;
      current = next;
    },
    record,
    undo() {
      if (!current.enabled || !current.onCellEdit) return 0;
      const entry = stack.undo();
      return entry ? replay(entry.undo) : 0;
    },
    redo() {
      if (!current.enabled || !current.onCellEdit) return 0;
      const entry = stack.redo();
      return entry ? replay(entry.redo) : 0;
    },
    clear: () => {
      generation++;
      stack.clear();
    },
  };
}

/**
 * The state a binding hands its chrome, read off one snapshot.
 *
 * @param history - The controller the actions go to.
 * @param snapshot - The stack's counts.
 * @param enabled - Whether the host armed a history.
 * @returns The history state.
 *
 * @public
 */
export function editHistoryView<TRow>(
  history: EditHistoryController<TRow>,
  snapshot: EditHistorySnapshot,
  enabled: boolean
): EditHistoryState<TRow> {
  return {
    enabled,
    canUndo: enabled && snapshot.past > 0,
    canRedo: enabled && snapshot.future > 0,
    undo: history.undo,
    redo: history.redo,
    clear: history.clear,
    record: history.record,
  };
}

/**
 * The `editHistory` prop, resolved: whether a history runs, and how deep.
 *
 * @param editHistory - The prop as the host wrote it.
 * @returns Whether it is armed, and its depth when the host set one.
 *
 * @public
 */
export function resolveEditHistory(
  editHistory: boolean | { readonly depth?: number } | undefined
): { readonly enabled: boolean; readonly depth: number | undefined } {
  return {
    enabled: editHistory !== undefined && editHistory !== false,
    depth: typeof editHistory === "object" ? editHistory.depth : undefined,
  };
}

/**
 * The commit channel to hand the chrome: each successful inline commit is a
 * one-cell gesture. History captures the previous value before the host runs.
 *
 * Batch routes (paste, fill) must NOT go through it — they record themselves
 * through `asGesture`, so that two hundred pasted cells undo in one press
 * rather than two hundred.
 *
 * @param onCellEdit - The host's channel, or `undefined` when cells do not edit.
 * @param record - The history's `record`.
 * @returns The recording channel, or `undefined` when there is no channel.
 *
 * @public
 */
export function recordingCellEdit<TRow>(
  onCellEdit: CellEditHandler<TRow> | undefined,
  record: (edits: readonly CellEdit<TRow>[]) => void
): CellEditHandler<TRow> | undefined {
  if (!onCellEdit) return undefined;
  return (row, key, nextValue) =>
    recordedGesture(record, [{ row, columnKey: key, value: nextValue }], () =>
      onCellEdit(row, key, nextValue)
    );
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
      const limit = Math.max(0, Math.trunc(depth));
      past = limit > 0 ? [...past, entry].slice(-limit) : [];
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
  return { redo: edits.map((edit) => ({ ...edit })), undo };
}

/**
 * Wrap a paste or fill handler so the batch is recorded as ONE gesture.
 *
 * @public
 */
export function asGesture<TRow>(
  apply: ((edits: CellEdit<TRow>[]) => unknown) | undefined,
  record: (edits: readonly CellEdit<TRow>[]) => void
): ((edits: CellEdit<TRow>[]) => unknown) | undefined {
  if (!apply) return undefined;
  return (edits) => recordedGesture(record, edits, () => apply(edits));
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
  return (edits) =>
    recordedGesture(record, cellsOfBatch(edits), () => apply(edits));
}
