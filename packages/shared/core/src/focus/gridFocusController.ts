/**
 * Keyboard focus over a grid of cells — the stateful half, shared by every
 * binding.
 *
 * With cell navigation on, a table is one tab stop whose interior the arrow
 * keys reach. The controller owns everything that takes: the active cell, the
 * selected rectangle, a fill drag, the key dispatch, copy, cut and paste, and
 * the live-region announcement. A binding subscribes to its snapshot, attaches
 * the grid's container element, and forwards the container's key presses and
 * the cells' pointer events; the attribute builders give every grid, row,
 * cell and header the same roles and indices in every binding.
 *
 * **The ARIA indices are absolute.** `aria-rowindex` counts within the
 * dataset, not within the rendered window: a virtualized table mounting 24 of
 * 100,000 rows still reports row 40,000 as row 40,000, and `aria-rowcount` and
 * `aria-colcount` carry the totals.
 *
 * **A cell that is not mounted is still reachable.** Ctrl+End asks for a cell
 * the virtualizer may not have rendered. The controller asks `scrollToRow` for
 * the row and holds the address; {@link GridFocusController.syncFocus} focuses
 * the cell once a render produces its element.
 *
 * **The DOM follows the state.** Cells are found through their
 * `data-grid-cell` attribute inside the attached container, so nothing holds a
 * reference per cell.
 */
import type { ColumnMetadata } from "../columnModel";
import { columnText } from "../columns/columnText";
import { defaultLabels } from "../labels";
import type { Direction, TableLabels } from "../types";
import type { CellEdit } from "./cellEdits";
import {
  type CellRange,
  cellRangeBounds,
  cellRangeSize,
  extendCellRange,
  isInCellRange,
  isSingleCell,
  singleCellRange,
} from "./cellRange";
import {
  clipboardRangeText,
  readClipboardText,
  writeClipboardText,
} from "./clipboardRange";
import { fillRangeEdits, fillTargetRange } from "./fillRange";
import {
  type GridBounds,
  type GridCell,
  gridFocusMoveForKey,
  type GridKeyPress,
  moveGridFocus,
  sameGridCell,
} from "./gridFocus";
import { pasteRangeEdits } from "./pasteRange";

/**
 * The attribute a focusable cell carries, so focus can find it in the DOM.
 *
 * @public
 */
export const GRID_CELL_ATTR = "data-grid-cell";

/**
 * `data-grid-cell` value for one address — `"row:col"`, both absolute.
 *
 * @public
 */
