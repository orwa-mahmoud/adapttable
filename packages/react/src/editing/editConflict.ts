/**
 * A row changed underneath an open editor.
 *
 * The table does not own the data, so it cannot merge. It can keep what the
 * reader typed, take the incoming value, or ask. Silently discarding a draft
 * is the one outcome nobody forgives, so the default is to ask.
 */
import {
  devWarn,
  type EditableColumnLike,
  readEditableCellValue,
} from "@adapttable/core";
import { useCallback, useMemo, useRef, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

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
  /**
   * What the reader has open: one cell, or a whole row edited as one unit.
   * A row conflict names no column — every field in the form is affected.
   */
  unit: "cell" | "row";
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
  /** Whether this row's open form is the one in conflict. */
  isRowConflict: (rowId: string) => boolean;
  /** Keep the draft; accept the incoming row as the new snapshot. */
  keep: () => void;
  /** Replace the draft with the incoming value. */
  take: () => void;
  /**
   * Compare the open editor to the live rows. Call from the same effect that
   * discards a missing row — a conflict is that check one step milder.
   */
  reconcile: (input: ReconcileLiveEdit<TRow>) => void;
  /**
   * The same check for a row edited as one unit: the whole form is measured
   * against the row it opened on, so any change to that row is the conflict.
   */
  reconcileRow: (input: ReconcileLiveRowEdit<TRow>) => void;
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
 * What {@link EditConflictState.reconcileRow} needs to judge one live update
 * against an open row form.
 *
 * @public
 */
export interface ReconcileLiveRowEdit<TRow> {
  /** The open row's id, or `null` when no form is open. */
  activeRowId: string | null;
  /** The row the form opened against. */
  openedRow: TRow | undefined;
  /** The rendered row set. */
  rows: readonly TRow[];
  /** Columns, to compare the fields the form holds. */
  columns: readonly EditableColumnLike<TRow>[];
  /** Row identity function. */
  rowKey: (row: TRow) => string;
  /** Host version accessor — any change is a conflict. */
  rowVersion?: (row: TRow) => string | number;
  /** How a conflicting edit is resolved. */
  policy: EditConflictPolicy;
  /** Called when a live edit conflicts with an incoming change. */
  onEditConflict?: EditConflictHandler<TRow>;
  /** Keep: new snapshot, the drafts stand. */
  keep: (row: TRow) => void;
  /** Take: reseed every draft from the incoming row. */
  take: (row: TRow) => void;
}

/**
 * Whether an incoming row disagrees with the snapshot a row form opened on.
 *
 * With `rowVersion` the host has already answered. Without it, any editable
 * field whose stored value moved counts — the form holds them all.
 */
function liveRowFormChanged<TRow>(input: {
  opened: TRow;
  current: TRow;
  columns: readonly EditableColumnLike<TRow>[];
  rowVersion?: (row: TRow) => string | number;
}): boolean {
  if (input.rowVersion !== undefined) {
    return (
      String(input.rowVersion(input.opened)) !==
      String(input.rowVersion(input.current))
    );
  }
  return input.columns.some(
    (column) =>
      column.editable !== undefined &&
      column.editable !== false &&
      readEditableCellValue(input.opened, column) !==
        readEditableCellValue(input.current, column)
  );
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
  /**
   * How to answer the conflict being asked about — captured from the pass that
   * raised it. A cell and a row form resolve differently, and a table that
   * edits both composes both passes, so the answer travels with the question
   * rather than sitting in one place for either pass to overwrite.
   */
  const answer = useRef<{
    keep: (row: TRow) => void;
    take: (row: TRow, value: string) => void;
  } | null>(null);
  const pending = useRef<EditConflict<TRow> | null>(null);

  const clear = useCallback(() => {
    seen.current = "";
    pending.current = null;
    answer.current = null;
    setCurrent(null);
  }, []);

  /**
   * Drop a conflict only if it belongs to the unit asking.
   *
   * Both reconcilers run on every live update, and a table in row mode has no
   * open cell — so an unscoped clear let the cell pass wipe the question the
   * row pass had just asked, which the row pass then asked again.
   */
  const clearUnit = useCallback(
    (unit: "cell" | "row") => {
      if (!seen.current.startsWith(`${unit}::`)) return;
      clear();
    },
    [clear]
  );

  const keep = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict || !answer.current) return;
    answer.current.keep(conflict.row);
    clear();
  });

  const take = useEventCallback(() => {
    const conflict = pending.current ?? current;
    if (!conflict || !answer.current) return;
    answer.current.take(conflict.row, conflict.incomingValue);
    clear();
  });

  const applyChoice = useEventCallback(
    (
      choice: EditConflictChoice | "ask",
      conflict: EditConflict<TRow>,
      how: {
        keep: (row: TRow) => void;
        take: (row: TRow, value: string) => void;
      }
    ) => {
      if (choice === "keep") {
        how.keep(conflict.row);
        setCurrent(null);
        pending.current = null;
        answer.current = null;
        return;
      }
      if (choice === "take") {
        how.take(conflict.row, conflict.incomingValue);
        setCurrent(null);
        pending.current = null;
        answer.current = null;
        return;
      }
      answer.current = how;
      pending.current = conflict;
      setCurrent(conflict);
    }
  );

  const reconcile = useEventCallback((input: ReconcileLiveEdit<TRow>) => {
    const { active, openedRow } = input;
    if (!active || openedRow === undefined) {
      clearUnit("cell");
      return;
    }
    const live = input.rows.find((row) => input.rowKey(row) === active.rowId);
    if (!live) {
      // Missing rows are discardIfRowMissing's job.
      clearUnit("cell");
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
      clearUnit("cell");
      return;
    }
    const incomingValue = readEditableCellValue(live, column);
    const previousValue = readEditableCellValue(openedRow, column);
    const token = `cell::${active.rowId}::${active.columnKey}::${incomingValue}`;
    if (token === seen.current) return;
    seen.current = token;
    const conflict: EditConflict<TRow> = {
      unit: "cell",
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
      conflict,
      { keep: input.keep, take: input.take }
    );
  });

  const reconcileRow = useEventCallback((input: ReconcileLiveRowEdit<TRow>) => {
    const { activeRowId, openedRow } = input;
    if (activeRowId === null || openedRow === undefined) {
      clearUnit("row");
      return;
    }
    const live = input.rows.find((row) => input.rowKey(row) === activeRowId);
    if (!live) {
      clearUnit("row");
      return;
    }
    if (
      !liveRowFormChanged({
        opened: openedRow,
        current: live,
        columns: input.columns,
        rowVersion: input.rowVersion,
      })
    ) {
      clearUnit("row");
      return;
    }
    const version = input.rowVersion
      ? String(input.rowVersion(live))
      : input.columns
          .map((column) => readEditableCellValue(live, column))
          .join("\u0000");
    const token = `row::${activeRowId}::${version}`;
    if (token === seen.current) return;
    seen.current = token;
    const conflict: EditConflict<TRow> = {
      unit: "row",
      row: live,
      previous: openedRow,
      rowId: activeRowId,
      // A row form holds every field, so no single column names the clash.
      columnKey: "",
      draft: "",
      incomingValue: "",
      previousValue: "",
    };
    applyChoice(
      resolveConflictChoice(input.onEditConflict, conflict, input.policy),
      conflict,
      {
        keep: input.keep,
        // A row form is reseeded whole; no single incoming value names it.
        take: (row) => {
          input.take(row);
        },
      }
    );
  });

  const isConflict = useCallback(
    (rowId: string, columnKey: string) =>
      current?.unit === "cell" &&
      current.rowId === rowId &&
      current.columnKey === columnKey,
    [current]
  );

  const isRowConflict = useCallback(
    (rowId: string) => current?.unit === "row" && current.rowId === rowId,
    [current]
  );

  return useMemo(
    () => ({
      current,
      isConflict,
      isRowConflict,
      keep,
      take,
      reconcile,
      reconcileRow,
      clear,
    }),
    [
      current,
      isConflict,
      isRowConflict,
      keep,
      take,
      reconcile,
      reconcileRow,
      clear,
    ]
  );
}
