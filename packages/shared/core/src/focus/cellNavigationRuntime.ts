/**
 * Cell navigation wired to a live table: the channels the grid-focus
 * controller needs beyond its keyboard model, and how the selected range is
 * reported to the host.
 *
 * Arrow keys skip cells covered by someone else's span. A paste or a fill
 * reaches the host through its batch callback or its inline-edit channel, and
 * is recorded as ONE undo gesture, so two hundred pasted cells undo in one
 * press. Undo and redo walk that history.
 */

import type { PinOffset } from "../columns/columnLayoutModel";
import type { ColumnMetadata } from "../contracts/columns";
import { asGesture } from "../editing/editingController";
import { coveredAddressSet, type GetCellSpan } from "../rows/cellSpan";
import type { CellEdit } from "./cellEdits";
import { type CellRange, isSingleCell } from "./cellRange";
import type { GridCell } from "./gridFocus";
import type { GridFocusControllerOptions } from "./gridFocusController";
import {
  cellFillHandler,
  type CellFillHandlerOptions,
  cellPasteHandler,
  type CellPasteHandlerOptions,
} from "./pasteRange";

/**
 * What {@link cellNavigationChannels} reads.
 *
 * @public
 */
export interface CellNavigationChannelsOptions<TRow> {
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** Every visible column, in grid order. */
  readonly columns: readonly ColumnMetadata<TRow>[];
  /** Where the rendered window starts in the dataset. */
  readonly firstRowIndex?: number;
  /** Pin boundary a span may not cross. */
  readonly pinOffset?: (key: string) => PinOffset | undefined;
  /** The host's span callback and edit channels. */
  readonly host: CellPasteHandlerOptions<TRow> &
    CellFillHandlerOptions<TRow> & { readonly getCellSpan?: GetCellSpan<TRow> };
  /** Record a paste or fill as one undo gesture. */
  readonly record: (edits: readonly CellEdit<TRow>[]) => void;
  /** Undo the last gesture; returns how many cells came back. */
  readonly undo: () => number;
  /** Redo the last undone gesture; returns how many cells were rewritten. */
  readonly redo: () => number;
}

/**
 * The grid-focus controller's covered-cell, paste, fill, undo and redo
 * channels for one render.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link CellNavigationChannelsOptions}.
 * @returns The channels to merge into the grid's options.
 *
 * @public
 */
export function cellNavigationChannels<TRow>(
  options: CellNavigationChannelsOptions<TRow>
): Pick<
  GridFocusControllerOptions<TRow>,
  "isCoveredCell" | "onPaste" | "onFill" | "onUndo" | "onRedo"
> {
  const covered = coveredAddressSet({
    rows: options.rows,
    columns: options.columns,
    getCellSpan: options.host.getCellSpan,
    firstRowIndex: options.firstRowIndex,
    pinOffset: options.pinOffset,
  });
  return {
    isCoveredCell: (cell: GridCell) => covered.has(`${cell.row}:${cell.col}`),
    onPaste: asGesture(cellPasteHandler(options.host), options.record),
    onFill: asGesture(cellFillHandler(options.host), options.record),
    onUndo: options.undo,
    onRedo: options.redo,
  };
}

/**
 * The range a host is told about: `null` when nothing beyond the focused cell
 * is selected, because a lone focused cell is not a selection.
 *
 * @param range - The grid's selected rectangle.
 * @returns The rectangle to report.
 *
 * @public
 */
export function reportedCellRange(range: CellRange | null): CellRange | null {
  return range === null || isSingleCell(range) ? null : range;
}

/**
 * The reported range as one value, so the host hears only when the rectangle
 * actually changes.
 *
 * @param range - The rectangle {@link reportedCellRange} returned.
 * @returns A key; empty for `null`.
 *
 * @public
 */
export function cellRangeKey(range: CellRange | null): string {
  return range
    ? `${range.anchor.row}:${range.anchor.col}-${range.head.row}:${range.head.col}`
    : "";
}