export function gridCellAttr(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

/** Whether a key came from a cell itself, rather than a control inside one. */
function isGridCell(target: unknown): boolean {
  return target instanceof Element && target.hasAttribute(GRID_CELL_ATTR);
}

/**
 * What a grid-focus controller is configured with.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface GridFocusControllerOptions<TRow> {
  /** Off unless the host asked for it; when false the grid does nothing. */
  enabled: boolean;
  /**
   * Offer a checkbox in every column header that selects that column.
   *
   * Ctrl/Cmd+click is the gesture for a keyboard and a mouse, and a touch
   * device has neither — there is no Ctrl key to hold. This is the same
   * state reached by a control a finger can hit, and the same state a
   * screen reader can name. Off unless asked for.
   */
  headerCheckbox?: boolean;
  /**
   * Rows in the whole dataset. This is the ARIA number — `aria-rowcount` — and
   * deliberately NOT what movement is clamped to: movement stays within the
   * loaded rows.
   */
  rowCount: number;
  /**
   * Every visible column, whether or not the horizontal axis is windowed — this
   * is the ARIA number (`aria-colcount`) and the address space cell indices are
   * counted in, so a windowed table still reports absolute positions.
   */
  columns: readonly ColumnMetadata<TRow>[];
  /**
   * Whether the rendered columns are a window over `columns` rather than
   * all of them. Windowing the horizontal axis has the same consequence as
   * windowing rows: the cells in the DOM are a slice, so their position has to
   * be stated rather than counted.
   */
  columnsWindowed?: boolean;
  /** The rendered rows, for reading a cell's text when focus lands. */
  rows: readonly TRow[];
  /**
   * Stable row identity, so a caller holding a row key — a context menu, an
   * agent — can ask for the cell's grid address instead of counting rows
   * itself. Without it {@link GridFocusController.cellAt} answers nothing.
   */
  getRowId?: (row: TRow) => string;
  /**
   * Where the rendered window starts in the dataset. Zero without
   * virtualization; with it, `rows[i]` is dataset row `firstRowIndex + i`.
   */
  firstRowIndex?: number;
  /** Rows a PageUp/PageDown travels. Defaults to the rendered row count. */
  pageSize?: number;
  /** Text direction — flips the left/right arrows. */
  dir?: Direction;
  /** Announcement strings; falls back to the built-in English. */
  labels?: TableLabels;
  /**
   * Bring a dataset row into view. Supplied by the virtualizer; without it a
   * move to an unmounted row cannot be completed and is left alone rather than
   * silently dropping focus.
   */
  scrollToRow?: (rowIndex: number) => void;
  /** Enter or F2 on a cell — the editing model's entry point. */
  onActivate?: (cell: GridCell) => void;
  /**
   * True for a cell covered by someone else's span. Arrow keys skip it
   * rather than landing inside a cell that is not in the DOM.
   */
  isCoveredCell?: (cell: GridCell) => boolean;
  /**
   * Fired whenever the selected range changes, including when it collapses to
   * a single cell. `null` means nothing is selected.
   */
  onRangeChange?: (range: CellRange | null) => void;
  /**
   * Ctrl/Cmd+X after the copy succeeded. The table never clears data itself —
   * what "cut" removes is the host's decision, and a cut that emptied cells
   * before the clipboard accepted them would lose them outright.
   */
  onCut?: (range: CellRange) => void;
  /**
   * Ctrl/Cmd+V, with the clipboard already parsed into ordinary cell edits.
   *
   * Paste is not a second commit path: these are the same edits an inline edit
   * produces, so validation or async saving added to that path covers a paste
   * without paste knowing. Applying them stays the host's job — the table never
   * writes to data it does not own.
   */
  onPaste?: (edits: CellEdit<TRow>[]) => void;
  /**
   * A fill — the handle dragged from the selection's corner, or Ctrl/Cmd+D —
   * already turned into ordinary cell edits. Same shape and same contract as
   * {@link GridFocusControllerOptions.onPaste}: the table proposes, the host
   * writes.
   */
  onFill?: (edits: CellEdit<TRow>[]) => void;
  /**
   * Ctrl/Cmd+Z. Returns how many cells came back, so the grid can say — zero
   * means the history was empty, which is worth announcing rather than
   * swallowing.
   */
  onUndo?: () => number;
  /** Ctrl/Cmd+Shift+Z and Ctrl+Y. Returns how many cells were rewritten. */
  onRedo?: () => number;
  /** Ctrl/Cmd+F — open the find bar instead of the browser's own. */
  onFind?: () => void;
  /**
   * Cells the find bar matched, keyed `"row:col"`. They carry
   * `data-cell-match`, and the one the walk is on carries
   * `data-cell-match-current`, so each kit paints the hits its own way.
   */
  matchKeys?: ReadonlySet<string>;
  /** The match the walk is on, for the stronger mark. */
  currentMatch?: GridCell | null;
}

/**
 * The grid's focus state at one moment.
 *
 * @public
 */
export interface GridFocusSnapshot {
  /** The focused cell, or `null` before the grid has been entered. */
  readonly active: GridCell | null;
  /** The selected rectangle, or `null` when nothing is selected. */
  readonly range: CellRange | null;
  /** Live-region text naming what just happened. Empty until focus moves. */
  readonly announcement: string;
  /**
   * What a fill in progress would cover — the selection plus the cells the
   * drag has reached. `null` unless a fill is being dragged.
   */
  readonly fillPreview: CellRange | null;
}

/**
 * A key press on the grid container, as much of it as the dispatch reads.
 *
 * @public
 */
export interface GridKeyEvent extends GridKeyPress {
  /** Whether Shift was held — extends the selection. */
  shiftKey?: boolean;
  /** The element the key came from. */
  target?: unknown;
  /** Keep the browser's own handling of the key. */
  preventDefault: () => void;
}

/**
 * Where a pointer-release listener attaches — the window, in a browser.
 *
 * @public
 */
export interface PointerReleaseTarget {
  /** Start listening. */
  addEventListener: (type: "mouseup", listener: () => void) => void;
  /** Stop listening. */
  removeEventListener: (type: "mouseup", listener: () => void) => void;
}

