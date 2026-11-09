/**
 * What a cell shows while its edit is being saved, and what happens when the
 * save fails.
 *
 * `onCellEdit` may return a promise. If it does, the table knows something the
 * reader cannot see: the value is on its way somewhere. A cell that looks
 * committed while a request is still out is a lie the reader finds out about
 * only when it fails — so the cell is marked saving until the promise settles,
 * and marked failed with the reason if it rejects.
 *
 * The table still does not own the data. An optimistic table has already shown
 * the new value (the host applied it in `onCellEdit`), so a rejection has to put
 * the old one back: `onRollback` hands the host the previous value to restore,
 * because only the host can write to its own rows.
 */
import { type CellSaveState } from "@adapttable/core";
import { cellSaveView, createCellSaveStore } from "@adapttable/core/editing";
import { useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type {
  CellSaveState,
  CellSaveStatus,
  FailedCellSave,
} from "@adapttable/core";

/**
 * What {@link useCellSaveState} needs.
 *
 * @public
 */
export interface UseCellSaveStateOptions<TRow> {
  /**
   * Put the previous row back after a rejected save. Without it the table marks
   * the cell failed and leaves the value where it is — correct for a table that
   * refetches, wrong for one that applied the edit optimistically.
   */
  onRollback?: (previous: TRow, columnKey: string) => void;
  /** Turn a rejection into the sentence the cell shows. */
  formatError?: (error: unknown) => string;
  /** Observe a rejected save — never owns the outcome. */
  onEditError?: EditEventHandler<TRow>;
}

/**
 * Headless save state for inline editing.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseCellSaveStateOptions}.
 * @returns The state; inert until a commit returns a promise that rejects.
 *
 * @public
 */
export function useCellSaveState<TRow>(
  options: UseCellSaveStateOptions<TRow> = {}
): CellSaveState<TRow> {
  const [store] = useState(() => createCellSaveStore<TRow>(options));
  store.configure(options);
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
  const canRollback = options.onRollback !== undefined;
  return useMemo(
    () => cellSaveView(store, snapshot, canRollback),
    [store, snapshot, canRollback]
  );
}
