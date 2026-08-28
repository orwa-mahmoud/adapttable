/**
 * Many rows changed, saved in one go.
 *
 * Row mode holds one row's fields until the reader saves it. Batch mode holds
 * *several rows* until they save all of them — the shape of a review pass, where
 * someone walks a list correcting values and wants one write at the end rather
 * than one per row. Nothing is sent until they say so, and one Cancel puts
 * everything back.
 *
 * The table still owns none of the data: what a save produces is the list of
 * patches, and the host applies them however it applies anything else. That is
 * also what makes the write atomic if the host wants it to be — a single request
 * with every change in it.
 */
import { useCallback, useMemo, useRef, useState } from "react";

import type { FeatureHostState } from "../features/currentHost";
import { useEventCallback } from "../hooks/useEventCallback";
import type { EditableColumnLike } from "./cellEditing";
import {
  parseCellEditValue,
  readEditableCellValue,
  resolveCellEditor,
} from "./cellEditing";
import type { EditEventHandler } from "./editingEvents";
import { observeEdit } from "./editingEvents";

/**
 * One row's pending changes.
 *
 * @public
 */
export interface BatchRowEdit<TRow> {
  /** The row as it was when the reader started changing it. */
  row: TRow;
  /** Its stable id. */
  rowId: string;
  /** Parsed values by column key — only the fields that actually changed. */
  patch: Readonly<Record<string, unknown>>;
}

/**
 * Headless batch-editing state.
 *
 * @internal
 */
export interface BatchEditingState<TRow> {
  /** How many rows are waiting — what a "3 unsaved rows" line reads. */
  count: number;
  /** Whether anything is waiting at all. */
  pending: boolean;
  /** Whether this row has pending changes. */
  isPending: (rowId: string) => boolean;
  /** This cell's draft, or the row's stored value when it has none. */
  draftFor: (row: TRow, rowId: string, columnKey: string) => string;
  /** Whether this cell has been changed. */
  isChanged: (rowId: string, columnKey: string) => boolean;
  /** Change one cell, without telling the host. */
  setDraft: (
    row: TRow,
    rowId: string,
    columnKey: string,
    value: string
  ) => void;
  /** Hand the host every pending row, as one list, then forget them. */
  saveAll: () => void;
  /** Forget everything, restoring nothing — the drafts were never applied. */
  cancelAll: () => void;
  /** Forget one row's changes. */
  cancelRow: (rowId: string) => void;
  /** A digest of the pending drafts, for a row memo comparator. */
  signature: string;
  /** The table that owns these editors — never a sibling's host. */
  featureHost?: FeatureHostState;
}

/**
 * What {@link useBatchEditing} needs.
 *
 * @internal
 */
export interface UseBatchEditingOptions<TRow> {
  /**
   * Whether batch editing is armed. Off by default: it changes when a commit
   * happens, which is a decision about the data rather than a preference.
   */
  enabled?: boolean;
  /** The columns, for seeding drafts and parsing them back. */
  columns: readonly EditableColumnLike<TRow>[];
  /**
   * Take every pending row at once. The table never writes to a row, and the
   * whole point of the mode is that this is called once.
   */
  onBatchEdit?: (edits: readonly BatchRowEdit<TRow>[]) => unknown;
  /** A row became pending. */
  onEditStart?: EditEventHandler<TRow>;
  /** Pending changes were thrown away. */
  onEditCancel?: EditEventHandler<TRow>;
  /** The host received the batch. */
  onEditCommit?: EditEventHandler<TRow>;
  /** The table that owns these editors. */
  featureHost?: FeatureHostState;
}

/** The drafts of one row, by column key. */
type RowDrafts = Readonly<Record<string, string>>;

/** Every pending row's drafts, by row id. */
type PendingDrafts = Readonly<
  Record<string, { row: unknown; drafts: RowDrafts }>
>;

/**
 * Headless state for changing many rows and saving them together.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseBatchEditingOptions}.
 * @returns The state; inert unless `enabled`.
 *
 * @internal
 */