/**
 * Keyboard and pointer focus over the cell grid, for one table.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface GridFocusController<TRow> {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => GridFocusSnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: GridFocusControllerOptions<TRow>) => void;
  /** The grid's container element, where cells are looked up to focus. */
  readonly attach: (container: HTMLElement | null) => void;
  /**
   * Move DOM focus to the cell a move is waiting for, once it is mounted. A
   * binding calls this after every render that changes the active cell or
   * the rendered rows.
   */
  readonly syncFocus: () => void;
  /** Move focus to a cell, scrolling its row into view and announcing it. */
  readonly focusCell: (cell: GridCell) => void;
  /** Select a rectangle programmatically — what a Select-all would call. */
  readonly selectRange: (range: CellRange | null) => void;
  /**
   * Select a whole column — the loaded rows of it, since a column of 100,000
   * rows cannot be selected while 500 are in hand. `extend` grows the current
   * selection to the column instead of replacing it.
   */
  readonly selectColumn: (col: number, extend?: boolean) => void;
  /**
   * What a header checkbox does: select this column alone, or clear the
   * selection when it is already exactly this column.
   */
  readonly toggleColumn: (col: number) => void;
  /**
   * Copy or cut without the keyboard. An explicit cell wins; the selection is
   * the fallback.
   */
  readonly copyCells: (cell?: GridCell, cut?: boolean) => void;
  /**
   * The grid address of one cell, named by row key and column key, resolved
   * against the rows and columns the controller was configured with.
   * `undefined` when the row is not loaded, the column is not visible, or no
   * `getRowId` was configured.
   */
  readonly cellAt: (rowId: string, columnKey: string) => GridCell | undefined;
  /** A key press on the grid container. */
  readonly keyDown: (event: GridKeyEvent) => void;
  /**
   * A pointer press on a cell. Shift extends the selection; a plain press
   * collapses it to the cell and starts a drag.
   */
  readonly pressCell: (cell: GridCell, event: { shiftKey?: boolean }) => void;
  /** The pointer entering a cell — extends a drag, or moves a fill. */
  readonly enterCell: (cell: GridCell) => void;
  /** A pointer release on a cell — ends a selection drag. */
  readonly releaseCell: () => void;
  /**
   * A cell received DOM focus by some other means — a click, a screen
   * reader. The active cell follows it.
   */
  readonly trackFocus: (cell: GridCell) => void;
  /**
   * A click on a column header. Ctrl/Cmd+click selects the column anywhere,
   * extending the selection; a plain click selects it only where the header
   * does not sort.
   */
  readonly clickHeader: (
    col: number,
    event: { ctrlKey?: boolean; metaKey?: boolean },
    sortable?: boolean
  ) => void;
  /** A pointer press on the fill handle — starts a fill drag. */
  readonly pressFillHandle: (event: {
    preventDefault: () => void;
    stopPropagation: () => void;
  }) => void;
  /**
   * A pointer released anywhere: ends a selection drag, and commits a fill
   * drag.
   */
  readonly releasePointer: () => void;
  /**
   * Listen for pointer releases on a target — the window — so a drag released
   * outside the table still ends. Returns the cleanup.
   */
  readonly watchPointerRelease: (target: PointerReleaseTarget) => () => void;
}

const EMPTY: GridFocusSnapshot = {
  active: null,
  range: null,
  announcement: "",
  fillPreview: null,
};

/** The last dataset row the browser holds. */
function lastLoadedRow(firstRowIndex: number, loadedRows: number): number {
  return firstRowIndex + Math.max(0, loadedRows - 1);
}

/** Whether a rectangle is one row tall — there is nothing to fill down into. */
function isSingleRowRange(range: CellRange): boolean {
  const bounds = cellRangeBounds(range);
  return bounds.fromRow === bounds.toRow;
}

