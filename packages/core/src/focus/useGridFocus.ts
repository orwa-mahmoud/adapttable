/**
 * Keyboard navigation over table cells — the stateful half.
 *
 * Opt-in: without `cellNavigation` this hook is never called, and the table
 * renders exactly the markup it always did. With it, the table becomes one tab
 * stop whose interior is reachable by arrow keys, which is the difference
 * between a 10,000-row table being usable from a keyboard and being a trap.
 *
 * Three things here are easy to get wrong and are the reason this lives in core
 * rather than in eight adapters:
 *
 * **The ARIA indices are absolute.** `aria-rowindex` counts within the dataset,
 * not within the rendered window. Virtualization mounts 24 rows out of 100,000,
 * so a naive implementation numbers them 1-24 and every assistive technology
 * reports "row 3 of 24" while the user is at row 40,000. `aria-rowcount` and
 * `aria-colcount` carry the totals for the same reason.
 *
 * **A cell the virtualizer has not mounted still has to be reachable.**
 * Ctrl+End on a 100,000-row table asks for a cell that does not exist in the
 * DOM. Moving focus there means scrolling it into existence first, then
 * focusing it once it mounts — which is asynchronous, so the hook holds a
 * pending address and focuses on the render that produces the element.
 *
 * **Focus lives in state, but the DOM has to follow it.** Setting
 * `tabIndex` alone moves nothing; something must call `.focus()`. That happens
 * in an effect keyed on the active address, addressing cells by their
 * `data-grid-cell` attribute so the mechanism does not need a ref per cell —
 * with 100,000 rows, a ref map is a leak with extra steps.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { columnText } from "../columns/columnText";
import { useEventCallback } from "../hooks/useEventCallback";
import type { ColumnDef, Direction, TableLabels } from "../types";
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
  moveGridFocus,
  sameGridCell,
} from "./gridFocus";
import { pasteRangeEdits } from "./pasteRange";

/** The attribute a focusable cell carries, so focus can find it in the DOM. */
export const GRID_CELL_ATTR = "data-grid-cell";

