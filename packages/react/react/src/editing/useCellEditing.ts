/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * Opt-in by design — calling this hook alone does nothing visible. Adapters
 * only surface editors when the table passes `onCellEdit` (see
 * {@link TableChrome.editing}) and a column sets `editable`.
 */
import {
  type CellEditCommit,
  type CellEditKeyOutcome,
  type CellEditNavigation,
  type CellEditTarget,
  createCellEditSession,
  type EditableColumnLike,
  isCellEditable,
  isCellEditActive,
  readEditableCellValue,
} from "@adapttable/core";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { EditEventHandler } from "./editingEvents";

export type {
  CellEditKeyAction,
  CellEditKeyOutcome,
  CellEditNavigation,
} from "@adapttable/core";

/**
 * Headless cell-editing state returned by `useCellEditing`.
 *
 * @public
 */
export interface CellEditingState {
  /** The cell currently being edited, or `null` when idle. */
  active: CellEditTarget | null;
  /** Live draft string for the active editor. */
  draft: string;
  /** Whether `(rowId, columnKey)` is the active cell. */
  isActive: (rowId: string, columnKey: string) => boolean;
  /**
   * Start editing a cell. Re-beginning the same cell keeps the draft;
   * switching cells abandons the previous draft without committing.
   * Pass the row so lifecycle observers can name what opened.
   */
  begin: (
    rowId: string,
    columnKey: string,
    initialValue: string,
    row?: unknown
  ) => void;
  /** Update the draft without committing. */
  setDraft: (value: string) => void;
  /**
   * Commit the draft. Returns the commit payload, or `null` when idle.
   * Clears the active cell. The table never mutates rows — callers must
   * apply the result through `onCellEdit` (see `applyCellEditCommit`).
   */
  commit: () => CellEditCommit | null;
  /**
   * Cancel editing and clear the active cell (Escape). Adapters should
   * restore focus to the cell that was being edited.
   */
  cancel: () => void;
  /**
   * Close the editor without treating it as a cancel — what a successful
   * validation does before handing the value to the host. Observers do not
   * hear about this; the commit event fires from the send instead.
   */
  close: () => void;
  /**
   * Drop the active edit when its row leaves the current page/filter set
   * (no commit). No-op when idle or the row is still present.
   */
  discardIfRowMissing: (
    rows: readonly unknown[],
    rowKey: (row: unknown) => string
  ) => void;
  /**
   * The row the editor opened against, so a live update can be compared to
   * what the reader started from.
   */
  openedRow: () => unknown;
  /**
   * Keep the draft and accept `row` as the new snapshot — the incoming
   * change is acknowledged, the typing is not.
   */
  keepLive: (row: unknown) => void;
  /**
   * Replace the draft with `value` and accept `row` as the new snapshot —
   * the reader takes the incoming cell.
   */
  takeLive: (row: unknown, value: string) => void;
  /**
   * Keyboard flow:
   * - Enter → commit
   * - Escape → cancel (adapters restore focus)
   * - Tab → commit and advance; Shift+Tab → commit and go previous
   *
   * Returns `null` when idle or for unrelated keys (so the input keeps
   * default behaviour).
   */
  handleKeyDown: (
    event: { key: string; preventDefault: () => void; shiftKey?: boolean },
    navigation?: CellEditNavigation
  ) => CellEditKeyOutcome | null;
}

/**
 * What `useCellEditing` observes, when the host wired lifecycle events.
 *
 * @public
 */
export interface UseCellEditingOptions<TRow = unknown> {
  /** An editor opened. */
  onEditStart?: EditEventHandler<TRow>;
  /** The reader threw the draft away (Escape, or switching cells). */
  onEditCancel?: EditEventHandler<TRow>;
}

/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * @typeParam TRow - The row type, when lifecycle observers are wired.
 * @param options - Optional start/cancel observers.
 * @returns The state machine.
 *
 * @public
 */
export function useCellEditing<TRow = unknown>(
  options: UseCellEditingOptions<TRow> = {}
): CellEditingState {
  const [session] = useState(() => createCellEditSession<TRow>(options));
  session.configure(options);
  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot
  );
  const { active, draft } = snapshot;

  const isActive = useCallback(
    (rowId: string, columnKey: string) =>
      isCellEditActive(snapshot, rowId, columnKey),
    [snapshot]
  );

  return useMemo(
    () => ({
      active,
      draft,
      isActive,
      begin: session.begin,
      setDraft: session.setDraft,
      commit: session.commit,
      cancel: session.cancel,
      close: session.close,
      discardIfRowMissing: session.discardIfRowMissing,
      openedRow: session.openedRow,
      keepLive: session.keepLive,
      takeLive: session.takeLive,
      handleKeyDown: session.handleKeyDown,
    }),
    [active, draft, isActive, session]
  );
}

/**
 * Begin editing when the column is editable for this row; no-op otherwise.
 * Prefer this over raw `begin` so adapters never open an editor the host
 * didn't opt into.
 */
export function beginCellEdit<TRow>(
  editing: CellEditingState,
  row: TRow,
  column: EditableColumnLike<TRow>,
  rowKey: (row: TRow) => string
): boolean {
  if (!isCellEditable(column, row)) return false;
  editing.begin(
    rowKey(row),
    column.key,
    readEditableCellValue(row, column),
    row
  );
  return true;
}