/**
 * Create the grid-focus controller for one table.
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
  let options = initial;
  let snapshot = EMPTY;
  let container: HTMLElement | null = null;
  // A move can outrun the DOM: the target row may not be mounted yet. This
  // holds the address until a render produces its element.
  let pending: GridCell | null = null;
  // A selection drag and a fill drag in progress. Neither is state: they
  // change on every pointer move and nothing renders from them.
  let dragging = false;
  let filling = false;
  // Where a fill drag has reached. The preview in the snapshot renders from
  // it; the release reads it here.
  let fillTo: GridCell | null = null;
  // The range and fill target the snapshot's preview was derived from.
  let previewOf: { range: CellRange | null; to: GridCell | null } = {
    range: null,
    to: null,
  };
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();

  const firstRow = (): number => options.firstRowIndex ?? 0;
  const labels = (): TableLabels | undefined => options.labels;

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  /**
   * What a fill in progress would cover: the selection plus the cells the drag
   * has reached. Rendering it as selected is the preview — one highlight, one
   * meaning, and it cannot disagree with what gets written because both come
   * from the same rectangle.
   */
  const previewFor = (range: CellRange | null): CellRange | null => {
    if (range === previewOf.range && fillTo === previewOf.to) {
      return snapshot.fillPreview;
    }
    previewOf = { range, to: fillTo };
    return range && fillTo ? fillTargetRange(range, fillTo) : null;
  };

  const write = (
    patch: Partial<Omit<GridFocusSnapshot, "fillPreview">>
  ): void => {
    const merged = { ...snapshot, ...patch };
    const next = { ...merged, fillPreview: previewFor(merged.range) };
    if (
      next.active === snapshot.active &&
      next.range === snapshot.range &&
      next.announcement === snapshot.announcement &&
      next.fillPreview === snapshot.fillPreview
    ) {
      return;
    }
    snapshot = next;
    changed = true;
    flush();
  };

  /** Run several writes as one change, so listeners hear the end state. */
  const batch = (run: () => void): void => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };

  const say = (announcement: string): void => {
    write({ announcement });
  };

  /** Say where focus landed: the column, then the cell, then the position. */
  const announce = (cell: GridCell): void => {
    const column = options.columns[cell.col];
    if (!column) return;
    const row = options.rows[cell.row - firstRow()];
    const header =
      typeof column.header === "string" ? column.header : column.key;
    const value = row === undefined ? "" : columnText(column, row);
    const position = (
      labels()?.gridCellPosition ?? defaultLabels.gridCellPosition
    )(cell.row + 1, options.rowCount);
    say(value ? `${header}, ${value}, ${position}` : `${header}, ${position}`);
  };

  const selectRange = (next: CellRange | null): void => {
    batch(() => {
      write({ range: next });
      options.onRangeChange?.(next);
      // Say what was selected, not just where focus is. A single cell says
      // nothing: its own announcement already names it, and repeating "1 cell"
      // on every arrow press turns navigation into noise.
      if (!next || isSingleCell(next)) return;
      const b = cellRangeBounds(next);
      say(
        (labels()?.gridRangeSelection ?? defaultLabels.gridRangeSelection)({
          fromRow: b.fromRow + 1,
          toRow: b.toRow + 1,
          fromColumn: b.fromCol + 1,
          toColumn: b.toCol + 1,
          cells: cellRangeSize(next),
        })
      );
    });
  };

  const focusCell = (cell: GridCell): void => {
    batch(() => {
      write({ active: cell });
      pending = cell;
      // Ask the virtualizer for the row before trying to focus it; if it is
      // already mounted this is a no-op and `syncFocus` focuses at once.
      options.scrollToRow?.(cell.row);
      announce(cell);
    });
  };

  const syncFocus = (): void => {
    if (!options.enabled) return;
    const target = pending;
    if (!target || !container) return;
    const element = container.querySelector<HTMLElement>(
      `[${GRID_CELL_ATTR}="${gridCellAttr(target)}"]`
    );
    if (!element) return;
    pending = null;
    element.focus();
  };

  const setFillTo = (to: GridCell | null): void => {
    fillTo = to;
    write({});
  };

  const commitFill = (to: GridCell): void => {
    const { range } = snapshot;
    const { onFill } = options;
    if (!range || !onFill) return;
    const edits = fillRangeEdits({
      source: range,
      to,
      rows: options.rows,
      columns: options.columns,
      firstRowIndex: firstRow(),
    });
    if (edits.length === 0) return;
    onFill(edits);
    // The filled rectangle stays selected, as it does in a spreadsheet: the
    // next fill continues from what was just written.
    batch(() => {
      write({ range: fillTargetRange(range, to) });
      say(
        (labels()?.gridRangeFilled ?? defaultLabels.gridRangeFilled)(
          edits.length
        )
      );
    });
  };

  /** Ctrl/Cmd+C and Ctrl/Cmd+X — the rectangle, as a spreadsheet reads it. */
  const copySelection = (selection: CellRange, cut: boolean): void => {
    const text = clipboardRangeText({
      range: selection,
      rows: options.rows,
      columns: options.columns,
      firstRowIndex: firstRow(),
    });
    void writeClipboardText(text).then((ok) => {
      say(
        ok
          ? (labels()?.gridRangeCopied ?? defaultLabels.gridRangeCopied)(
              cellRangeSize(selection)
            )
          : (labels()?.gridRangeCopyFailed ?? defaultLabels.gridRangeCopyFailed)
      );
      // A cut only tells the host once the clipboard has the data: clearing
      // cells the clipboard never took would lose them outright.
      if (ok && cut) options.onCut?.(selection);
    });
  };

  /** Ctrl/Cmd+D — the selection's top row carries into the rest of it. */
  const fillDown = (selection: CellRange): void => {
    const b = cellRangeBounds(selection);
    const edits = fillRangeEdits({
      source: {
        anchor: { row: b.fromRow, col: b.fromCol },
        head: { row: b.fromRow, col: b.toCol },
      },
      to: { row: b.toRow, col: b.toCol },
      rows: options.rows,
      columns: options.columns,
      firstRowIndex: firstRow(),
    });
    options.onFill?.(edits);
    say(
      (labels()?.gridRangeFilled ?? defaultLabels.gridRangeFilled)(edits.length)
    );
  };

  /** Ctrl/Cmd+V — the clipboard, mapped onto the selection's top-left cell. */
  const pasteInto = (target: CellRange): void => {
    void readClipboardText().then((text) => {
      if (text === null) {
        say(
          labels()?.gridRangePasteFailed ?? defaultLabels.gridRangePasteFailed
        );
        return;
      }
      const edits = pasteRangeEdits({
        text,
        range: target,
        rows: options.rows,
        columns: options.columns,
        firstRowIndex: firstRow(),
      });
      options.onPaste?.(edits);
      say(
        (labels()?.gridRangePasted ?? defaultLabels.gridRangePasted)(
          edits.length
        )
      );
    });
  };

  /**
   * Ctrl/Cmd+Z and its two redo spellings, announced either way.
   *
   * The letter is compared without case: with Shift held, Windows and Linux
   * browsers report `"Z"`, and Caps Lock makes either key upper-case.
   */
  const handleHistoryKey = (event: GridKeyEvent): boolean => {
    const key = event.key.toLowerCase();
    const redo = (key === "z" && event.shiftKey === true) || key === "y";
    const undo = key === "z" && event.shiftKey !== true;
    if (!undo && !redo) return false;
    const run = redo ? options.onRedo : options.onUndo;
    if (!run) return false;
    const cells = run();
    const done = redo
      ? (labels()?.editRedone ?? defaultLabels.editRedone)
      : (labels()?.editUndone ?? defaultLabels.editUndone);
    say(
      cells === 0
        ? (labels()?.editNothingToUndo ?? defaultLabels.editNothingToUndo)
        : done(cells)
    );
    return true;
  };

  /**
   * The Ctrl/Cmd gestures: undo and redo, find, copy, cut, fill down, paste.
   *
   * They run before movement, so a modifier never doubles as a navigation
   * key. Each stays the BROWSER'S own when the table has nothing to do with
   * it — no selection, no host handler — which is what `false` says.
   *
   * @returns Whether the table took the key.
   */
  const handleModifiedKey = (event: GridKeyEvent, from: GridCell): boolean => {
    if (event.ctrlKey !== true && event.metaKey !== true) return false;
    if (handleHistoryKey(event)) {
      event.preventDefault();
      return true;
    }
    const { range } = snapshot;
    const { onFind, onFill, onPaste } = options;
    // Ctrl/Cmd+F belongs to the table only when the table has a find bar to
    // open; otherwise the browser's own find is the right answer.
    if (event.key === "f" && onFind) {
      event.preventDefault();
      onFind();
      return true;
    }
    if ((event.key === "c" || event.key === "x") && range) {
      event.preventDefault();
      copySelection(range, event.key === "x");
      return true;
    }
    // Nothing to carry into a one-row selection, so the key stays the
    // browser's there.
    if (event.key === "d" && onFill && range && !isSingleRowRange(range)) {
      event.preventDefault();
      fillDown(range);
      return true;
    }
    // Paste needs a destination, not a rectangle: a spreadsheet pastes into
    // the focused cell and lets the clipboard's own shape decide the rest, so
    // this takes the same `from` the movement keys take rather than demanding
    // a selection first.
    if (event.key === "v" && onPaste) {
      event.preventDefault();
      pasteInto(range ?? singleCellRange(from));
      return true;
    }
    return false;
  };

  /**
   * Movement is clamped to the LOADED window, not the dataset.
   *
   * `aria-rowcount` says 100,000 because that is true and a screen reader
   * needs it. But Ctrl+End must not move to row 100,000 when only rows 1-25
   * are loaded: on a paged table that row is on another page, and on a
   * virtualized one it may not be fetched. Virtualization still reaches every
   * loaded row, because `scrollToRow` mounts it and the window grows as more
   * arrives.
   */
  const bounds = (): GridBounds => {
    const loaded = options.rows.length;
    return {
      rowCount: lastLoadedRow(firstRow(), loaded) + 1,
      colCount: options.columns.length,
      pageSize: options.pageSize ?? Math.max(1, loaded),
    };
  };

  const keyDown = (event: GridKeyEvent): void => {
    if (!options.enabled) return;
    const { active, range } = snapshot;
    const from = active ?? { row: firstRow(), col: 0 };
    if (handleModifiedKey(event, from)) return;

    // Enter and F2 open the focused cell — but only when the key came FROM
    // that cell. The handler sits on the whole grid, so the same press also
    // arrives from an editor, a rename box or a button inside one; those own
    // their keys, and swallowing them here would break the control the reader
    // is actually in.
    if (event.key === "Enter" || event.key === "F2") {
      if (options.onActivate && isGridCell(event.target)) {
        event.preventDefault();
        options.onActivate(from);
      }
      return;
    }

    const move = gridFocusMoveForKey(event, options.dir ?? "ltr");
    if (!move) return;
    const moved = moveGridFocus(from, move, bounds(), options.isCoveredCell);
    // The window may not start at row 0 (page 3 of a paged table) and the
    // mover clamps at zero, so hold that floor here too.
    const next = { row: Math.max(moved.row, firstRow()), col: moved.col };
    // An edge move resolves to the same cell: swallow the key so the page
    // does not scroll, but say nothing — nothing changed.
    event.preventDefault();
    if (sameGridCell(next, active)) return;

    // Focus first, then the selection: both write the live region, and for a
    // Shift move the RANGE is the news while for a plain move the cell is.
    // Whichever runs last wins, so the order encodes which one matters.
    batch(() => {
      focusCell(next);
      // Shift extends from wherever the selection began, so Shift+Down twice
      // then Shift+Up shrinks the range rather than starting a new one
      // upward. `from` is the fallback anchor for the first press. A plain
      // move collapses any selection to the cell landed on.
      selectRange(
        event.shiftKey === true
          ? extendCellRange(range, next, from)
          : singleCellRange(next)
      );
    });
  };

  const selectColumn = (col: number, extend = false): void => {
    const top = { row: firstRow(), col };
    const bottom = {
      row: lastLoadedRow(firstRow(), options.rows.length),
      col,
    };
    const { range } = snapshot;
    batch(() => {
      selectRange(
        extend && range
          ? extendCellRange(range, bottom, range.anchor)
          : { anchor: top, head: bottom }
      );
      focusCell(top);
    });
  };

  const releasePointer = (): void => {
    dragging = false;
    if (!filling) return;
    filling = false;
    const to = fillTo;
    batch(() => {
      setFillTo(null);
      // A fill that never left the selection writes nothing, which
      // `commitFill` decides.
      if (to) commitFill(to);
    });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    attach(node) {
      container = node;
    },
    syncFocus,
    focusCell,
    selectRange,
    selectColumn,
    toggleColumn(col) {
      if (
        isGridColumnSelected(
          {
            enabled: options.enabled,
            range: snapshot.range,
            firstRowIndex: firstRow(),
            loadedRows: options.rows.length,
          },
          col
        )
      ) {
        selectRange(null);
        return;
      }
      selectColumn(col);
    },
    copyCells(cell, cut) {
      const selection: CellRange | null = cell
        ? { anchor: cell, head: cell }
        : snapshot.range;
      if (!selection) return;
      copySelection(selection, cut === true);
    },
    cellAt(rowId, columnKey) {
      const { getRowId } = options;
      if (!getRowId) return undefined;
      const col = options.columns.findIndex(
        (column) => column.key === columnKey
      );
      if (col < 0) return undefined;
      const windowIndex = options.rows.findIndex(
        (row) => getRowId(row) === rowId
      );
      if (windowIndex < 0) return undefined;
      // `rows` is the rendered window; a grid address counts from the dataset.
      return { row: windowIndex + firstRow(), col };
    },
    keyDown,
    pressCell(cell, event) {
      const { active, range } = snapshot;
      if (event.shiftKey === true) {
        selectRange(extendCellRange(range, cell, active ?? cell));
        return;
      }
      // A press with no modifier starts a drag AND collapses to this cell:
      // dragging away extends from here, releasing without moving leaves the
      // single-cell selection a plain click should give.
      dragging = true;
      selectRange(singleCellRange(cell));
    },
    enterCell(cell) {
      // Extending on ENTER rather than on move means one update per cell
      // crossed instead of one per pixel.
      if (filling) {
        setFillTo(cell);
        return;
      }
      if (!dragging) return;
      const { active, range } = snapshot;
      selectRange(extendCellRange(range, cell, active ?? cell));
    },
    releaseCell() {
      dragging = false;
    },
    trackFocus(cell) {
      // A mouse click or a screen reader can move focus without a key press;
      // keep state in step rather than fighting it.
      if (!sameGridCell(cell, snapshot.active)) write({ active: cell });
    },
    clickHeader(col, event, sortable) {
      const modified = event.ctrlKey === true || event.metaKey === true;
      // A sortable header's plain click already sorts, and the two cannot
      // share it without one breaking. Ctrl/Cmd+click selects anywhere; a
      // plain click selects only where nothing else claims it.
      if (!modified && sortable === true) return;
      selectColumn(col, modified);
    },
    pressFillHandle(event) {
      // Stop the cell's own press: that one collapses the selection to a
      // single cell, which is the opposite of what a fill starts from.
      event.preventDefault();
      event.stopPropagation();
      filling = true;
    },
    releasePointer,
    watchPointerRelease(target) {
      target.addEventListener("mouseup", releasePointer);
      return () => {
        target.removeEventListener("mouseup", releasePointer);
      };
    },
  };
}

