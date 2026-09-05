/**
 * Cell navigation — `@adapttable/<kit>/cell-navigation`.
 *
 * The factory and the grid hook live together, so a table that never
 * imports it never carries keyboard-grid state. The hook mounts in-tree
 * through {@link CELL_NAV_LIVE}.
 */
import type { ReactNode } from "react";

import { asGesture } from "../editing/editHistory";
import { useFindFocus } from "../find/useFindInTable";
import type { CellEdit } from "@adapttable/core";
import { GridFocusAnnouncer } from "../focus/GridFocusAnnouncer";
import { cellFillHandler, cellPasteHandler } from "@adapttable/core";
import { useGridFocus } from "../focus/useGridFocus";
import { coveredAddressSet } from "@adapttable/core";
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
  return children(gridFocus);
}

/**
 * Make the table a keyboard grid with a focused cell.
 *
 * @public
 */
export function cellNavigation(): StaticTableFeature {
  return {
    id: "cell-navigation",
    apply: () => ({ cellNavigation: true }),
    renders: [
      slotRender(CELL_NAV_LIVE, (props) => <LiveCellNav {...props} />),
      slotRender(GRID_FOCUS_ANNOUNCER, (props) => (
        <GridFocusAnnouncer focus={props.focus} />
      )),
    ],
  };
}
