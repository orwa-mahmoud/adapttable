/**
 * Accessible names for a grid: roles, absolute indices, and selection marks.
 *
 * The indices count in the dataset, not in the rendered window. A virtualized
 * table mounting 24 of 100,000 rows still reports row 40,000 as row 40,000.
 */
import {
  type CellRange,
  cellRangeBounds,
  isInCellRange,
  isSingleCell,
} from "./cellRange";
import { type GridCell, sameGridCell } from "./gridFocus";
import { GRID_CELL_ATTR, gridCellAttr } from "./gridNavigation";

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
  if (!input.enabled) {
    return input.columnsWindowed ? { "aria-colindex": cell.col + 1 } : {};
  }
  const { active, range, fillPreview, matchKeys, currentMatch } = input;
  const isActive = sameGridCell(cell, active);
  const firstEver =
    active === null && cell.row === input.firstRowIndex && cell.col === 0;
  const selected = isInCellRange(fillPreview ?? range, cell);
  const key = gridCellAttr(cell);
  const matched = matchKeys?.has(key) === true;
  return {
    [GRID_CELL_ATTR]: key,
    role: "gridcell",
    tabIndex: isActive || firstEver ? 0 : -1,
    "aria-colindex": cell.col + 1,
    "aria-selected": range && !isSingleCell(range) ? selected : undefined,
    "data-cell-selected": selected ? "" : undefined,
    "data-cell-match": matched ? "" : undefined,
    "data-cell-match-current":
      matched && sameGridCell(cell, currentMatch ?? null) ? "" : undefined,
  };
}

/**
 * A digest of every attribute {@link gridCellAttributes} gives the cells of one
 * row. Rows with equal digests render equal cells, so a row whose digest holds
 * can skip a repaint while the focus or the range moves elsewhere.
 *
 * @param input - The same inputs the cell attributes read.
 * @param rowIndex - The row's absolute index in the dataset.
 * @param colCount - How many columns the row renders.
 * @returns The digest.
 *
 * @public
 */
export function gridRowFocusSignature(
  input: GridCellAttributesInput,
  rowIndex: number,
  colCount: number
): string {
  const windowed = input.columnsWindowed ? "w" : "";
  if (!input.enabled) return windowed;
  const { active, range, fillPreview, matchKeys, currentMatch } = input;
  const activeCol = active?.row === rowIndex ? String(active.col) : "";
  const firstEver =
    active === null && rowIndex === input.firstRowIndex ? "f" : "";
  const multiple = range && !isSingleCell(range) ? "m" : "";
  const span = rowRangeSpan(fillPreview ?? range, rowIndex);
  const matches = rowMatchColumns(matchKeys, rowIndex, colCount);
  const current =
    currentMatch?.row === rowIndex ? String(currentMatch.col) : "";
  return `${windowed}|${activeCol}|${firstEver}|${multiple}|${span}|${matches}|${current}`;
}

/** The columns a range covers on one row, as `from-to`, or empty. */
function rowRangeSpan(range: CellRange | null, rowIndex: number): string {
  if (!range) return "";
  const bounds = cellRangeBounds(range);
  return rowIndex >= bounds.fromRow && rowIndex <= bounds.toRow
    ? `${String(bounds.fromCol)}-${String(bounds.toCol)}`
    : "";
}

/** The columns of one row the find bar matched, comma-separated. */
function rowMatchColumns(
  matchKeys: ReadonlySet<string> | undefined,
  rowIndex: number,
  colCount: number
): string {
  if (!matchKeys || matchKeys.size === 0) return "";
  let matches = "";
  for (let col = 0; col < colCount; col += 1) {
    if (matchKeys.has(gridCellAttr({ row: rowIndex, col }))) {
      matches += `${String(col)},`;
    }
  }
  return matches;
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