/* ── Attributes ────────────────────────────────────────────────────── */

/**
 * The grid container's attributes.
 *
 * @public
 */
export interface GridContainerAttributes {
  /** `grid` while cell navigation is on. */
  role?: "grid";
  /** Rows in the dataset. */
  "aria-rowcount"?: number;
  /** Columns in the column set. */
  "aria-colcount"?: number;
}

/**
 * The grid container's attributes: the grid role and both totals with cell
 * navigation on; a windowed table's sizes without it.
 *
 * `aria-rowcount` is valid on the implicit `role="table"`, so a windowed table
 * states its size without claiming the grid keyboard semantics that only cell
 * navigation provides. `aria-colcount` follows the same rule for a windowed
 * column axis, where each cell states its `aria-colindex`.
 *
 * @param input - Whether navigation is on, which axes are windowed, and the
 *   totals.
 * @returns The attributes.
 *
 * @public
 */
export function gridContainerAttributes(input: {
  readonly enabled: boolean;
  readonly windowed: boolean;
  readonly columnsWindowed: boolean;
  readonly rowCount: number;
  readonly colCount: number;
}): GridContainerAttributes {
  const { enabled, windowed, columnsWindowed, rowCount, colCount } = input;
  if (!enabled) {
    return {
      ...(windowed ? { "aria-rowcount": rowCount } : {}),
      ...(columnsWindowed ? { "aria-colcount": colCount } : {}),
    };
  }
  return {
    role: "grid",
    "aria-rowcount": rowCount,
    "aria-colcount": colCount,
  };
}

