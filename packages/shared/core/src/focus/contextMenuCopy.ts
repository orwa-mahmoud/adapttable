/**
 * What a context-menu Copy acts on, with cell navigation and without it.
 *
 * The menu hands a binding a {@link ContextMenuTarget} — a row key and a
 * column key, the identity of what was clicked. With cell navigation, copying
 * needs a grid address, and the two are not the same thing: a row's position
 * on screen follows the sort, the filter, the page, the pinned rows and the
 * virtual window, none of which a row key knows. The grid's `cellAt` resolves
 * it against the very rows and columns the grid was handed, so this decides
 * only WHICH cell is meant. Without cell navigation there is no grid address
 * and no range, but the target already names the row and the column, which is
 * all a single cell needs.
 */
import type {
  ContextMenuActions,
  ContextMenuTarget,
} from "../actions/contextMenuModel";
import type { ColumnMetadata } from "../contracts/columns";
import { type CellRange, cellRangeBounds } from "./cellRange";
import { clipboardRangeText, writeClipboardText } from "./clipboardRange";
import type { GridCell } from "./gridFocus";

/**
 * What {@link contextMenuCopyTarget} decided.
 *
 * @public
 */
export interface ContextMenuCopyTarget {
  /** Whether Copy has anything to act on at all. */
  readonly available: boolean;
  /**
   * The single cell to copy, or `undefined` to copy the current selection —
   * which is what the click landing inside that selection means.
   */
  readonly cell?: GridCell;
}

/**
 * As much of a grid's focus as a context-menu Copy reads.
 *
 * @public
 */
export interface ContextMenuCopyFocus {
  /** The grid address of a cell named by row key and column key. */
  readonly cellAt: (rowId: string, columnKey: string) => GridCell | undefined;
  /** The selected rectangle, or `null`. */
  readonly range: CellRange | null;
}

const NOTHING: ContextMenuCopyTarget = { available: false };

/** Whether a cell sits inside a selected rectangle. */
function inside(range: CellRange, cell: GridCell): boolean {
  const bounds = cellRangeBounds(range);
  return (
    cell.row >= bounds.fromRow &&
    cell.row <= bounds.toRow &&
    cell.col >= bounds.fromCol &&
    cell.col <= bounds.toCol
  );
}

/**
 * Decide what a context-menu Copy copies under cell navigation.
 *
 * Right-clicking a cell with nothing selected copies that cell. Right-clicking
 * inside a selection keeps the selection — the rectangle is what the reader
 * built and is asking for. Right-clicking outside one copies the cell under
 * the cursor, because a selection somewhere else is not what was pointed at.
 *
 * A target that names no cell — a row menu over a pinned spacer, a header —
 * copies nothing rather than inventing a coordinate.
 *
 * @param focus - Live grid focus, for `cellAt` and the current range.
 * @param target - What the menu was opened over.
 * @returns Whether Copy can run, and the cell it should take.
 *
 * @public
 */
export function contextMenuCopyTarget(
  focus: ContextMenuCopyFocus,
  target: { kind: string; rowId?: string; columnKey?: string }
): ContextMenuCopyTarget {
  if (target.kind !== "cell") return NOTHING;
  if (target.rowId === undefined || target.columnKey === undefined) {
    return NOTHING;
  }
  const cell = focus.cellAt(target.rowId, target.columnKey);
  if (!cell) return NOTHING;
  if (focus.range && inside(focus.range, cell)) return { available: true };
  return { available: true, cell };
}

/**
 * Copy — or cut — what a context menu was opened over, under cell navigation:
 * the clicked cell, or the selection it landed in.
 *
 * @param focus - Live grid focus, with its copy.
 * @param target - What the menu was opened over.
 * @param cut - Cut instead of copy.
 *
 * @public
 */
export function copyContextMenuSelection(
  focus: ContextMenuCopyFocus & {
    readonly copyCells: (cell?: GridCell, cut?: boolean) => void;
  },
  target: { kind: string; rowId?: string; columnKey?: string },
  cut?: boolean
): void {
  const copy = contextMenuCopyTarget(focus, target);
  if (!copy.available) return;
  if (cut === undefined) focus.copyCells(copy.cell);
  else focus.copyCells(copy.cell, cut);
}

/**
 * Copy the one cell a context menu was opened over, without cell navigation.
 * The text is the cell's export value, as a range copy writes it. The menu
 * has closed and nothing announces a result, so a refused clipboard leaves
 * the clipboard as it was.
 *
 * @typeParam TRow - The row type.
 * @param columns - The visible columns.
 * @param target - What the menu was opened over.
 *
 * @public
 */
export function copyContextMenuTargetCell<TRow>(
  columns: readonly ColumnMetadata<TRow>[],
  target: ContextMenuTarget<TRow>
): void {
  if (target.kind !== "cell") return;
  const column = columns.find((item) => item.key === target.columnKey);
  if (!column) return;
  const text = clipboardRangeText({
    range: { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } },
    rows: [target.row],
    columns: [column],
  });
  void writeClipboardText(text);
}

/**
 * The menu's actions, with Copy acting on the right-clicked cell when there is
 * no grid selection for it to act on. With cell navigation, or without a Copy
 * at all, the actions are handed back unchanged.
 *
 * @typeParam TRow - The row type.
 * @typeParam TActions - The actions object.
 * @param actions - The menu's actions.
 * @param columns - The visible columns.
 * @param gridNavigation - Whether cell navigation is composed.
 * @returns The actions Copy should run with.
 *
 * @public
 */
export function withContextMenuCellCopy<
  TRow,
  TActions extends ContextMenuActions<TRow>,
>(
  actions: TActions,
  columns: readonly ColumnMetadata<TRow>[],
  gridNavigation: boolean
): TActions {
  if (gridNavigation || !actions.onCopy) return actions;
  return {
    ...actions,
    onCopy: (target: ContextMenuTarget<TRow>) => {
      copyContextMenuTargetCell(columns, target);
    },
  };
}
