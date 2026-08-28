/**
 * A row changed underneath an open editor.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. Silently discarding a draft
 * is the one outcome nobody forgives, so the default is to ask.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";
import { devWarn } from "../utils/devWarn";
import { type EditableColumnLike, readEditableCellValue } from "./cellEditing";

/**
 * How an unhandled conflict is resolved.
 *
 * @public
 */
export type EditConflictPolicy = "keep" | "take" | "ask";

/**
 * The host's choice, when it makes one.
 *
 * @public
 */
export type EditConflictChoice = "keep" | "take";

/**
 * One conflict. `row` is what just arrived; `previous` is the snapshot the
 * editor opened against (or last accepted).
 *
 * @public
 */
export interface EditConflict<TRow> {
  /** The incoming row. */
  row: TRow;
  /** The row as it was when the editor opened (or last accepted). */
  previous: TRow;
  /** Its stable id. */
  rowId: string;
  /** The column being edited. */
  columnKey: string;
  /** What the reader has typed. */
  draft: string;
  /** The incoming cell value. */
  incomingValue: string;
  /** The cell value the editor opened against. */
  previousValue: string;
}

/**
 * What a host returns from {@link EditConflictHandler}. `void` defers to policy.
 *
 * @public
 */
export type EditConflictHandler<TRow> = (
  conflict: EditConflict<TRow>
) => EditConflictChoice | void;

/**
 * Headless conflict state for the active editor.
 *
 * @public
 */
export interface EditConflictState<TRow> {
  /** The conflict being asked about, or `null`. */
  current: EditConflict<TRow> | null;
  /** Whether this cell is the one in conflict. */
  isConflict: (rowId: string, columnKey: string) => boolean;
  /** Keep the draft; accept the incoming row as the new snapshot. */
  keep: () => void;
  /** Replace the draft with the incoming value. */
  take: () => void;
  /**
   * Compare the open editor to the live rows. Call from the same effect that
   * discards a missing row — a conflict is that check one step milder.
   */
  reconcile: (input: ReconcileLiveEdit<TRow>) => void;
  /** Drop a conflict without choosing — the editor closed. */
  clear: () => void;
}

/**
 * What {@link EditConflictState.reconcile} needs to judge one live update.
 *
 * @public
 */
export interface ReconcileLiveEdit<TRow> {
  /** The active cell, or `null` when idle. */
  active: { rowId: string; columnKey: string } | null;
  /** The row the editor opened against. */
  openedRow: TRow | undefined;
  /** The live draft. */
  draft: string;
  /** The rendered row set. */
  rows: readonly TRow[];
  /** Columns, to read the edited field. */
  columns: readonly EditableColumnLike<TRow>[];
  /** Row identity function. */
  rowKey: (row: TRow) => string;
  /** Host version accessor — any change is a conflict, not just this cell. */
  rowVersion?: (row: TRow) => string | number;
  /** How a conflicting edit is resolved. */
  policy: EditConflictPolicy;
  /** Called when a live edit conflicts with an incoming change. */
  onEditConflict?: EditConflictHandler<TRow>;
  /** Keep: new snapshot, same draft. */
  keep: (row: TRow) => void;
  /** Take: new snapshot and the incoming value as the draft. */
  take: (row: TRow, incomingValue: string) => void;
}

/**
 * Whether the live row disagrees with the snapshot the editor opened against.
 *
 * With `rowVersion`, any version change is a conflict — the host said the row
 * moved. Without it, only the edited column's stored value counts, so an
 * unrelated field updating does not steal the draft.
 *
 * @public
 */
export function liveRowChanged<TRow>(input: {
  opened: TRow;
  current: TRow;
  column: EditableColumnLike<TRow>;
  rowVersion?: (row: TRow) => string | number;
}): boolean {
  if (input.rowVersion !== undefined) {
    return (
      String(input.rowVersion(input.opened)) !==
      String(input.rowVersion(input.current))
    );
  }
  return (
    readEditableCellValue(input.opened, input.column) !==
    readEditableCellValue(input.current, input.column)
  );
}