/**
 * What a cell's attributes are derived from.
 *
 * @public
 */
export interface GridCellAttributesInput {
  /** Whether cell navigation is on. */
  readonly enabled: boolean;
  /** Whether the rendered columns are a window over the column set. */
  readonly columnsWindowed: boolean;
  /** The focused cell. */
  readonly active: GridCell | null;
  /** Where the rendered window starts in the dataset. */
  readonly firstRowIndex: number;
  /** The selected rectangle. */
  readonly range: CellRange | null;
  /** What a fill in progress would cover, highlighted in place of the range. */
  readonly fillPreview: CellRange | null;
  /** Cells the find bar matched, keyed `"row:col"`. */
  readonly matchKeys?: ReadonlySet<string>;
  /** The match the find walk is on. */
  readonly currentMatch?: GridCell | null;
}

/**
 * One cell's attributes.
 *
 * @public
 */
export interface GridCellAttributes {
  /** The cell's `"row:col"` address, for focus to find it. */
  "data-grid-cell"?: string;
  /** `gridcell` while cell navigation is on. */
  role?: "gridcell";
  /** `0` on the one tabbable cell, `-1` on every other. */
  tabIndex?: 0 | -1;
  /** The cell's absolute column position, from 1. */
  "aria-colindex"?: number;
  /** Whether the cell is inside a multi-cell selection. */
  "aria-selected"?: boolean;
  /** Present on a selected cell. */
  "data-cell-selected"?: "";
  /** Present on a find match. */
  "data-cell-match"?: "";
  /** Present on the find match the walk is on. */
  "data-cell-match-current"?: "";
}

