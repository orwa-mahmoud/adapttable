/**
 * Headless editing state machine: one active cell, draft value, and the
 * Enter / Escape / Tab keyboard flow.
 *
 * Opt-in by design — calling this hook alone does nothing visible. Adapters
 * only surface editors when the table passes `onCellEdit` (see
 * {@link TableChrome.editing}) and a column sets `editable`.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import {
  type CellEditCommit,
  type CellEditTarget,
  type EditableColumnLike,
  isCellEditable,
  readEditableCellValue,
  stepEditableCell,
} from "./cellEditing";
import type { EditEventHandler } from "./editingEvents";
import { observeEdit } from "./editingEvents";

/**
 * Keyboard outcome from {@link CellEditingState.handleKeyDown}.
 *
 * @public
 */
export type CellEditKeyAction = "commit" | "cancel" | "commit-advance";

/**
 * Row/column context for Tab / Shift+Tab advance.
 *
 * @public
 */
export interface CellEditNavigation {
  rows: readonly unknown[];
  columns: readonly EditableColumnLike[];
  rowKey: (row: unknown) => string;
}

/**
 * Outcome of {@link CellEditingState.handleKeyDown}.
 *
 * @public
 */
export interface CellEditKeyOutcome {
  action: CellEditKeyAction;
  commit: CellEditCommit | null;
  advanceTarget: CellEditTarget | null;
}

/**
 * Headless cell-editing state returned by {@link useCellEditing}.
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
 * What {@link useCellEditing} observes, when the host wired lifecycle events.
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
  const [active, setActive] = useState<CellEditTarget | null>(null);
  const [draft, setDraft] = useState("");
  // Refs so commit/cancel always see the latest values without stale
  // closures when wired through a keydown listener.
  const activeRef = useRef(active);
  const draftRef = useRef(draft);
  activeRef.current = active;
  draftRef.current = draft;
  const openedRef = useRef<{
    rowId: string;
    columnKey: string;
    initial: string;
    row: TRow | undefined;
  } | null>(null);

  /** Update draft state and the sync ref in the same tick. */
  const writeDraft = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  /**
   * Same for the active cell: the ref exists so callers within one tick see
   * what just happened, and a `setActive` that left the ref stale made
   * `begin` right after `commit` a silent no-op — it read the cell it had
   * just closed and treated the reopen as "same cell, keep the draft".
   */
  const writeActive = useCallback((next: CellEditTarget | null) => {
    activeRef.current = next;
    setActive(next);
  }, []);

  const isActive = useCallback(
    (rowId: string, columnKey: string) =>
      active?.rowId === rowId && active.columnKey === columnKey,
    [active]
  );

  const fireCancel = useCallback(() => {
    const opened = openedRef.current;
    if (!opened?.row) return;
    observeEdit(options.onEditCancel, {
      row: opened.row,
      rowId: opened.rowId,
      columnKey: opened.columnKey,
      value: draftRef.current,
      previousValue: opened.initial,
      unit: "cell",
    });
  }, [options.onEditCancel]);

  const clearOpened = useCallback(() => {
    openedRef.current = null;
    writeActive(null);
    writeDraft("");
  }, [writeActive, writeDraft]);

  const begin = useCallback(
    (rowId: string, columnKey: string, initialValue: string, row?: unknown) => {
      const current = activeRef.current;
      if (current?.rowId === rowId && current.columnKey === columnKey) {
        return;
      }
      if (current) fireCancel();
      const typed = row as TRow | undefined;
      openedRef.current = {
        rowId,
        columnKey,
        initial: initialValue,
        row: typed,
      };
      writeActive({ rowId, columnKey });
      writeDraft(initialValue);
      if (typed !== undefined) {
        observeEdit(options.onEditStart, {
          row: typed,
          rowId,
          columnKey,
          value: initialValue,
          previousValue: initialValue,
          unit: "cell",
        });
      }
    },
    [fireCancel, options.onEditStart, writeActive, writeDraft]
  );

  const commit = useCallback((): CellEditCommit | null => {
    const current = activeRef.current;
    if (!current) return null;
    const result: CellEditCommit = {
      rowId: current.rowId,
      columnKey: current.columnKey,
      draft: draftRef.current,
    };
    openedRef.current = null;
    writeActive(null);
    writeDraft("");
    return result;
  }, [writeActive, writeDraft]);

  const cancel = useCallback(() => {
    fireCancel();
    clearOpened();
  }, [clearOpened, fireCancel]);

  const close = useCallback(() => {
    clearOpened();
  }, [clearOpened]);

  const discardIfRowMissing = useCallback(
    (rows: readonly unknown[], rowKey: (row: unknown) => string) => {
      const current = activeRef.current;
      if (!current) return;
      if (rows.some((row) => rowKey(row) === current.rowId)) return;
      openedRef.current = null;
      writeActive(null);
      writeDraft("");
    },
    [writeActive, writeDraft]
  );

  const openedRow = useCallback(() => openedRef.current?.row, []);

  const keepLive = useCallback((row: unknown) => {
    const opened = openedRef.current;
    if (!opened) return;
    openedRef.current = { ...opened, row: row as TRow };
  }, []);

  const takeLive = useCallback(
    (row: unknown, value: string) => {
      const opened = openedRef.current;
      if (!opened) return;
      openedRef.current = { ...opened, row: row as TRow, initial: value };
      writeDraft(value);
    },
    [writeDraft]
  );

  const handleKeyDown = useCallback(
    (
      event: { key: string; preventDefault: () => void; shiftKey?: boolean },
      navigation?: CellEditNavigation
    ): CellEditKeyOutcome | null => {
      if (!activeRef.current) return null;

      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
        return { action: "cancel", commit: null, advanceTarget: null };
      }

      if (event.key === "Enter") {
        event.preventDefault();
        return {
          action: "commit",
          commit: commit(),
          advanceTarget: null,
        };
      }

      if (event.key === "Tab" && navigation) {
        event.preventDefault();
        const result = commit();
        const advanceTarget = result
          ? stepEditableCell({
              rows: navigation.rows,
              columns: navigation.columns,
              rowKey: navigation.rowKey,
              from: { rowId: result.rowId, columnKey: result.columnKey },
              direction: event.shiftKey ? -1 : 1,
            })
          : null;
        return {
          action: "commit-advance",
          commit: result,
          advanceTarget,
        };
      }

      return null;
    },
    [cancel, commit]
  );

  return useMemo(
    () => ({
      active,
      draft,
      isActive,
      begin,
      setDraft: writeDraft,
      commit,
      cancel,
      close,
      discardIfRowMissing,
      openedRow,
      keepLive,
      takeLive,
      handleKeyDown,
    }),
    [
      active,
      draft,
      isActive,
      begin,
      writeDraft,
      commit,
      cancel,
      close,
      discardIfRowMissing,
      openedRow,
      keepLive,
      takeLive,
      handleKeyDown,
    ]
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