export function useBatchEditing<TRow>(
  options: UseBatchEditingOptions<TRow>
): BatchEditingState<TRow> {
  const enabled = options.enabled ?? false;
  const [pending, setPending] = useState<PendingDrafts>({});
  // A ref beside the state: a save reads the drafts in the same tick a keystroke
  // wrote one, and a control that saves on the click that also edits would
  // otherwise send the values as they were before it.
  const pendingRef = useRef<PendingDrafts>({});

  const write = useEventCallback((next: PendingDrafts) => {
    pendingRef.current = next;
    setPending(next);
  });

  const setDraft = useEventCallback(
    (row: TRow, rowId: string, columnKey: string, value: string) => {
      if (!enabled) return;
      const column = options.columns.find((entry) => entry.key === columnKey);
      if (!column) return;
      const stored = readEditableCellValue(row, column, options.featureHost);
      const current = pendingRef.current[rowId];
      const drafts = { ...current?.drafts, [columnKey]: value };
      // A value typed back to what it was is not a change, and a row left with
      // no changes is not pending — otherwise "3 unsaved rows" counts rows the
      // reader has already put back.
      if (value === stored) delete drafts[columnKey];
      const wasPending = current !== undefined;
      const next = { ...pendingRef.current };
      if (Object.keys(drafts).length === 0) delete next[rowId];
      else next[rowId] = { row: current?.row ?? row, drafts };
      write(next);
      if (!wasPending && next[rowId]) {
        observeEdit(options.onEditStart, {
          row,
          rowId,
          columnKey,
          value,
          previousValue: stored,
          unit: "batch",
        });
      }
    }
  );

  const saveAll = useEventCallback(() => {
    const current = pendingRef.current;
    const edits: BatchRowEdit<TRow>[] = [];
    for (const [rowId, entry] of Object.entries(current)) {
      const row = entry.row as TRow;
      const patch: Record<string, unknown> = {};
      for (const [columnKey, draft] of Object.entries(entry.drafts)) {
        const column = options.columns.find((one) => one.key === columnKey);
        if (!column) continue;
        patch[columnKey] = column.parseValue
          ? column.parseValue(draft, row)
          : parseCellEditValue(
              resolveCellEditor(column, options.featureHost) ?? "text",
              draft
            );
      }
      edits.push({ row, rowId, patch });
    }
    if (edits.length > 0) {
      options.onBatchEdit?.(edits);
      for (const edit of edits) {
        observeEdit(options.onEditCommit, {
          row: edit.row,
          rowId: edit.rowId,
          columnKey: "",
          value: edit.patch,
          previousValue: edit.row,
          unit: "batch",
        });
      }
    }
    write({});
  });

  const cancelAll = useEventCallback(() => {
    for (const [rowId, entry] of Object.entries(pendingRef.current)) {
      observeEdit(options.onEditCancel, {
        row: entry.row as TRow,
        rowId,
        columnKey: "",
        value: entry.drafts,
        previousValue: entry.row,
        unit: "batch",
      });
    }
    write({});
  });

  const cancelRow = useEventCallback((rowId: string) => {
    const entry = pendingRef.current[rowId];
    if (!entry) return;
    observeEdit(options.onEditCancel, {
      row: entry.row as TRow,
      rowId,
      columnKey: "",
      value: entry.drafts,
      previousValue: entry.row,
      unit: "batch",
    });
    const next = { ...pendingRef.current };
    delete next[rowId];
    write(next);
  });

  const isPending = useCallback((rowId: string) => rowId in pending, [pending]);

  const isChanged = useCallback(
    (rowId: string, columnKey: string) =>
      pending[rowId]?.drafts[columnKey] !== undefined,
    [pending]
  );

  const draftFor = useCallback(
    (row: TRow, rowId: string, columnKey: string) => {
      const draft = pending[rowId]?.drafts[columnKey];
      if (draft !== undefined) return draft;
      const column = options.columns.find((entry) => entry.key === columnKey);
      return column
        ? readEditableCellValue(row, column, options.featureHost)
        : "";
    },
    [pending, options.columns, options.featureHost]
  );

  const signature = useMemo(
    () =>
      Object.entries(pending)
        .map(
          ([rowId, entry]) =>
            `${rowId}:${Object.entries(entry.drafts)
              .map(([key, value]) => `${key}=${value}`)
              .join("|")}`
        )
        .join(";"),
    [pending]
  );

  const count = Object.keys(pending).length;

  return useMemo(
    () => ({
      count,
      pending: count > 0,
      isPending,
      isChanged,
      draftFor,
      setDraft,
      saveAll,
      cancelAll,
      cancelRow,
      signature,
      featureHost: options.featureHost,
    }),
    [
      count,
      isPending,
      isChanged,
      draftFor,
      setDraft,
      saveAll,
      cancelAll,
      cancelRow,
      signature,
      options.featureHost,
    ]
  );
}