/**
 * One cell's attributes: its address, role, roving `tabIndex`, absolute
 * column index, and the selection and find marks.
 *
 * @param input - See {@link GridCellAttributesInput}.
 * @param cell - The cell's absolute address.
 * @returns The attributes.
 *
 * @public
 */
export function gridCellAttributes(
  input: GridCellAttributesInput,
  cell: GridCell
): GridCellAttributes {
  // A windowed column axis states each cell's absolute position, or a reader
  // counting the cells in the DOM calls column 17 "column 3 of 40". The count
  // without the per-cell index would be worse than neither.
  if (!input.enabled) {
    return input.columnsWindowed ? { "aria-colindex": cell.col + 1 } : {};
  }
  const { active, range, fillPreview, matchKeys, currentMatch } = input;
  const isActive = sameGridCell(cell, active);
  // Exactly one cell is tabbable. Before the grid has ever been entered that
  // is its first cell, so Tab reaches the table at all.
  const firstEver =
    active === null && cell.row === input.firstRowIndex && cell.col === 0;
  // While a fill is being dragged the highlight shows what it would write.
  const selected = isInCellRange(fillPreview ?? range, cell);
  const key = gridCellAttr(cell);
  const matched = matchKeys?.has(key) === true;
  return {
    [GRID_CELL_ATTR]: key,
    // The table is a grid while this is on, and a grid's cells are `gridcell`.
    // A bare `<td>` maps to that on its own, but the table-level cell props
    // state `role="cell"` for the plain-table case — correct there, wrong
    // here, and last write wins wherever a kit spreads both. Saying it outright
    // keeps every kit on the same role.
    role: "gridcell",
    tabIndex: isActive || firstEver ? 0 : -1,
    "aria-colindex": cell.col + 1,
    // Only meaningful once a real rectangle exists: marking every focused cell
    // as selected would tell a screen reader the table is in selection mode
    // when the user has merely arrowed around.
    "aria-selected": range && !isSingleCell(range) ? selected : undefined,
    "data-cell-selected": selected ? "" : undefined,
    "data-cell-match": matched ? "" : undefined,
    "data-cell-match-current":
      matched && sameGridCell(cell, currentMatch ?? null) ? "" : undefined,
  };
}