/** `data-grid-cell` value for one address — `"row:col"`, both absolute. */
export function gridCellAttr(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

/** Options for {@link useGridFocus}. */
export interface UseGridFocusOptions<TRow> {
  /** Off unless the host asked for it; when false the hook does nothing. */
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
   * deliberately NOT what movement is clamped to; see the note on navigable
   * bounds below.
   */
  rowCount: number;
  /** Columns in the order they are rendered. */
  columns: readonly ColumnDef<TRow>[];
  /** The rendered rows, for reading a cell's text when focus lands. */
  rows: readonly TRow[];
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
   * {@link UseGridFocusOptions.onPaste}: the table proposes, the host writes.
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

/** What {@link useGridFocus} returns. */
export interface GridFocusState {
  /**
   * Whether cell navigation is on. Consumers render the live region only when
   * it is: an `aria-live` region that appears at the same moment as its text is
   * frequently missed by screen readers, so it has to exist beforehand — and
   * must not exist at all when the feature is off.
   */
  enabled: boolean;
  /** The focused cell, or `null` before the grid has been entered. */
  active: GridCell | null;
  /** Props for the grid container: role, dimensions, key handling. */
  getGridProps: () => Record<string, unknown>;
  /** Props for one cell — roving `tabIndex`, absolute indices, the hook. */
  getCellProps: (cell: GridCell) => Record<string, unknown>;
  /** Props for one row: its absolute `aria-rowindex`. */
  getRowProps: (rowIndex: number) => Record<string, unknown>;
  /**
   * Props for a cell addressed by its position in the RENDERED window — which
   * is the index an adapter already has, whether it is mapping `source.rows` or
   * a virtual entry.
   *
   * The conversion to an absolute address lives here rather than in eight
   * adapters, because getting it wrong is invisible: the table looks right and
   * only a screen reader announces the wrong row.
   */
  getCellPropsAt: (windowIndex: number, col: number) => Record<string, unknown>;
  /** Props for a row addressed by its position in the rendered window. */
  getRowPropsAt: (windowIndex: number) => Record<string, unknown>;
  /** Live-region text naming where focus is. Empty until focus moves. */
  announcement: string;
  /** The selected rectangle, or `null` when nothing is selected. */
  range: CellRange | null;
  /** Select a rectangle programmatically — what a Select-all would call. */
  selectRange: (range: CellRange | null) => void;
  /**
   * Props for a column header that selects its whole column on click, with
   * Ctrl/Cmd+click extending the current selection instead of replacing it.
   */
  getColumnHeaderProps: (
    col: number,
    options?: { sortable?: boolean }
  ) => Record<string, unknown>;
  /**
   * Select a whole column by index — the loaded rows of it, since a column of
   * 100,000 rows cannot be selected while 500 are in hand.
   */
  selectColumn: (col: number, extend?: boolean) => void;
  /**
   * Whether an adapter should draw the per-column header checkbox: the host
   * asked for it AND cell navigation is on, resolved here so a header cell
   * renders on one boolean instead of checking two.
   */
  columnCheckbox: boolean;
  /**
   * Whether the selection is exactly this column, over every loaded row.
   *
   * Exactly — a column inside a wider rectangle reads as unchecked, because a
   * checkbox that ticks while its neighbours are also selected says the
   * selection is one column when it is four.
   */
  isColumnSelected: (col: number) => boolean;
  /**
   * What the header checkbox does: select this column alone, or clear the
   * selection when it is already the only thing selected.
   */
  toggleColumn: (col: number) => void;
  /** Move focus programmatically — the fill handle and clipboard will need it. */
  focusCell: (cell: GridCell) => void;
  /**
   * The cell carrying the fill handle — the selection's bottom inline-end
   * corner — or `null` when there is nothing to fill from or no host to
   * receive it.
   */
  fillHandleCell: GridCell | null;
  /** Props for the adapter-owned fill handle element. */
  getFillHandleProps: () => Record<string, unknown>;
  /** The handle's accessible name, already localized. */
  fillHandleLabel: string;
  /**
   * What a fill in progress would cover, for a kit that wants to draw the
   * preview its own way. `null` unless a fill is being dragged.
   */
  fillPreview: CellRange | null;
  /**
   * Copy or cut without the keyboard.
   *
   * Ctrl+C always has a focused range. A context menu does not — a
   * right-click on a cell with nothing selected has to copy that cell — so
   * an explicit cell wins and the selection is the fallback.
   */
  copyCells: (cell?: GridCell, cut?: boolean) => void;
}

/**
 * Keyboard focus over the cell grid.
 *
 * @typeParam TRow - The row type.
 */
export function useGridFocus<TRow>(
  options: UseGridFocusOptions<TRow>
): GridFocusState {
  const {
    enabled,
    headerCheckbox = false,
    rowCount,
    columns,
    rows,
    firstRowIndex = 0,
    pageSize,
    dir = "ltr",
    labels,
    scrollToRow,
    onActivate,
    onRangeChange,
    onCut,
    onPaste,
    onFill,
    onUndo,
    onRedo,
    onFind,
    matchKeys,
    currentMatch,
    isCoveredCell,
  } = options;

  const [active, setActive] = useState<GridCell | null>(null);
  const [range, setRange] = useState<CellRange | null>(null);
  // A move can outrun the DOM: the target row may not be mounted yet. This
  // holds the address until a render produces its element.
  const pending = useRef<GridCell | null>(null);
  const container = useRef<HTMLElement | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // A drag in progress. Held in a ref rather than state because it changes on
  // every pointer move and must not re-render the grid to be read.
  const dragging = useRef(false);
  // A fill drag is a different gesture from a selection drag — it carries the
  // selection's values rather than growing it — so it has its own flag. Where
  // it has reached IS state: the preview has to render.
  const filling = useRef(false);
  // Where the fill drag has reached, twice over: a ref the release reads
  // synchronously, and state the preview renders from. The release cannot read
  // it from state — running the commit inside a state updater would run it
  // during render, which React rightly warns about and StrictMode runs twice.
  const fillTo = useRef<GridCell | null>(null);
  const [fillPreviewTo, setFillPreviewTo] = useState<GridCell | null>(null);

  // Movement is clamped to the LOADED window, not the dataset.
  //
  // `aria-rowcount` says 100,000 because that is true and a screen reader needs
  // it. But Ctrl+End must not move to row 100,000 when only rows 1-25 are
  // loaded: on a paged table that row is on another page, and on a virtualized
  // one it may not be fetched. Moving there announces a cell the user cannot see
  // and strands DOM focus behind — exactly what the Ant Design demo did in a
  // browser before this existed. Virtualization still reaches every loaded row,
  // because `scrollToRow` mounts it and the window grows as more arrives.
  const lastLoadedRow = firstRowIndex + Math.max(0, rows.length - 1);
  const bounds = useMemo<GridBounds>(
    () => ({
      rowCount: lastLoadedRow + 1,
      colCount: columns.length,
      pageSize: pageSize ?? Math.max(1, rows.length),
    }),
    [lastLoadedRow, columns.length, pageSize, rows.length]
  );

  /** Say where focus landed: the column, then the cell, then the position. */
  const announce = useCallback(
    (cell: GridCell) => {
      const column = columns[cell.col];
      if (!column) return;
      const row = rows[cell.row - firstRowIndex];
      const header =
        typeof column.header === "string" ? column.header : column.key;
      const value = row === undefined ? "" : columnText(column, row);
      const position = (labels?.gridCellPosition ?? defaultPosition)(
        cell.row + 1,
        rowCount
      );
      setAnnouncement(
        value ? `${header}, ${value}, ${position}` : `${header}, ${position}`
      );
    },
    [columns, rows, firstRowIndex, labels, rowCount]
  );

  const selectRange = useCallback(
    (next: CellRange | null) => {
      setRange(next);
      onRangeChange?.(next);
      // Say what was selected, not just where focus is. A single cell says
      // nothing: its own announcement already names it, and repeating "1 cell"
      // on every arrow press turns navigation into noise.
      if (!next || isSingleCell(next)) return;
      const b = cellRangeBounds(next);
      setAnnouncement(
        (labels?.gridRangeSelection ?? defaultRangeSelection)({
          fromRow: b.fromRow + 1,
          toRow: b.toRow + 1,
          fromColumn: b.fromCol + 1,
          toColumn: b.toCol + 1,
          cells: cellRangeSize(next),
        })
      );
    },
    [onRangeChange, labels]
  );

  // What a fill in progress would cover: the selection plus the cells the drag
  // has reached. Rendering it as selected is the preview — one highlight, one
  // meaning, and it cannot disagree with what gets written because both come
  // from the same rectangle.
  const fillPreview = useMemo(
    () =>
      range && fillPreviewTo ? fillTargetRange(range, fillPreviewTo) : null,
    [range, fillPreviewTo]
  );

  const commitFill = useEventCallback((to: GridCell) => {
    if (!range || !onFill) return;
    const edits = fillRangeEdits({
      source: range,
      to,
      rows,
      columns,
      firstRowIndex,
    });
    if (edits.length === 0) return;
    onFill(edits);
    // The filled rectangle stays selected, as it does in a spreadsheet: the
    // next fill continues from what was just written.
    setRange(fillTargetRange(range, to));
    setAnnouncement(
      (labels?.gridRangeFilled ?? defaultRangeFilled)(edits.length)
    );
  });

  const focusCell = useCallback(
    (cell: GridCell) => {
      setActive(cell);
      pending.current = cell;
      // Ask the virtualizer for the row before trying to focus it; if it is
      // already mounted this is a no-op and the effect below focuses at once.
      scrollToRow?.(cell.row);
      announce(cell);
    },
    [scrollToRow, announce]
  );

  // Move the DOM to wherever state says focus is. Keyed on the address AND on
  // the rendered rows, so a cell that arrives from a scroll gets focused on the
  // render that mounts it rather than being lost.
  useEffect(() => {
    if (!enabled) return;
    const target = pending.current;
    if (!target || !container.current) return;
    const element = container.current.querySelector<HTMLElement>(
      `[${GRID_CELL_ATTR}="${gridCellAttr(target)}"]`
    );
    if (!element) return;
    pending.current = null;
    element.focus();
  }, [enabled, active, rows, firstRowIndex]);

  /**
   * Copy or cut, for a caller that is not the keyboard.
   *
   * The key handler always has a focused range to work from. A context
   * menu does not: a right-click on a cell with nothing selected should
   * copy THAT cell, so an explicit one wins and the selection is the
   * fallback rather than the requirement.
   */
  const copyCells = useEventCallback((cell?: GridCell, cut?: boolean) => {
    const selection: CellRange | null = cell
      ? { anchor: cell, head: cell }
      : range;
    if (!selection) return;
    copySelection(selection, cut === true);
  });

  /** Ctrl/Cmd+C and Ctrl/Cmd+X — the rectangle, as a spreadsheet reads it. */
  const copySelection = useEventCallback(
    (selection: CellRange, cut: boolean) => {
      const text = clipboardRangeText({
        range: selection,
        rows,
        columns,
        firstRowIndex,
      });
      void writeClipboardText(text).then((ok) => {
        setAnnouncement(
          ok
            ? (labels?.gridRangeCopied ?? defaultRangeCopied)(
                cellRangeSize(selection)
              )
            : (labels?.gridRangeCopyFailed ?? "Copy failed")
        );
        // A cut only tells the host once the clipboard has the data: clearing
        // cells the clipboard never took would lose them outright.
        if (ok && cut) onCut?.(selection);
      });
    }
  );

  /** Ctrl/Cmd+D — the selection's top row carries into the rest of it. */
  const fillDown = useEventCallback((selection: CellRange) => {
    const b = cellRangeBounds(selection);
    const edits = fillRangeEdits({
      source: {
        anchor: { row: b.fromRow, col: b.fromCol },
        head: { row: b.fromRow, col: b.toCol },
      },
      to: { row: b.toRow, col: b.toCol },
      rows,
      columns,
      firstRowIndex,
    });
    onFill?.(edits);
    setAnnouncement(
      (labels?.gridRangeFilled ?? defaultRangeFilled)(edits.length)
    );
  });

  /** Ctrl/Cmd+V — the clipboard, mapped onto the selection's top-left cell. */
  const pasteInto = useEventCallback((target: CellRange) => {
    void readClipboardText().then((text) => {
      if (text === null) {
        setAnnouncement(labels?.gridRangePasteFailed ?? "Paste failed");
        return;
      }
      const edits = pasteRangeEdits({
        text,
        range: target,
        rows,
        columns,
        firstRowIndex,
      });
      onPaste?.(edits);
      setAnnouncement(
        (labels?.gridRangePasted ?? defaultRangePasted)(edits.length)
      );
    });
  });

  /**
   * The Ctrl/Cmd gestures: copy, cut, fill down, paste.
   *
   * They live together and run before movement, so a modifier never doubles as
   * a navigation key. Each stays the BROWSER'S own when the table has nothing
   * to do with it — no selection, no host handler — which is what `false` says.
   *
   * @returns Whether the table took the key.
   */
  /** Ctrl/Cmd+Z and its two redo spellings, announced either way. */
  const handleHistoryKey = useEventCallback(
    (event: { key: string; shiftKey?: boolean }): boolean => {
      const redo =
        (event.key === "z" && event.shiftKey === true) || event.key === "y";
      const undo = event.key === "z" && event.shiftKey !== true;
      if (!undo && !redo) return false;
      const run = redo ? onRedo : onUndo;
      if (!run) return false;
      const cells = run();
      const say = redo
        ? (labels?.editRedone ?? defaultRedone)
        : (labels?.editUndone ?? defaultUndone);
      setAnnouncement(
        cells === 0
          ? (labels?.editNothingToUndo ?? "Nothing to undo")
          : say(cells)
      );
      return true;
    }
  );

  const handleClipboardKey = useEventCallback(
    (
      event: {
        key: string;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
        preventDefault: () => void;
      },
      from: GridCell
    ): boolean => {
      if (event.ctrlKey !== true && event.metaKey !== true) return false;
      if (handleHistoryKey(event)) {
        event.preventDefault();
        return true;
      }
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
    }
  );

  const onKeyDown = useEventCallback(
    (event: {
      key: string;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
      preventDefault: () => void;
    }) => {
      if (!enabled) return;
      const from = active ?? { row: firstRowIndex, col: 0 };
      if (handleClipboardKey(event, from)) return;

      // Enter and F2 belong to whatever is inside the cell — `EditableCellGate`
      // handles both on the element focus just landed on. This only fires when
      // a host asked for its own activation, and stays out of the way otherwise
      // so the two never race for one key press.
      if (event.key === "Enter" || event.key === "F2") {
        if (onActivate) {
          event.preventDefault();
          onActivate(from);
        }
        return;
      }

      const move = gridFocusMoveForKey(event, dir);
      if (!move) return;
      const moved = moveGridFocus(from, move, bounds, isCoveredCell);
      // The window may not start at row 0 (page 3 of a paged table) and the
      // mover clamps at zero, so hold that floor here too.
      const next = { row: Math.max(moved.row, firstRowIndex), col: moved.col };
      // An edge move resolves to the same cell: swallow the key so the page
      // does not scroll, but say nothing — nothing changed.
      event.preventDefault();
      if (sameGridCell(next, active)) return;

      // Focus first, then the selection: both write the live region, and for a
      // Shift move the RANGE is the news while for a plain move the cell is.
      // Whichever runs last wins, so the order encodes which one matters.
      focusCell(next);
      if (event.shiftKey === true) {
        // Shift extends from wherever the selection began, so pressing
        // Shift+Down twice then Shift+Up shrinks the range rather than starting
        // a new one upward. `from` is the fallback anchor for the first press.
        selectRange(extendCellRange(range, next, from));
      } else {
        // A plain move collapses any selection to the cell landed on, which is
        // what every grid does and what stops a stale rectangle lingering.
        selectRange(singleCellRange(next));
      }
    }
  );

  // A pointer released outside the table would otherwise leave the drag armed,
  // so the next hover over any cell would extend a selection nobody started.
  useEffect(() => {
    if (!enabled) return undefined;
    const end = () => {
      dragging.current = false;
      if (!filling.current) return;
      filling.current = false;
      const to = fillTo.current;
      fillTo.current = null;
      setFillPreviewTo(null);
      // A fill that never left the selection writes nothing, which `commitFill`
      // decides.
      if (to) commitFill(to);
    };
    window.addEventListener("mouseup", end);
    return () => window.removeEventListener("mouseup", end);
  }, [enabled, commitFill]);

  /**
   * Whether the rendered rows are a slice of a bigger set — virtualization, or
   * a server page. Assistive tech counts the rows it can reach, so a windowed
   * table has to state the real size even when cell navigation is off.
   */
  const windowed = rowCount > rows.length;

  const getGridProps = useCallback(() => {
    // `aria-rowcount` is valid on the implicit `role="table"`, so a windowed
    // table can state its size without claiming the grid keyboard semantics
    // that only cell navigation provides. Only the ROWS are a window — every
    // column is in the DOM — so `aria-colcount` stays out of it: it would
    // promise a matching `aria-colindex` per cell that nothing here sets.
    if (!enabled) return windowed ? { "aria-rowcount": rowCount } : {};
    return {
      role: "grid",
      "aria-rowcount": rowCount,
      "aria-colcount": columns.length,
      onKeyDown,
      ref: (node: HTMLElement | null) => {
        container.current = node;
      },
    };
  }, [enabled, windowed, rowCount, columns.length, onKeyDown]);

  const getCellProps = useCallback(
    (cell: GridCell) => {
      if (!enabled) return {};
      const isActive = sameGridCell(cell, active);
      // Exactly one cell is tabbable. Before the grid has ever been entered
      // that is its first cell, so Tab reaches the table at all.
      const firstEver =
        active === null && cell.row === firstRowIndex && cell.col === 0;
      // While a fill is being dragged the highlight shows what it would write.
      const selected = isInCellRange(fillPreview ?? range, cell);
      const key = gridCellAttr(cell);
      const matched = matchKeys?.has(key) === true;
      return {
        [GRID_CELL_ATTR]: gridCellAttr(cell),
        tabIndex: isActive || firstEver ? 0 : -1,
        "aria-colindex": cell.col + 1,
        // Only meaningful once a real rectangle exists: marking every focused
        // cell as selected would tell a screen reader the table is in selection
        // mode when the user has merely arrowed around.
        "aria-selected": range && !isSingleCell(range) ? selected : undefined,
        "data-cell-selected": selected ? "" : undefined,
        "data-cell-match": matched ? "" : undefined,
        "data-cell-match-current":
          matched && sameGridCell(cell, currentMatch ?? null) ? "" : undefined,
        onMouseDown: (event: { shiftKey?: boolean }) => {
          if (event.shiftKey === true) {
            selectRange(extendCellRange(range, cell, active ?? cell));
          } else {
            // A press with no modifier starts a drag AND collapses to this
            // cell: dragging away extends from here, releasing without moving
            // leaves the single-cell selection a plain click should give.
            dragging.current = true;
            selectRange(singleCellRange(cell));
          }
        },
        onMouseEnter: () => {
          // Extending on ENTER rather than on move means one update per cell
          // crossed instead of one per pixel.
          if (filling.current) {
            fillTo.current = cell;
            setFillPreviewTo(cell);
            return;
          }
          if (!dragging.current) return;
          selectRange(extendCellRange(range, cell, active ?? cell));
        },
        onMouseUp: () => {
          dragging.current = false;
        },
        onFocus: () => {
          // A mouse click or a screen reader can move focus without a key
          // press; keep state in step rather than fighting it.
          if (!sameGridCell(cell, active)) setActive(cell);
        },
      };
    },
    [
      enabled,
      active,
      firstRowIndex,
      range,
      fillPreview,
      matchKeys,
      currentMatch,
      selectRange,
    ]
  );

  /**
   * Select an entire column — what a header click and Ctrl/Cmd+click do.
   *
   * The rectangle spans the LOADED rows, the same bound movement obeys: a column
   * of 100,000 rows cannot be selected when only 500 are in hand, and claiming
   * otherwise would export or copy rows the browser has never seen.
   */
  const selectColumn = useCallback(
    (col: number, extend = false) => {
      const top = { row: firstRowIndex, col };
      const bottom = { row: lastLoadedRow, col };
      selectRange(
        extend && range
          ? extendCellRange(range, bottom, range.anchor)
          : { anchor: top, head: bottom }
      );
      focusCell(top);
    },
    [firstRowIndex, lastLoadedRow, range, selectRange, focusCell]
  );

  /**
   * Whether the selection is exactly this column.
   *
   * Both bounds are checked, not just the columns: a rectangle three rows tall
   * inside one column is not that column selected, and a checkbox claiming it
   * is would be wrong in the direction that matters — the reader would think a
   * copy or an export covers rows it does not.
   */
  const isColumnSelected = useCallback(
    (col: number) => {
      if (!enabled || !range) return false;
      const bounds = cellRangeBounds(range);
      return (
        bounds.fromCol === col &&
        bounds.toCol === col &&
        bounds.fromRow === firstRowIndex &&
        bounds.toRow === lastLoadedRow
      );
    },
    [enabled, range, firstRowIndex, lastLoadedRow]
  );

  /**
   * What the header checkbox does.
   *
   * Ticking selects the column alone — the same rectangle a plain click makes.
   * Unticking clears, because nothing selected is the only state one checkbox
   * can return to: a rectangle cannot lose a column out of its middle.
   */
  const toggleColumn = useCallback(
    (col: number) => {
      if (isColumnSelected(col)) {
        selectRange(null);
        return;
      }
      selectColumn(col);
    },
    [isColumnSelected, selectRange, selectColumn]
  );

  /** Props for a column header that selects its column when clicked. */
  const getColumnHeaderProps = useCallback(
    (col: number, options?: { sortable?: boolean }) => {
      if (!enabled) return {};
      return {
        onClick: (event: { ctrlKey?: boolean; metaKey?: boolean }) => {
          const modified = event.ctrlKey === true || event.metaKey === true;
          // A sortable header's plain click already sorts, and the two cannot
          // share it without one breaking. Ctrl/Cmd+click selects anywhere; a
          // plain click selects only where nothing else claims it.
          if (!modified && options?.sortable === true) return;
          selectColumn(col, modified);
        },
      };
    },
    [enabled, selectColumn]
  );

  // The handle sits on the selection's bottom inline-end corner — the last row
  // and last column of the rectangle. Only when a host can receive a fill:
  // an affordance for a gesture nothing listens to is a lie.
  const fillHandleCell = useMemo(() => {
    if (!enabled || !range || !onFill) return null;
    const b = cellRangeBounds(range);
    return { row: b.toRow, col: b.toCol };
  }, [enabled, range, onFill]);

  const getFillHandleProps = useCallback(
    () => ({
      onMouseDown: (event: {
        preventDefault: () => void;
        stopPropagation: () => void;
      }) => {
        // Stop the cell's own press: that one collapses the selection to a
        // single cell, which is the opposite of what a fill starts from.
        event.preventDefault();
        event.stopPropagation();
        filling.current = true;
      },
    }),
    []
  );

  const getRowProps = useCallback(
    (rowIndex: number) =>
      enabled || windowed ? { "aria-rowindex": rowIndex + 1 } : {},
    [enabled, windowed]
  );

  const getCellPropsAt = useCallback(
    (windowIndex: number, col: number) =>
      getCellProps({ row: firstRowIndex + windowIndex, col }),
    [getCellProps, firstRowIndex]
  );

  const getRowPropsAt = useCallback(
    (windowIndex: number) => getRowProps(firstRowIndex + windowIndex),
    [getRowProps, firstRowIndex]
  );

  // Memoized as a whole. A fresh object each render is not a cosmetic problem:
  // an adapter that memoizes on this state — antd derives its `components.table`
  // from it — would rebuild that derivation every render, remount the table, and
  // destroy the focus this hook just placed. Found exactly that way in a browser.
  return useMemo(
    () => ({
      enabled,
      active: enabled ? active : null,
      getGridProps,
      getCellProps,
      getRowProps,
      getCellPropsAt,
      getRowPropsAt,
      announcement: enabled ? announcement : "",
      range: enabled ? range : null,
      selectRange,
      selectColumn,
      columnCheckbox: enabled && headerCheckbox,
      isColumnSelected,
      toggleColumn,
      getColumnHeaderProps,
      focusCell,
      fillHandleCell,
      getFillHandleProps,
      fillHandleLabel: labels?.gridFillHandle ?? "Fill from selection",
      fillPreview: enabled ? fillPreview : null,
      copyCells,
    }),
    [
      enabled,
      active,
      getGridProps,
      getCellProps,
      getRowProps,
      getCellPropsAt,
      getRowPropsAt,
      announcement,
      range,
      selectRange,
      selectColumn,
      headerCheckbox,
      isColumnSelected,
      toggleColumn,
      getColumnHeaderProps,
      focusCell,
      fillHandleCell,
      getFillHandleProps,
      labels,
      fillPreview,
      copyCells,
    ]
  );
}

/** "selected rows 3 to 7, columns 2 to 4, 15 cells" — replaceable via labels. */
function defaultRangeSelection({
  fromRow,
  toRow,
  fromColumn,
  toColumn,
  cells,
}: {
  fromRow: number;
  toRow: number;
  fromColumn: number;
  toColumn: number;
  cells: number;
}): string {
  return `selected rows ${fromRow} to ${toRow}, columns ${fromColumn} to ${toColumn}, ${cells} cells`;
}

/** Whether a rectangle is one row tall — there is nothing to fill down into. */
function isSingleRowRange(range: CellRange): boolean {
  const bounds = cellRangeBounds(range);
  return bounds.fromRow === bounds.toRow;
}

/** "12 cells restored" — replaceable through `labels.editUndone`. */
function defaultUndone(cells: number): string {
  return `${cells} ${cells === 1 ? "cell" : "cells"} restored`;
}

/** "12 cells redone" — replaceable through `labels.editRedone`. */
function defaultRedone(cells: number): string {
  return `${cells} ${cells === 1 ? "cell" : "cells"} redone`;
}

/** "12 cells copied" — replaceable through `labels.gridRangeCopied`. */
function defaultRangeCopied(cells: number): string {
  return `${cells} ${cells === 1 ? "cell" : "cells"} copied`;
}

/** "12 cells filled" — replaceable through `labels.gridRangeFilled`. */
function defaultRangeFilled(cells: number): string {
  return `${cells} ${cells === 1 ? "cell" : "cells"} filled`;
}

/** "12 cells pasted" — replaceable through `labels.gridRangePasted`. */
function defaultRangePasted(cells: number): string {
  return `${cells} ${cells === 1 ? "cell" : "cells"} pasted`;
}

/** "row 41 of 10,000" — replaceable through `labels.gridCellPosition`. */
function defaultPosition(row: number, total: number): string {
  return `row ${row} of ${total}`;
}
