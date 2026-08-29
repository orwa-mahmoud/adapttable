/**
 * The find bar's state: the query, the hits, and which one you are on.
 *
 * It knows nothing about focus. The shell moves focus to the current match
 * through the grid it already has, which keeps this hook pure enough to test
 * without a DOM and stops two pieces of code owning "where the table is
 * looking".
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CellRange } from "../focus/cellRange";
import { singleCellRange } from "../focus/cellRange";
import type { GridCell } from "../focus/gridFocus";
import type { ColumnDef } from "../types";
import { findMatches, matchKeySet, stepMatch } from "./findMatches";

/**
 * What `useFindInTable` needs.
 *
 * @public
 */
export interface UseFindInTableOptions<TRow> {
  /** Off unless the host asked for it; when false nothing is searched. */
  enabled: boolean;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
}

/**
 * What `useFindInTable` returns.
 *
 * @public
 */
export interface FindInTableState {
  /** Whether the bar is showing. */
  open: boolean;
  /** Show or hide the bar. Hiding clears the query, as a find bar does. */
  setOpen: (open: boolean) => void;
  /** The current query. */
  query: string;
  /** Type into the find bar. Resets the walk to the first hit. */
  setQuery: (query: string) => void;
  /** Every matching cell, in reading order. */
  matches: readonly GridCell[];
  /** Their keys, for marking cells as this render walks them. */
  matchKeys: ReadonlySet<string>;
  /** Which match the walk is on, from zero; `-1` when there are none. */
  index: number;
  /** The cell the walk is on, or `null`. */
  current: GridCell | null;
  /** Step to the next hit, wrapping at the end. */
  next: () => void;
  /** Step to the previous hit, wrapping at the start. */
  previous: () => void;
  /**
   * Open the bar — what Ctrl/Cmd+F and a host's own button call. `undefined`
   * when the feature is off, so the shortcut stays the BROWSER'S rather than
   * being swallowed by a table that has no bar to show.
   */
  openBar?: () => void;
}

/**
 * Find state over the loaded rows.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link UseFindInTableOptions}.
 * @returns The state; inert with `enabled` false.
 *
 * @public
 */
export function useFindInTable<TRow>(
  options: UseFindInTableOptions<TRow>
): FindInTableState {
  const { enabled, rows, columns, firstRowIndex = 0 } = options;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(-1);

  const matches = useMemo(
    () =>
      enabled && open
        ? findMatches({ query, rows, columns, firstRowIndex })
        : [],
    [enabled, open, query, rows, columns, firstRowIndex]
  );
  const matchKeys = useMemo(() => matchKeySet(matches), [matches]);

  const writeQuery = useCallback((next: string) => {
    setQuery(next);
    // A new query starts the walk again: staying on hit 9 of the last search
    // would land the user somewhere unrelated.
    setIndex(next.trim() === "" ? -1 : 0);
  }, []);

  const writeOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      // Closing clears the query, so reopening starts clean and no cell stays
      // marked behind a bar that is no longer on screen.
      if (!next) writeQuery("");
    },
    [writeQuery]
  );

  const step = useCallback(
    (by: number) => {
      setIndex((current) => stepMatch(current, matches.length, by));
    },
    [matches.length]
  );
  const openBar = useCallback(() => {
    writeOpen(true);
  }, [writeOpen]);
  const next = useCallback(() => {
    step(1);
  }, [step]);
  const previous = useCallback(() => {
    step(-1);
  }, [step]);

  // The walk can outlive its target: typing narrows the hits, and a row can
  // leave the window on the next page. Clamp rather than pointing at nothing.
  const safeIndex =
    matches.length === 0
      ? -1
      : Math.min(Math.max(index, 0), matches.length - 1);

  return useMemo(
    () => ({
      open: enabled && open,
      setOpen: writeOpen,
      query,
      setQuery: writeQuery,
      matches,
      matchKeys,
      index: safeIndex,
      current: safeIndex === -1 ? null : (matches[safeIndex] ?? null),
      next,
      previous,
      openBar: enabled ? openBar : undefined,
    }),
    [
      enabled,
      open,
      writeOpen,
      query,
      writeQuery,
      matches,
      matchKeys,
      safeIndex,
      next,
      previous,
      openBar,
    ]
  );
}

/**
 * Take the table's focus to whichever match the walk is on.
 *
 * Highlighting alone is not finding: with 500 rows rendered, the hit is
 * usually off-screen, so the walk moves focus — which scrolls the cell into
 * view, announces it, and leaves it selected. Both the shell and the antd
 * adapter wire find this way, and this is the one place that rule lives.
 *
 * @param current - The match the walk is on, or `null`.
 * @param focusCell - The grid's `focusCell`.
 * @param selectRange - The grid's `selectRange`.
 *
 * @public
 */
export function useFindFocus(
  current: GridCell | null,
  focusCell: (cell: GridCell) => void,
  selectRange: (range: CellRange | null) => void
): void {
  useEffect(() => {
    if (!current) return;
    focusCell(current);
    selectRange(singleCellRange(current));
  }, [current, focusCell, selectRange]);
}
