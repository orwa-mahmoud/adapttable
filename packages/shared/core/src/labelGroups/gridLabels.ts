/**
 * The strings cell navigation draws: range copy, paste and fill, and edit undo.
 */
import type { TableLabels } from "../types";

/**
 * The strings cell navigation draws: range copy, paste and fill, and edit undo.
 *
 * @public
 */
export const GRID_LABELS: Pick<
  Required<TableLabels>,
  | "gridRangeCopied"
  | "gridRangeCopyFailed"
  | "gridRangePasted"
  | "gridRangePasteFailed"
  | "gridRangeFilled"
  | "gridRangeFillFailed"
  | "gridFillHandle"
  | "selectionAverage"
  | "editUndone"
  | "editRedone"
  | "editNothingToUndo"
  | "gridCellPosition"
  | "gridRangeSelection"
> = {
  gridRangeCopied: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} copied`,
  gridRangeCopyFailed: "Copy failed",
  gridRangePasted: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} pasted`,
  gridRangePasteFailed: "Paste failed",
  gridRangeFilled: (cells) =>
    `${cells} ${cells === 1 ? "cell" : "cells"} filled`,
  gridRangeFillFailed: "Fill failed",
  gridFillHandle: "Fill from selection",
  selectionAverage: "Avg",
  editUndone: (cells) => `${cells} ${cells === 1 ? "cell" : "cells"} restored`,
  editRedone: (cells) => `${cells} ${cells === 1 ? "cell" : "cells"} redone`,
  editNothingToUndo: "Nothing to undo",
  gridCellPosition: (row, total) => `row ${row} of ${total}`,
  gridRangeSelection: ({ fromRow, toRow, fromColumn, toColumn, cells }) =>
    `selected rows ${fromRow} to ${toRow}, columns ${fromColumn} to ${toColumn}, ${cells} cells`,
};
