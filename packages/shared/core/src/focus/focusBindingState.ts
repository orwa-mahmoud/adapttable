/**
 * Shared state shapes a framework binding returns from its hooks. Each
 * binding adapts core's stores to its reactivity and hands back these
 * shapes, so a kit reads the same fields in every framework.
 */
import type { CellRange } from "./cellRange";
import type { GridCell } from "./gridFocus";

/**
 * What `useGridFocus` returns.
 *
 * @public
 */
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
  /**
   * What the focus, range, fill handle and find matches draw on the row at
   * this rendered position, as a digest: a row repaints only when it changes.
   */
  rowFocusSignature?: (windowIndex: number) => string;
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
  /**
   * The grid address of one cell, named by row key and column key.
   *
   * Resolved against the rows and columns THIS grid was given, so it follows
   * sorting, filtering, paging, pinned rows and virtualization without a
   * caller re-deriving any of it. `undefined` when the row is not on screen,
   * the column is not visible, or no `getRowId` was supplied.
   */
  cellAt: (rowId: string, columnKey: string) => GridCell | undefined;
}
