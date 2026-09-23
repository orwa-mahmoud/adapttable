/**
 * Cell navigation — `@adapttable/<kit>/cell-navigation`.
 *
 * The factory and the grid hook live together, so a table that never
 * imports it never carries keyboard-grid state. The hook mounts in-tree
 * through {@link CELL_NAV_LIVE}.
 */
import {
  type CellEdit,
  cellFillHandler,
  cellPasteHandler,
  type CellRange,
  coveredAddressSet,
  isSingleCell,
} from "@adapttable/core";
import { type ReactNode, useEffect, useRef } from "react";

import { asGesture } from "../editing/editHistory";
import { useFindFocus } from "../find/useFindInTable";
import { GridFocusAnnouncer } from "../focus/GridFocusAnnouncer";
import { useGridFocus } from "../focus/useGridFocus";
import { slotRender } from "./providers";
import {
  CELL_NAV_LIVE,
  type CellNavLiveSlotProps,
  GRID_FOCUS_ANNOUNCER,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

function LiveCellNav({
  options,
  hostProps,
  pinOffset,
  record,
  undo,
  redo,
  onFind,
  matchKeys,
  currentMatch,
  children,
}: CellNavLiveSlotProps<never>): ReactNode {
  const coveredCells = coveredAddressSet({
    rows: options.rows,
    columns: options.columns,
    getCellSpan: hostProps.getCellSpan,
    firstRowIndex: options.firstRowIndex,
    pinOffset,
  });
  const gridFocus = useGridFocus({
    ...options,
    enabled: true,
    isCoveredCell: (cell: { row: number; col: number }) =>
      coveredCells.has(`${cell.row}:${cell.col}`),
    onPaste: asGesture(
      cellPasteHandler(hostProps),
      record as (edits: readonly CellEdit<never>[]) => void
    ),
    onFill: asGesture(
      cellFillHandler(hostProps),
      record as (edits: readonly CellEdit<never>[]) => void
    ),
    onUndo: undo,
    onRedo: redo,
    onFind,
    matchKeys,
    currentMatch,
  });
  useFindFocus(
    currentMatch ?? null,
    gridFocus.focusCell,
    gridFocus.selectRange
  );
  const reportRange = useRef(hostProps.onCellRangeChange);
  reportRange.current = hostProps.onCellRangeChange;
  const wired = hostProps.onCellRangeChange !== undefined;
  // A lone focused cell is not a selection, so it reports `null`, and the
  // host hears only when the reported rectangle changes.
  const range =
    gridFocus.range === null || isSingleCell(gridFocus.range)
      ? null
      : gridFocus.range;
  const rangeKey = range
    ? `${range.anchor.row}:${range.anchor.col}-${range.head.row}:${range.head.col}`
    : "";
  const latestRange = useRef(range);
  latestRange.current = range;
  useEffect(() => {
    if (!wired) return;
    reportRange.current?.(latestRange.current);
  }, [wired, rangeKey]);
  return children(gridFocus);
}

/**
 * Options for `cellNavigation(…)`.
 *
 * @public
 */
export interface CellNavigationOptions {
  /**
   * Told the selected rectangle whenever it changes, and once on mount —
   * `null` when nothing beyond the focused cell is selected. What a
   * "sum of selection" readout of your own reads.
   */
  readonly onRangeChange?: (range: CellRange | null) => void;
}

/**
 * Make the table a keyboard grid with a focused cell.
 *
 * @public
 */
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return {
    id: "cell-navigation",
    apply: () =>
      options.onRangeChange
        ? { cellNavigation: true, onCellRangeChange: options.onRangeChange }
        : { cellNavigation: true },
    renders: [
      slotRender(CELL_NAV_LIVE, (props) => <LiveCellNav {...props} />),
      slotRender(GRID_FOCUS_ANNOUNCER, (props) => (
        <GridFocusAnnouncer focus={props.focus} />
      )),
    ],
  };
}
