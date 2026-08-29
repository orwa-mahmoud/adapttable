/**
 * Which cells have been changed since the reader last saw them agree with the
 * server.
 *
 * A save can be in flight, or it can have landed and not yet be confirmed by
 * anything the reader trusts — an optimistic table shows a value the server has
 * not acknowledged. Both are "changed but not settled", and both deserve a mark,
 * because a table that looks identical before and after a save gives the reader
 * no way to tell what is still at risk.
 *
 * The table does not decide when a value is settled: the host does, by handing
 * back a promise that resolves, or by calling `confirm` when a refetch agrees.
 * Marks clear on confirmation and on rollback, and never on their own — a mark
 * that fades on a timer says the change is safe when nobody checked.
 */
import { useCallback, useMemo, useState } from "react";

import { useEventCallback } from "../hooks/useEventCallback";

/**
 * Dirty state for the whole table.
 *
 * @public
 */
export interface DirtyCellState {
  /** Whether this cell holds a change nobody has confirmed. */
  isDirty: (rowId: string, columnKey: string) => boolean;
  /** Whether any cell in this row does — what a row marker reads. */
  isRowDirty: (rowId: string) => boolean;
  /** How many cells are waiting, for a "3 unsaved changes" line. */
  count: number;
  /** Mark a cell changed. */
  mark: (rowId: string, columnKey: string) => void;
  /** Clear one cell — a save confirmed, or a change undone. */
  confirm: (rowId: string, columnKey: string) => void;
  /** Clear every cell in one row. */
  confirmRow: (rowId: string) => void;
  /** Clear everything — what a successful refetch means. */
  confirmAll: () => void;
  /** A digest of the marks, for a row memo comparator. */
  signature: string;
}

/**
 * What {@link useDirtyCells} needs.
 *
 * @public
 */
export interface UseDirtyCellsOptions {
  /**
   * Whether to mark at all. Off by default: a mark is a claim about what the
   * server has agreed to, and a table whose host never says would be guessing.
   */
  enabled?: boolean;
}

/** `rowId` and `columnKey` as one map key. */
const cellKey = (rowId: string, columnKey: string) => `${rowId} ${columnKey}`;

/**
 * Headless dirty-cell state for inline editing.
 *
 * @param options - See {@link UseDirtyCellsOptions}.
 * @returns The state; inert unless `enabled`.
 *
 * @public
 */
export function useDirtyCells(
  options: UseDirtyCellsOptions = {}
): DirtyCellState {
  const enabled = options.enabled ?? false;
  const [dirty, setDirty] = useState<ReadonlySet<string>>(() => new Set());

  const mark = useEventCallback((rowId: string, columnKey: string) => {
    if (!enabled) return;
    setDirty((current) => {
      const key = cellKey(rowId, columnKey);
      if (current.has(key)) return current;
      return new Set(current).add(key);
    });
  });

  const confirm = useEventCallback((rowId: string, columnKey: string) => {
    setDirty((current) => {
      const key = cellKey(rowId, columnKey);
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  });

  const confirmRow = useEventCallback((rowId: string) => {
    setDirty((current) => {
      const prefix = `${rowId} `;
      const next = new Set(
        [...current].filter((key) => !key.startsWith(prefix))
      );
      return next.size === current.size ? current : next;
    });
  });

  const confirmAll = useEventCallback(() => {
    setDirty((current) => (current.size === 0 ? current : new Set()));
  });

  const isDirty = useCallback(
    (rowId: string, columnKey: string) => dirty.has(cellKey(rowId, columnKey)),
    [dirty]
  );

  const isRowDirty = useCallback(
    (rowId: string) => {
      const prefix = `${rowId} `;
      for (const key of dirty) {
        if (key.startsWith(prefix)) return true;
      }
      return false;
    },
    [dirty]
  );

  const signature = useMemo(() => [...dirty].join(""), [dirty]);

  return useMemo(
    () => ({
      isDirty,
      isRowDirty,
      count: dirty.size,
      mark,
      confirm,
      confirmRow,
      confirmAll,
      signature,
    }),
    [
      isDirty,
      isRowDirty,
      dirty.size,
      mark,
      confirm,
      confirmRow,
      confirmAll,
      signature,
    ]
  );
}
