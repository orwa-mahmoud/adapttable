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
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import type { EditEventHandler } from "./editingEvents";
import { observeEdit } from "./editingEvents";

/**
 * What a cell's last save is doing.
 *
 * @internal
 */
export type CellSaveStatus = "saving" | "failed";

/**
 * One cell's failed save, with what it takes to retry or undo it.
 *
 * @internal
 */
export interface FailedCellSave<TRow> {
  /** The row as it was before the edit — what a rollback restores. */
  previous: TRow;
  /** The value the reader tried to save. */
  attempted: unknown;
  /** Why it failed, in a sentence a reader can read. */
  message: string;
}

/**
 * What {@link useCellSaveState} needs.
 *
 * @internal
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
 * @internal
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

/** `rowId` and `columnKey` as one map key. */
const cellKey = (rowId: string, columnKey: string) => `${rowId} ${columnKey}`;

/** The default sentence for a rejection of any shape. */
function defaultFormatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error !== "") return error;
  return "Could not save";
}

/** Whether a value is a promise the table should wait on. */
function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * Headless save state for inline editing.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseCellSaveStateOptions}.
 * @returns The state; inert until a commit returns a promise that rejects.
 *
 * @internal
 */
export function useCellSaveState<TRow>(
  options: UseCellSaveStateOptions<TRow> = {}
): CellSaveState<TRow> {
  const [saving, setSaving] = useState<ReadonlySet<string>>(() => new Set());
  const [failures, setFailures] = useState<
    ReadonlyMap<string, FailedCellSave<TRow>>
  >(() => new Map());
  // One token per cell: a save that settles after a newer one started must not
  // mark a cell about a value the reader has already replaced.
  const tokens = useRef(new Map<string, number>());

  const markSaving = useEventCallback((key: string, busy: boolean) => {
    setSaving((current) => {
      if (current.has(key) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  });

  const setFailure = useEventCallback(
    (key: string, failure: FailedCellSave<TRow> | undefined) => {
      setFailures((current) => {
        if (failure === undefined && !current.has(key)) return current;
        const next = new Map(current);
        if (failure === undefined) next.delete(key);
        else next.set(key, failure);
        return next;
      });
    }
  );

  const track = useEventCallback(
    async (input: {
      rowId: string;
      columnKey: string;
      previous: TRow;
      attempted: unknown;
      previousValue?: unknown;
      result: unknown;
    }): Promise<boolean> => {
      const { rowId, columnKey, previous, attempted, previousValue, result } =
        input;
      // A host that saves synchronously has nothing to wait for, and paying a
      // render for a state that lasts no time would be worse than useless.
      if (!isThenable(result)) return true;

      const key = cellKey(rowId, columnKey);
      const token = (tokens.current.get(key) ?? 0) + 1;
      tokens.current.set(key, token);
      const current = () => tokens.current.get(key) === token;

      setFailure(key, undefined);
      markSaving(key, true);
      try {
        await result;
        if (current()) setFailure(key, undefined);
        return true;
      } catch (error) {
        // A superseded save says nothing either way: a newer one owns the cell.
        if (!current()) return false;
        const message = (options.formatError ?? defaultFormatError)(error);
        setFailure(key, {
          previous,
          attempted,
          message,
        });
        observeEdit(options.onEditError, {
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
        if (current()) markSaving(key, false);
      }
    }
  );

  const rollback = useEventCallback((rowId: string, columnKey: string) => {
    const key = cellKey(rowId, columnKey);
    const failure = failures.get(key);
    if (!failure) return;
    setFailure(key, undefined);
    options.onRollback?.(failure.previous, columnKey);
  });

  const clear = useEventCallback((rowId: string, columnKey: string) => {
    setFailure(cellKey(rowId, columnKey), undefined);
  });

  const signature = useMemo(
    () =>
      [
        ...saving,
        ...[...failures.entries()].map(([key, f]) => key + f.message),
      ].join(""),
    [saving, failures]
  );

  const statusFor = useCallback(
    (rowId: string, columnKey: string): CellSaveStatus | undefined => {
      const key = cellKey(rowId, columnKey);
      if (saving.has(key)) return "saving";
      return failures.has(key) ? "failed" : undefined;
    },
    [saving, failures]
  );

  const failureFor = useCallback(
    (rowId: string, columnKey: string) =>
      failures.get(cellKey(rowId, columnKey)),
    [failures]
  );

  return useMemo(
    () => ({
      statusFor,
      failureFor,
      track,
      rollback,
      clear,
      signature,
      canRollback: options.onRollback !== undefined,
    }),
    [
      statusFor,
      failureFor,
      track,
      rollback,
      clear,
      signature,
      options.onRollback,
    ]
  );
}
