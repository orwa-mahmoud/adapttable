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
import {
  type CellEdit,
  createEditHistoryStack,
  DEFAULT_EDIT_HISTORY_DEPTH,
  editHistoryEntry,
  readCellValue as readNeutralCellValue,
} from "@adapttable/core";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

export {
  asBatchGesture,
  asGesture,
  type EditHistoryEntry,
} from "@adapttable/core";

import type { ColumnDef } from "../columnDef";
import type { EditHistoryOptions } from "../props";

/**
 * A cell's current value as an undo would restore it: the column's
 * `editValue`, else its `sortValue`, else the field at its key.
 *
 * @public
 */
export function readCellValue<TRow>(
  row: TRow,
  column: ColumnDef<TRow>
): unknown {
  return readNeutralCellValue(row, column);
}

/**
 * What `useEditHistory` needs.
 *
 * @public
 */
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

/**
 * What `useEditHistory` returns.
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
   * Record a batch as ONE gesture and apply it. Returns the edits so a caller
   * can keep chaining; applies nothing when history is off, in which case the
   * caller's own handler still runs.
   */
  record: (edits: readonly CellEdit<TRow>[]) => void;
}

/**
 * Remember edits so they can be replayed backwards.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseEditHistoryOptions}.
 * @returns The history controls; inert when `enabled` is false.
 *
 * @public
 */
export function useEditHistory<TRow>(
  options: UseEditHistoryOptions<TRow>
): EditHistoryState<TRow> {
  const {
    enabled,
    depth = DEFAULT_EDIT_HISTORY_DEPTH,
    columns,
    onCellEdit,
  } = options;
  const [stack] = useState(createEditHistoryStack<TRow>);
  const counts = useSyncExternalStore(
    stack.subscribe,
    stack.getSnapshot,
    stack.getSnapshot
  );

  const columnFor = useCallback(
    (key: string) => columns.find((column) => column.key === key),
    [columns]
  );

  const record = useCallback(
    (edits: readonly CellEdit<TRow>[]) => {
      if (!enabled || edits.length === 0) return;
      stack.record(
        editHistoryEntry(edits, (edit) => {
          const column = columnFor(edit.columnKey);
          return column
            ? { value: readCellValue(edit.row, column) }
            : undefined;
        }),
        depth
      );
    },
    [enabled, depth, columnFor, stack]
  );

  // An undo does not rewrite the host's data: it COMMITS the previous value
  // back through the host's own channel, so whatever wraps editing runs on
  // the way back exactly as it ran on the way out.
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
    const entry = stack.undo();
    return entry ? replay(entry.undo) : 0;
  }, [replay, stack]);

  const redo = useCallback(() => {
    const entry = stack.redo();
    return entry ? replay(entry.redo) : 0;
  }, [replay, stack]);

  return useMemo(
    () => ({
      enabled,
      canUndo: enabled && counts.past > 0,
      canRedo: enabled && counts.future > 0,
      undo,
      redo,
      clear: stack.clear,
      record,
    }),
    [enabled, counts, undo, redo, stack, record]
  );
}

/**
 * The props a table needs for its history — the `editHistory` prop, resolved.
 *
 * @public
 */
export interface TableEditHistoryProps<TRow> {
  /** The `editHistory` prop as the host wrote it. */
  editHistory?: boolean | EditHistoryOptions;
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
 *
 * @public
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
