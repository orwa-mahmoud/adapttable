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
import { type EditHistoryState } from "@adapttable/core";
import {
  createEditHistory,
  editHistoryView,
  readCellValue as readNeutralCellValue,
  recordingCellEdit,
  resolveEditHistory,
} from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

export { type EditHistoryEntry, type EditHistoryState } from "@adapttable/core";
export { asBatchGesture, asGesture } from "@adapttable/core/editing";

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
 * Remember edits so they can be replayed backwards. The rules live in
 * `@adapttable/core` (`createEditHistory`); this hook subscribes to it.
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
  const [history] = useState(() => createEditHistory<TRow>(options));
  history.configure(options);
  const counts = useSyncExternalStore(
    history.subscribe,
    history.getSnapshot,
    history.getSnapshot
  );
  const { enabled } = options;
  return useMemo(
    () => editHistoryView(history, counts, enabled),
    [history, counts, enabled]
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
 * The returned `onCellEdit` captures the previous value before the host runs
 * and records successful inline commits as one-cell gestures. Batch routes (paste, fill) must NOT go through it —
 * they record themselves through {@link asGesture}, so that two hundred pasted
 * cells undo in one press rather than two hundred.
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
  const { enabled, depth } = resolveEditHistory(editHistory);
  const history = useEditHistory<TRow>({ enabled, depth, columns, onCellEdit });
  const record = history.record;
  const recording = useMemo(
    () => recordingCellEdit(onCellEdit, record),
    [onCellEdit, record]
  );
  return { history, onCellEdit: recording };
}
