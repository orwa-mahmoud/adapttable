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
import {
  cellSaveFailure,
  cellSaveSignature,
  type CellSaveStatus,
  cellSaveStatus,
  createCellSaveStore,
  type FailedCellSave,
} from "@adapttable/core";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type { CellSaveStatus, FailedCellSave } from "@adapttable/core";

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
  const signature = useMemo(() => cellSaveSignature(snapshot), [snapshot]);

  const statusFor = useCallback(
    (rowId: string, columnKey: string): CellSaveStatus | undefined =>
      cellSaveStatus(snapshot, rowId, columnKey),
    [snapshot]
  );

  const failureFor = useCallback(
    (rowId: string, columnKey: string) =>
      cellSaveFailure(snapshot, rowId, columnKey),
    [snapshot]
  );

  return useMemo(
    () => ({
      statusFor,
      failureFor,
      track: store.track,
      rollback: store.rollback,
      clear: store.clear,
      signature,
      canRollback: options.onRollback !== undefined,
    }),
    [statusFor, failureFor, store, signature, options.onRollback]
  );
}
