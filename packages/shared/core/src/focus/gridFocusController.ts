/**
 * Keyboard focus over a grid of cells — the composition.
 *
 * Base movement lives in `gridNavigation`. Range, clipboard and fill are
 * composed here, so a caller of {@link createGridNavigation} does not import
 * them. Bindings still attach the container and forward keys; this module
 * does not listen to the document itself.
 *
 * **The ARIA indices are absolute.** `aria-rowindex` counts within the
 * dataset, not within the rendered window.
 *
 * **A cell that is not mounted is still reachable.** Ctrl+End asks for a cell
 * the virtualizer may not have rendered. The controller asks `scrollToRow` for
 * the row and holds the address; {@link GridFocusController.syncFocus} focuses
 * the cell once a render produces its element.
 */
import { defaultLabels } from "../labels";
import { singleCellRange } from "./cellRange";
import {
  copyGridCells,
  copyGridSelection,
  pasteGridSelection,
} from "./gridClipboard";
import {
  canFillDown,
  enterGridFill,
  fillGridDown,
  pressGridFillHandle,
  previewGridFill,
  releaseGridPointer,
} from "./gridFill";
import type { GridCell } from "./gridFocus";
import {
  composeGridNavigation,
  type GridFocusController,
  type GridFocusControllerOptions,
  type GridKeyEvent,
  type GridNavigationParts,
  type GridNavSession,
} from "./gridNavigation";
import {
  clickGridHeader,
  enterGridSelection,
  pressGridCell,
  rangeAfterMove,
  selectGridColumn,
  selectGridRange,
  toggleGridColumn,
} from "./gridRange";

export {
  type GridCellAttributes,
  gridCellAttributes,
  type GridCellAttributesInput,
  gridColumnHeaderAttributes,
  type GridContainerAttributes,
  gridContainerAttributes,
  gridRowAttributes,
  gridRowFocusSignature,
} from "./gridAria";
export { gridFillHandleCell } from "./gridFill";
export {
  createGridNavigation,
  GRID_CELL_ATTR,
  gridCellAttr,
  type GridFocusController,
  type GridFocusControllerOptions,
  type GridFocusSnapshot,
  type GridKeyEvent,
  type PointerReleaseTarget,
} from "./gridNavigation";
export { isGridColumnSelected } from "./gridRange";

/**
 * Ctrl/Cmd+Z and its two redo spellings. The letter is compared without case.
 */
function handleHistoryKey<TRow>(
  session: GridNavSession<TRow>,
  event: GridKeyEvent
): boolean {
  const key = event.key.toLowerCase();
  const redo = (key === "z" && event.shiftKey === true) || key === "y";
  const undo = key === "z" && event.shiftKey !== true;
  if (!undo && !redo) return false;
  const run = redo ? session.options.onRedo : session.options.onUndo;
  if (!run) return false;
  const cells = run();
  const done = redo
    ? (session.labels()?.editRedone ?? defaultLabels.editRedone)
    : (session.labels()?.editUndone ?? defaultLabels.editUndone);
  session.say(
    cells === 0
      ? (session.labels()?.editNothingToUndo ?? defaultLabels.editNothingToUndo)
      : done(cells)
  );
  return true;
}

function modifiedKey<TRow>(
  session: GridNavSession<TRow>,
  event: GridKeyEvent,
  from: GridCell
): boolean {
  if (event.ctrlKey !== true && event.metaKey !== true) return false;
  if (handleHistoryKey(session, event)) {
    event.preventDefault();
    return true;
  }
  const { range } = session.snapshot;
  const { onFind, onFill, onPaste } = session.options;
  const key = event.key.toLowerCase();
  if (key === "f" && onFind) {
    event.preventDefault();
    onFind();
    return true;
  }
  if ((key === "c" || key === "x") && range) {
    event.preventDefault();
    copyGridSelection(session, range, key === "x");
    return true;
  }
  if (key === "d" && onFill && range && canFillDown(range)) {
    event.preventDefault();
    fillGridDown(session, range);
    return true;
  }
  if (key === "v" && onPaste) {
    event.preventDefault();
    pasteGridSelection(session, range ?? singleCellRange(from));
    return true;
  }
  return false;
}

function fullParts<TRow>(): GridNavigationParts<TRow> {
  return {
    previewFor: previewGridFill,
    modifiedKey,
    afterMove: rangeAfterMove,
    pressCell: pressGridCell,
    enterCell(session, cell) {
      if (enterGridFill(session, cell)) return;
      enterGridSelection(session, cell);
    },
    releasePointer: releaseGridPointer,
    pressFillHandle: pressGridFillHandle,
    copyCells: copyGridCells,
    selectRange: selectGridRange,
    selectColumn: selectGridColumn,
    toggleColumn: toggleGridColumn,
    clickHeader: clickGridHeader,
  };
}

/**
 * Create the grid-focus controller for one table.
 *
 * Navigation, range, clipboard and fill are all composed. For movement alone,
 * use {@link createGridNavigation}.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createGridFocusController<TRow>(
  initial: GridFocusControllerOptions<TRow>
): GridFocusController<TRow> {
  return composeGridNavigation(initial, fullParts());
}
