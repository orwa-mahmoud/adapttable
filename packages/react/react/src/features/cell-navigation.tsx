/**
 * Cell navigation — `@adapttable/<kit>/cell-navigation`.
 *
 * The factory and the grid hook live together, so a table that never
 * imports it never carries keyboard-grid state. The hook mounts in-tree
 * through {@link CELL_NAV_LIVE}.
 */
import {
  cellNavigationChannels,
  type CellRange,
  cellRangeKey,
  reportedCellRange,
} from "@adapttable/core";
import { coreCellNavigation } from "@adapttable/core/binding";
import { beginCellEdit } from "@adapttable/core/editing";
import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import type { EditableCellEditing } from "../editing/editableCellController";
import { useFindFocus } from "../find/useFindInTable";
import { GridFocusAnnouncer } from "../focus/GridFocusAnnouncer";
import { useGridFocus } from "../focus/useGridFocus";
import { RowScrollContext } from "../virtual/rowScroll";
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
  editing,
  children,
}: CellNavLiveSlotProps<never> & {
  /**
   * Present when the table composed editing. Enter and F2 open the focused
   * cell from here so the shell does not import the editing session.
   */
  readonly editing?: EditableCellEditing<never>;
}): ReactNode {
  const scrollToRow = useContext(RowScrollContext);
  const scrollToIndex = useCallback(
    (index: number) => {
      const row = options.rows[index - (options.firstRowIndex ?? 0)];
      if (row !== undefined) scrollToRow?.(row);
    },
    [options.rows, options.firstRowIndex, scrollToRow]
  );
  const gridFocus = useGridFocus({
    ...options,
    // The shell builds the grid inputs without an activate callback. Opening
    // an editor stays in this entry, which is the only module that imports it.
    onActivate: (cell) => {
      const state = editing?.state;
      if (!state) return;
      const windowStart = options.firstRowIndex ?? 0;
      const row = options.rows[cell.row - windowStart];
      const column = options.columns[cell.col];
      if (row === undefined || column === undefined) return;
      beginCellEdit(state, row, column, hostProps.rowKey);
    },
    scrollToRow: options.scrollToRow ?? scrollToIndex,
    enabled: true,
    ...cellNavigationChannels({
      rows: options.rows,
      columns: options.columns,
      firstRowIndex: options.firstRowIndex,
      pinOffset,
      host: hostProps,
      record,
      undo,
      redo,
    }),
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
  const range = reportedCellRange(gridFocus.range);
  const rangeKey = cellRangeKey(range);
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
    ...coreCellNavigation(options),
    renders: [
      slotRender(CELL_NAV_LIVE, (props) => <LiveCellNav {...props} />),
      slotRender(GRID_FOCUS_ANNOUNCER, (props) => (
        <GridFocusAnnouncer focus={props.focus} />
      )),
    ],
  };
}