/** Ask the host; a throw or a void return defers to policy. */
export function resolveConflictChoice<TRow>(
  handler: EditConflictHandler<TRow> | undefined,
  conflict: EditConflict<TRow>,
  policy: EditConflictPolicy
): EditConflictChoice | "ask" {
  if (handler) {
    try {
      const choice = handler(conflict);
      if (choice === "keep" || choice === "take") return choice;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      devWarn(
        `onEditConflict threw (${detail}) — the table used editConflictPolicy instead`
      );
    }
  }
  return policy;
}

/**
 * Headless conflict state. Inert until {@link EditConflictState.reconcile}
 * sees a live row that disagrees with the open editor.
 *
 * @public
 */
export function useEditConflict<TRow>(): EditConflictState<TRow> {
  const [current, setCurrent] = useState<EditConflict<TRow> | null>(null);
  const seen = useRef("");
  const keepLive = useRef<ReconcileLiveEdit<TRow>["keep"]>(() => undefined);
  const takeLive = useRef<ReconcileLiveEdit<TRow>["take"]>(() => undefined);
  const pending = useRef<EditConflict<TRow> | null>(null);

  const clear = useCallback(() => {
    seen.current = "";
    pending.current = null;
    setCurrent(null);
  }, []);

  const keep = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict) return;
    keepLive.current(conflict.row);
    clear();
  });

  const take = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict) return;
    takeLive.current(conflict.row, conflict.incomingValue);
    clear();
  });

  const applyChoice = useEventCallback(
    (choice: EditConflictChoice | "ask", conflict: EditConflict<TRow>) => {
      if (choice === "keep") {
        keepLive.current(conflict.row);
        setCurrent(null);
        pending.current = null;
        return;
      }
      if (choice === "take") {
        takeLive.current(conflict.row, conflict.incomingValue);
        setCurrent(null);
        pending.current = null;
        return;
      }
      pending.current = conflict;
      setCurrent(conflict);
    }
  );

  const reconcile = useEventCallback((input: ReconcileLiveEdit<TRow>) => {
    keepLive.current = input.keep;
    takeLive.current = input.take;
    const { active, openedRow } = input;
    if (!active || openedRow === undefined) {
      if (seen.current !== "") clear();
      return;
    }
    const live = input.rows.find((row) => input.rowKey(row) === active.rowId);
    if (!live) {
      // Missing rows are discardIfRowMissing's job.
      if (seen.current !== "") clear();
      return;
    }
    const column = input.columns.find((item) => item.key === active.columnKey);
    if (!column) return;
    if (
      !liveRowChanged({
        opened: openedRow,
        current: live,
        column,
        rowVersion: input.rowVersion,
      })
    ) {
      if (seen.current !== "") clear();
      return;
    }
    const incomingValue = readEditableCellValue(live, column);
    const previousValue = readEditableCellValue(openedRow, column);
    const token = `${active.rowId}::${active.columnKey}::${incomingValue}`;
    if (token === seen.current) return;
    seen.current = token;
    const conflict: EditConflict<TRow> = {
      row: live,
      previous: openedRow,
      rowId: active.rowId,
      columnKey: active.columnKey,
      draft: input.draft,
      incomingValue,
      previousValue,
    };
    applyChoice(
      resolveConflictChoice(input.onEditConflict, conflict, input.policy),
      conflict
    );
  });

  const isConflict = useCallback(
    (rowId: string, columnKey: string) =>
      current?.rowId === rowId && current.columnKey === columnKey,
    [current]
  );

  return useMemo(
    () => ({
      current,
      isConflict,
      keep,
      take,
      reconcile,
      clear,
    }),
    [current, isConflict, keep, take, reconcile, clear]
  );
}
