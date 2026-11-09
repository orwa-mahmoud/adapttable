/**
 * Base grid navigation: the active cell, pending focus, and arrow keys.
 *
 * Range, clipboard, fill and history are not imported here. A binding that
 * wants them composes those handlers through {@link createGridFocusController}.
 */
import { columnText } from "../columns/columnText";
import type { ColumnMetadata } from "../contracts/columns";
import { isThenable } from "../editing/storePlumbing";
import { defaultLabels } from "../labels";
import type { Direction, TableLabels } from "../types";
import type { CellEdit } from "./cellEdits";
import type { CellRange } from "./cellRange";
import {
  type GridBounds,
  type GridCell,
  gridFocusMoveForKey,
  type GridKeyPress,
  moveGridFocus,
  sameGridCell,
} from "./gridFocus";

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
export function isGridCell(target: unknown): boolean {
  return target instanceof Element && target.hasAttribute(GRID_CELL_ATTR);
}

/** The last dataset row the browser holds. */
export function lastLoadedRow(
  firstRowIndex: number,
  loadedRows: number
): number {
  return firstRowIndex + Math.max(0, loadedRows - 1);
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
  onPaste?: (edits: CellEdit<TRow>[]) => unknown;
  /**
   * A fill — the handle dragged from the selection's corner, or Ctrl/Cmd+D —
   * already turned into ordinary cell edits. Same shape and same contract as
   * {@link GridFocusControllerOptions.onPaste}: the table proposes, the host
   * writes.
   */
  onFill?: (edits: CellEdit<TRow>[]) => unknown;
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

interface ClipboardColumn<TRow> {
  key: string;
  accessor: ColumnMetadata<TRow>["accessor"];
  parseValue: ColumnMetadata<TRow>["parseValue"];
  editable: ColumnMetadata<TRow>["editable"];
}

/**
 * The mutable navigation session optional handlers close over.
 *
 * Not part of the public controller. Range, clipboard and fill read it; base
 * navigation does not import those modules.
 */
export interface GridNavSession<TRow> {
  options: GridFocusControllerOptions<TRow>;
  snapshot: GridFocusSnapshot;
  pending: GridCell | null;
  container: HTMLElement | null;
  dragging: boolean;
  filling: boolean;
  fillTo: GridCell | null;
  pointerPreviewCancelled: boolean;
  clipboardVersion: number;
  gestureVersion: number;
  clipboardRows: readonly TRow[];
  clipboardRowIds: readonly (string | undefined)[];
  clipboardColumns: readonly ClipboardColumn<TRow>[];
  previewOf: { range: CellRange | null; to: GridCell | null };
  firstRow: () => number;
  labels: () => TableLabels | undefined;
  bounds: () => GridBounds;
  write: (patch: Partial<Omit<GridFocusSnapshot, "fillPreview">>) => void;
  batch: (run: () => void) => void;
  say: (announcement: string) => void;
  announce: (cell: GridCell) => void;
  focusCell: (cell: GridCell) => void;
  setFillTo: (to: GridCell | null) => void;
  applyGesture: (
    apply: () => unknown,
    done: () => void,
    failed: string
  ) => void;
  columnIdentity: (column: ColumnMetadata<TRow>) => ClipboardColumn<TRow>;
}

/**
 * Optional handlers the full controller composes in. Base navigation passes
 * none of them, so those modules stay out of its graph.
 */
export interface GridNavigationParts<TRow> {
  previewFor?: (
    session: GridNavSession<TRow>,
    range: CellRange | null
  ) => CellRange | null;
  modifiedKey?: (
    session: GridNavSession<TRow>,
    event: GridKeyEvent,
    from: GridCell
  ) => boolean;
  afterMove?: (
    session: GridNavSession<TRow>,
    event: GridKeyEvent,
    next: GridCell,
    from: GridCell
  ) => void;
  pressCell?: (
    session: GridNavSession<TRow>,
    cell: GridCell,
    event: { shiftKey?: boolean }
  ) => void;
  enterCell?: (session: GridNavSession<TRow>, cell: GridCell) => void;
  releasePointer?: (session: GridNavSession<TRow>) => void;
  pressFillHandle?: (
    session: GridNavSession<TRow>,
    event: { preventDefault: () => void; stopPropagation: () => void }
  ) => void;
  copyCells?: (
    session: GridNavSession<TRow>,
    cell: GridCell | undefined,
    cut: boolean
  ) => void;
  selectRange?: (
    session: GridNavSession<TRow>,
    range: CellRange | null
  ) => void;
  selectColumn?: (
    session: GridNavSession<TRow>,
    col: number,
    extend: boolean
  ) => void;
  toggleColumn?: (session: GridNavSession<TRow>, col: number) => void;
  clickHeader?: (
    session: GridNavSession<TRow>,
    col: number,
    event: { ctrlKey?: boolean; metaKey?: boolean },
    sortable?: boolean
  ) => void;
}

const EMPTY: GridFocusSnapshot = {
  active: null,
  range: null,
  announcement: "",
  fillPreview: null,
};

/**
 * Grid navigation without a selection, clipboard, fill or history.
 *
 * Arrow keys, Home, End, PageUp and PageDown move the active cell. Enter and
 * F2 activate it. A move onto a row that is not mounted yet is remembered
 * until {@link GridFocusController.syncFocus} sees the cell.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createGridNavigation<TRow>(
  initial: GridFocusControllerOptions<TRow>
): GridFocusController<TRow> {
  return composeGridNavigation(initial);
}

/**
 * Base navigation plus the handlers the full controller injects.
 *
 * Not a package export. The session those handlers close over stays inside
 * this module, so the public navigation entry does not name it.
 */
export function composeGridNavigation<TRow>(
  initial: GridFocusControllerOptions<TRow>,
  parts?: GridNavigationParts<TRow>
): GridFocusController<TRow> {
  const columnIdentity = (
    column: ColumnMetadata<TRow>
  ): ClipboardColumn<TRow> => ({
    key: column.key,
    accessor: column.accessor,
    parseValue: column.parseValue,
    editable: column.editable,
  });
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();
  const session = {
    options: { ...initial },
    snapshot: EMPTY,
    pending: null,
    container: null,
    dragging: false,
    filling: false,
    fillTo: null,
    pointerPreviewCancelled: false,
    clipboardVersion: 0,
    gestureVersion: 0,
    clipboardRows: [...initial.rows],
    clipboardRowIds: initial.rows.map((row) => initial.getRowId?.(row)),
    clipboardColumns: initial.columns.map(columnIdentity),
    previewOf: { range: null, to: null },
    columnIdentity,
  } as unknown as GridNavSession<TRow>;

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  session.firstRow = () => session.options.firstRowIndex ?? 0;
  session.labels = () => session.options.labels;
  session.bounds = () => {
    const loaded = session.options.rows.length;
    return {
      rowCount: lastLoadedRow(session.firstRow(), loaded) + 1,
      colCount: session.options.columns.length,
      pageSize: session.options.pageSize ?? Math.max(1, loaded),
    };
  };
  session.write = (patch) => {
    const merged = { ...session.snapshot, ...patch };
    const fillPreview = parts?.previewFor?.(session, merged.range) ?? null;
    const next = { ...merged, fillPreview };
    if (
      next.active === session.snapshot.active &&
      next.range === session.snapshot.range &&
      next.announcement === session.snapshot.announcement &&
      next.fillPreview === session.snapshot.fillPreview
    ) {
      return;
    }
    session.snapshot = next;
    changed = true;
    flush();
  };
  session.batch = (run) => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };
  session.say = (announcement) => {
    session.write({ announcement });
  };
  session.announce = (cell) => {
    const column = session.options.columns[cell.col];
    if (!column) return;
    const row = session.options.rows[cell.row - session.firstRow()];
    const header =
      typeof column.header === "string" ? column.header : column.key;
    const value = row === undefined ? "" : columnText(column, row);
    const position = (
      session.labels()?.gridCellPosition ?? defaultLabels.gridCellPosition
    )(cell.row + 1, session.options.rowCount);
    session.say(
      value ? `${header}, ${value}, ${position}` : `${header}, ${position}`
    );
  };
  session.focusCell = (cell) => {
    session.batch(() => {
      session.write({ active: cell });
      session.pending = cell;
      session.options.scrollToRow?.(cell.row);
      session.announce(cell);
    });
  };
  session.setFillTo = (to) => {
    session.fillTo = to;
    session.write({});
  };
  session.applyGesture = (apply, done, failed) => {
    const version = ++session.gestureVersion;
    const complete = (callback: () => void): void => {
      if (session.options.enabled && version === session.gestureVersion)
        callback();
    };
    try {
      const result = apply();
      if (isThenable(result)) {
        void Promise.resolve(result).then(
          () => complete(done),
          () => complete(() => session.say(failed))
        );
      } else complete(done);
    } catch {
      complete(() => session.say(failed));
    }
  };

  const selectRange = (next: CellRange | null): void => {
    if (parts?.selectRange) parts.selectRange(session, next);
    else session.write({ range: next });
  };
  const focusTop = (col: number): void => {
    session.focusCell({ row: session.firstRow(), col });
  };

  const syncFocus = (): void => {
    if (session.pointerPreviewCancelled) {
      session.pointerPreviewCancelled = false;
      session.write({});
    }
    if (!session.options.enabled) return;
    const target = session.pending;
    if (!target || !session.container) return;
    const element = session.container.querySelector<HTMLElement>(
      `[${GRID_CELL_ATTR}="${gridCellAttr(target)}"]`
    );
    if (!element) return;
    session.pending = null;
    element.focus();
  };

  const keyDown = (event: GridKeyEvent): void => {
    if (!session.options.enabled) return;
    const { active } = session.snapshot;
    const from = active ?? { row: session.firstRow(), col: 0 };
    if (parts?.modifiedKey?.(session, event, from)) return;
    if (event.key === "Enter" || event.key === "F2") {
      if (session.options.onActivate && isGridCell(event.target)) {
        event.preventDefault();
        session.options.onActivate(from);
      }
      return;
    }
    const move = gridFocusMoveForKey(event, session.options.dir ?? "ltr");
    if (!move) return;
    const moved = moveGridFocus(
      from,
      move,
      session.bounds(),
      session.options.isCoveredCell
    );
    const next = {
      row: Math.max(moved.row, session.firstRow()),
      col: moved.col,
    };
    event.preventDefault();
    if (sameGridCell(next, active)) return;
    if (parts?.afterMove) parts.afterMove(session, event, next, from);
    else session.focusCell(next);
  };

  const releasePointer = (): void => {
    if (parts?.releasePointer) parts.releasePointer(session);
    else session.dragging = false;
  };

  return {
    getSnapshot: () => session.snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      if (
        next.enabled !== session.options.enabled ||
        (next.firstRowIndex ?? 0) !== session.firstRow()
      ) {
        session.gestureVersion++;
      }
      const rowsChanged =
        next.enabled !== session.options.enabled ||
        (next.firstRowIndex ?? 0) !== (session.options.firstRowIndex ?? 0) ||
        next.rows.length !== session.clipboardRows.length ||
        next.rows.some(
          (row, index) =>
            row !== session.clipboardRows[index] ||
            next.getRowId?.(row) !== session.clipboardRowIds[index]
        ) ||
        next.columns.length !== session.clipboardColumns.length ||
        next.columns.some((column, index) => {
          const previous = session.clipboardColumns[index];
          return (
            column.key !== previous?.key ||
            column.accessor !== previous.accessor ||
            column.parseValue !== previous.parseValue ||
            column.editable !== previous.editable
          );
        });
      if (rowsChanged) {
        session.clipboardVersion += 1;
        session.clipboardRows = [...next.rows];
        session.clipboardRowIds = next.rows.map((row) => next.getRowId?.(row));
        session.clipboardColumns = next.columns.map(columnIdentity);
        session.dragging = false;
        session.filling = false;
        session.fillTo = null;
        session.pointerPreviewCancelled = session.snapshot.fillPreview !== null;
      }
      session.options = { ...next };
    },
    attach(node) {
      if (node === null) {
        session.gestureVersion++;
        session.clipboardVersion++;
      }
      session.container = node;
    },
    syncFocus,
    focusCell: session.focusCell,
    selectRange,
    selectColumn(col, extend = false) {
      if (parts?.selectColumn) parts.selectColumn(session, col, extend);
      else focusTop(col);
    },
    toggleColumn(col) {
      if (parts?.toggleColumn) parts.toggleColumn(session, col);
      else focusTop(col);
    },
    copyCells(cell, cut) {
      parts?.copyCells?.(session, cell, cut === true);
    },
    cellAt(rowId, columnKey) {
      const { getRowId } = session.options;
      if (!getRowId) return undefined;
      const col = session.options.columns.findIndex(
        (column) => column.key === columnKey
      );
      if (col < 0) return undefined;
      const windowIndex = session.options.rows.findIndex(
        (row) => getRowId(row) === rowId
      );
      if (windowIndex < 0) return undefined;
      return { row: windowIndex + session.firstRow(), col };
    },
    keyDown,
    pressCell(cell, event) {
      if (parts?.pressCell) parts.pressCell(session, cell, event);
      else session.focusCell(cell);
    },
    enterCell(cell) {
      parts?.enterCell?.(session, cell);
    },
    releaseCell() {
      session.dragging = false;
    },
    trackFocus(cell) {
      session.pending = null;
      if (!sameGridCell(cell, session.snapshot.active))
        session.write({ active: cell });
    },
    clickHeader(col, event, sortable) {
      parts?.clickHeader?.(session, col, event, sortable);
    },
    pressFillHandle(event) {
      parts?.pressFillHandle?.(session, event);
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
