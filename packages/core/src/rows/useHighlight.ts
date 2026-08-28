/**
 * "Flash the row I just created."
 *
 * After a save, an import or a paste, the thing that changed is somewhere in
 * a list of a thousand rows and the user has no way to find it. A brief
 * highlight answers that — and it is the kind of feature that gets built as
 * a `setTimeout` in the host, three times, slightly differently.
 *
 * Two things make it worth owning here.
 *
 * The first is that reduced motion does not mean no feedback. A user who
 * asked for less motion still needs to know which row changed; what they
 * asked to be spared is the movement. So the highlight still appears and
 * still clears — it holds steady instead of fading, and holds longer to make
 * up for the missing transition. Dropping it entirely would read the
 * preference as "tell me less", which it is not.
 *
 * The second is that a highlight has to survive the row moving. Sorting,
 * filtering and paging all reorder rows, and a mark keyed to a position
 * would light up whatever landed there. These are keyed by row id and cell
 * address, so the mark travels with the data.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

/** How long an animated highlight lasts, in milliseconds. */
const FADE_MS = 1500;

/**
 * Longer without motion: a steady mark needs more time to be noticed than
 * one that animates, because nothing about it catches the eye.
 */
const STEADY_MS = 2500;

/**
 * One highlighted cell.
 *
 * @internal
 */
export interface HighlightedCell {
  /** Identity of the row. */
  rowId: string;
  /** Key of the column. */
  columnKey: string;
}

/**
 * What {@link useHighlight} returns.
 *
 * @internal
 */
export interface HighlightState {
  /** Mark a row. Repeating it restarts the clock rather than stacking. */
  flashRow: (rowId: string) => void;
  /** Mark one cell. */
  flashCell: (cell: HighlightedCell) => void;
  /** Drop every mark now. */
  clear: () => void;
  /** Whether this row is marked. */
  isRowHighlighted: (rowId: string) => boolean;
  /** Whether this cell is marked. */
  isCellHighlighted: (rowId: string, columnKey: string) => boolean;
  /**
   * Whether the mark should animate. False when the user asked for reduced
   * motion — the mark still appears, it simply does not move.
   */
  animated: boolean;
}

const cellKey = (rowId: string, columnKey: string) => `${rowId} ${columnKey}`;

/**
 * Highlight rows and cells for a moment.
 *
 * @param enabled - Off unless the host asked; every call is then inert.
 * @returns The controls and the current marks.
 *
 * @internal
 */
export function useHighlight(enabled: boolean): HighlightState {
  const reduced = usePrefersReducedMotion();
  const [rows, setRows] = useState<ReadonlySet<string>>(() => new Set());
  const [cells, setCells] = useState<ReadonlySet<string>>(() => new Set());
  // One timer per mark, so a second flash restarts that mark's clock
  // without disturbing any other.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const duration = reduced ? STEADY_MS : FADE_MS;

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    []
  );

  const schedule = useCallback(
    (key: string, drop: () => void) => {
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          drop();
        }, duration)
      );
    },
    [duration]
  );

  const flashRow = useCallback(
    (rowId: string) => {
      if (!enabled) return;
      setRows((current) => new Set(current).add(rowId));
      schedule(`row:${rowId}`, () => {
        setRows((current) => {
          const next = new Set(current);
          next.delete(rowId);
          return next;
        });
      });
    },
    [enabled, schedule]
  );

  const flashCell = useCallback(
    ({ rowId, columnKey }: HighlightedCell) => {
      if (!enabled) return;
      const key = cellKey(rowId, columnKey);
      setCells((current) => new Set(current).add(key));
      schedule(`cell:${key}`, () => {
        setCells((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      });
    },
    [enabled, schedule]
  );

  const clear = useCallback(() => {
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setRows(new Set());
    setCells(new Set());
  }, []);

  return {
    flashRow,
    flashCell,
    clear,
    isRowHighlighted: (rowId) => rows.has(rowId),
    isCellHighlighted: (rowId, columnKey) =>
      cells.has(cellKey(rowId, columnKey)),
    animated: enabled && !reduced,
  };
}
