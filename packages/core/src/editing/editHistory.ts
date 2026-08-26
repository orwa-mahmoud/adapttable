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
 * "undo that paste" — and it is why the batch routes come through here rather
 * than each cell recording itself.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import type { CellEdit } from "../focus/cellEdits";
import type { ColumnDef } from "../types";
import { getPath } from "../utils/path";

/** One undoable gesture: what it wrote, and what was there before. */
export interface EditHistoryEntry<TRow> {
  /** The edits the gesture made, in the order it made them. */
  redo: readonly CellEdit<TRow>[];
  /** The values those cells held before it — the inverse, in the same order. */
  undo: readonly CellEdit<TRow>[];
}

/** What {@link useEditHistory} needs. */
export interface UseEditHistoryOptions<TRow> {
  /** Off unless the host asked for it; when false nothing is recorded. */
  enabled: boolean;
  /** How many gestures to remember. Defaults to 50. */
  depth?: number;
  /** The columns, for reading a cell's value before it changes. */
  columns: readonly ColumnDef<TRow>[];
  /** The host's commit channel — every replay goes back out through it. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
}

/** What {@link useEditHistory} returns. */
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
   * Record a batch as ONE gesture and apply it. Returns the edits so a caller
   * can keep chaining; applies nothing when history is off, in which case the
   * caller's own handler still runs.
   */
  record: (edits: readonly CellEdit<TRow>[]) => void;
}

/**
 * The value a cell holds right now, unstringified.
 *
 * The editor's seed is a string because an input needs one; an undo needs the
 * VALUE, so that putting back the number 10 does not put back `"10"`. Same
 * priority the editor uses otherwise: an explicit `editValue`, then
 * `sortValue`, then the key's data path.
 *
 * @typeParam TRow - The row type.
 * @param row - The row being read.
 * @param column - The column being read.
 * @returns The current value, in whatever type the row holds it.
 */
export function readCellValue<TRow>(
  row: TRow,
  column: ColumnDef<TRow>
): unknown {
  if (column.editValue) return column.editValue(row);
  if (column.sortValue) return column.sortValue(row);
  return getPath(row, column.key);
}

/** The default number of gestures remembered — deep enough to feel infinite. */
const DEFAULT_DEPTH = 50;

/**
 * Remember edits so they can be replayed backwards.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseEditHistoryOptions}.
 * @returns The history controls; inert when `enabled` is false.
 */
export function useEditHistory<TRow>(
  options: UseEditHistoryOptions<TRow>
): EditHistoryState<TRow> {
  const { enabled, depth = DEFAULT_DEPTH, columns, onCellEdit } = options;
  const past = useRef<EditHistoryEntry<TRow>[]>([]);
  const future = useRef<EditHistoryEntry<TRow>[]>([]);
  // Depth counts are state because buttons enable and disable on them; the
  // stacks themselves are refs, since nothing renders from their contents.
  const [counts, setCounts] = useState({ past: 0, future: 0 });
  const sync = useCallback(() => {
    setCounts({ past: past.current.length, future: future.current.length });
  }, []);

  const columnFor = useCallback(
    (key: string) => columns.find((column) => column.key === key),
    [columns]
  );

  const record = useCallback(
    (edits: readonly CellEdit<TRow>[]) => {
      if (!enabled || edits.length === 0) return;
      const undo = edits.flatMap((edit) => {
        const column = columnFor(edit.columnKey);
        return column
          ? [
              {
                row: edit.row,
                columnKey: edit.columnKey,
                value: readCellValue(edit.row, column),
              },
            ]
          : [];
      });
      past.current = [...past.current, { redo: edits, undo }].slice(-depth);
      // A new edit ends the redo line, exactly as it does in an editor: the
      // future that was undone is no longer reachable from here.
      future.current = [];
      sync();
    },
    [enabled, depth, columnFor, sync]
  );

  const replay = useCallback(
    (edits: readonly CellEdit<TRow>[]) => {
      for (const edit of edits) {
        onCellEdit?.(edit.row, edit.columnKey, edit.value);
      }
      return edits.length;
    },
    [onCellEdit]
  );

  const undo = useCallback(() => {
    const entry = past.current.at(-1);
    if (!entry) return 0;
    past.current = past.current.slice(0, -1);
    future.current = [...future.current, entry];
    sync();
    return replay(entry.undo);
  }, [replay, sync]);

  const redo = useCallback(() => {
    const entry = future.current.at(-1);
    if (!entry) return 0;
    future.current = future.current.slice(0, -1);
    past.current = [...past.current, entry];
    sync();
    return replay(entry.redo);
  }, [replay, sync]);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    sync();
  }, [sync]);

  return useMemo(
    () => ({
      enabled,
      canUndo: enabled && counts.past > 0,
      canRedo: enabled && counts.future > 0,
      undo,
      redo,
      clear,
      record,
    }),
    [enabled, counts, undo, redo, clear, record]
  );
}

/** The props a table needs for its history — the `editHistory` prop, resolved. */
export interface TableEditHistoryProps<TRow> {
  /** The `editHistory` prop as the host wrote it. */
  editHistory?: boolean | { depth?: number };
  /** The columns, for reading a cell's value before it changes. */
  columns: readonly ColumnDef<TRow>[];
  /** The host's commit channel. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => unknown;
}

/**
 * The history a `<DataTable>` runs, plus the commit channel to hand the chrome.
 *
 * The returned `onCellEdit` records each inline commit as a one-cell gesture
 * before passing it on. Batch routes (paste, fill) must NOT go through it —
 * they record themselves through {@link asGesture}, so that two hundred pasted
 * cells undo in one press rather than two hundred.
 *
 * Both the shell and the antd adapter build their chrome this way, and this is
 * the one place the rule lives.
 *
 * @typeParam TRow - The row type.
 * @param props - See {@link TableEditHistoryProps}.
 * @returns The history state and the commit channel to give the chrome.
 */
export function useTableEditHistory<TRow>(props: TableEditHistoryProps<TRow>): {
  history: EditHistoryState<TRow>;
  onCellEdit:
    ((row: TRow, key: string, nextValue: unknown) => unknown) | undefined;
} {
  const { editHistory, columns, onCellEdit } = props;
  const history = useEditHistory<TRow>({
    enabled: editHistory !== undefined && editHistory !== false,
    depth: typeof editHistory === "object" ? editHistory.depth : undefined,
    columns,
    onCellEdit,
  });
  const record = history.record;
  const recording = useCallback(
    (row: TRow, key: string, nextValue: unknown) => {
      record([{ row, columnKey: key, value: nextValue }]);
      // Hand back whatever the host returned: a promise is how a cell knows the
      // value is still on its way somewhere, and swallowing it here would make
      // every save look instant.
      return onCellEdit?.(row, key, nextValue);
    },
    [record, onCellEdit]
  );
  return { history, onCellEdit: onCellEdit ? recording : undefined };
}

/**
 * Wrap a batch handler so the whole batch is one undo entry.
 *
 * Recording happens before the handler runs: the inverse is read from the rows
 * as they are NOW, and a host that applies the edits synchronously would
 * otherwise have already changed them.
 *
 * @typeParam TRow - The row type.
 * @param apply - The resolved handler, or `undefined` when nothing receives it.
 * @param record - The history recorder.
 * @returns The wrapped handler, or `undefined` when there was none to wrap.
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