/**
 * One row's attributes: its absolute `aria-rowindex`, with cell navigation on
 * or whenever the rows are a window over the dataset.
 *
 * @param input - Whether navigation is on and whether the rows are windowed.
 * @param rowIndex - The row's absolute index in the dataset.
 * @returns The attributes.
 *
 * @public
 */
export function gridRowAttributes(
  input: { readonly enabled: boolean; readonly windowed: boolean },
  rowIndex: number
): { "aria-rowindex"?: number } {
  return input.enabled || input.windowed
    ? { "aria-rowindex": rowIndex + 1 }
    : {};
}

/**
 * One column header's attributes: its absolute `aria-colindex`, wherever the
 * table states `aria-colcount`.
 *
 * @param input - Whether navigation is on and whether the columns are
 *   windowed.
 * @param col - The column's index in the column set.
 * @returns The attributes.
 *
 * @public
 */
export function gridColumnHeaderAttributes(
  input: { readonly enabled: boolean; readonly columnsWindowed: boolean },
  col: number
): { "aria-colindex"?: number } {
  return input.enabled || input.columnsWindowed
    ? { "aria-colindex": col + 1 }
    : {};
}

/**
 * Whether the selection is exactly one column, over every loaded row.
 *
 * Both bounds are checked, not just the columns: a rectangle three rows tall
 * inside one column is not that column selected, and a checkbox claiming it
 * is would tell the reader a copy or an export covers rows it does not.
 *
 * @param input - Whether navigation is on, the selection, and the loaded
 *   window.
 * @param col - The column's index.
 * @returns Whether the column is selected.
 *
 * @public
 */
export function isGridColumnSelected(
  input: {
    readonly enabled: boolean;
    readonly range: CellRange | null;
    readonly firstRowIndex: number;
    readonly loadedRows: number;
  },
  col: number
): boolean {
  const { enabled, range, firstRowIndex, loadedRows } = input;
  if (!enabled || !range) return false;
  const bounds = cellRangeBounds(range);
  return (
    bounds.fromCol === col &&
    bounds.toCol === col &&
    bounds.fromRow === firstRowIndex &&
    bounds.toRow === lastLoadedRow(firstRowIndex, loadedRows)
  );
}

/**
 * The cell carrying the fill handle — the selection's bottom inline-end
 * corner — or `null` when there is nothing to fill from or no host to receive
 * a fill.
 *
 * @param input - Whether navigation is on, the selection, and whether the
 *   host takes fills.
 * @returns The handle's cell.
 *
 * @public
 */
export function gridFillHandleCell(input: {
  readonly enabled: boolean;
  readonly range: CellRange | null;
  readonly canFill: boolean;
}): GridCell | null {
  const { enabled, range, canFill } = input;
  if (!enabled || !range || !canFill) return null;
  const b = cellRangeBounds(range);
  return { row: b.toRow, col: b.toCol };
}
