/**
 * Row and column spanning — one cell list per row, every kit.
 *
 * A span is a rectangle. The origin cell carries `colSpan` / `rowSpan`; every
 * covered cell is omitted from that row's list so a kit just maps the list.
 * Column pins clip a span at the pin boundary (a pinned cell and a scrolling
 * cell cannot share one `<td>`). A column window clips the same way: a span
 * that starts off-screen continues on the first visible column it covers.
 *
 * Mobile cards ignore geometry — a card is a list of fields, not a grid.
 * Spans are derived from data, so there is nothing to put in the URL.
 */
import type { PinOffset } from "../columns/useColumnLayout";
import type { ColumnDef } from "../types";

/**
 * What {@link GetCellSpan} may return. Omitted sides default to 1.
 *
 * @public
 */
export interface CellSpanRequest {
  colSpan?: number;
  rowSpan?: number;
}

/**
 * Arguments {@link GetCellSpan} receives for one origin.
 *
 * @public
 */
export interface GetCellSpanArgs<TRow> {
  row: TRow;
  column: ColumnDef<TRow>;
  /** Dataset-relative row index (page offset included). */
  rowIndex: number;
  /** Index in the full visible column list. */
  columnIndex: number;
  /**
   * Rows in visual body order (pinned top, then scroll, then pinned
   * bottom). Walk this list for a consecutive merge so pinning a teammate
   * does not split one Team run into two cells.
   */
  sectionRows: readonly TRow[];
  /** Index of `row` in {@link GetCellSpanArgs.sectionRows}. */
  sectionRowIndex: number;
}

/**
 * Host callback that decides a cell's span.
 *
 * @public
 */
export type GetCellSpan<TRow> = (
  args: GetCellSpanArgs<TRow>
) => CellSpanRequest | undefined;

/**
 * How a spanned cell is painted. `"merged"` (the default) is the spreadsheet
 * look: centered content, one fill across the span. `"plain"` is geometry
 * only — same chrome as a 1×1 cell — so a host can draw a calendar bar
 * themselves.
 *
 * @public
 */
export type CellSpanAppearance = "merged" | "plain";

/**
 * `"2x1"` when this cell owns more than one slot; otherwise nothing.
 *
 * @public
 */
export function cellSpanMark(
  colSpan: number,
  rowSpan: number
): string | undefined {
  if (colSpan <= 1 && rowSpan <= 1) return undefined;
  return `${colSpan}x${rowSpan}`;
}

/**
 * One body cell a kit renders — covered cells never appear.
 *
 * @public
 */
export interface BodyCell<TRow> {
  column: ColumnDef<TRow>;
  /** Index in the full visible column list — what focus addresses. */
  columnIndex: number;
  colSpan: number;
  rowSpan: number;
}

/**
 * True when any origin cell is taller than one row.
 *
 * @public
 */
export function bodyCellsHaveRowSpan(
  cellsByRow: ReadonlyMap<string, readonly { rowSpan: number }[]>
): boolean {
  for (const cells of cellsByRow.values()) {
    for (const cell of cells) {
      if (cell.rowSpan > 1) return true;
    }
  }
  return false;
}

/**
 * True when the host asked for any span.
 *
 * @public
 */
export function spanningArmed<TRow>(
  columns: readonly ColumnDef<TRow>[],
  getCellSpan: GetCellSpan<TRow> | undefined
): boolean {
  if (getCellSpan) return true;
  return columns.some(
    (column) => column.colSpan !== undefined || column.rowSpan !== undefined
  );
}

function clampSpan(value: number | undefined, remaining: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return 1;
  return Math.min(Math.floor(value), Math.max(1, remaining));
}

function columnSpanOf<TRow>(
  column: ColumnDef<TRow>,
  row: TRow
): number | undefined {
  return typeof column.colSpan === "function"
    ? column.colSpan(row)
    : column.colSpan;
}

function rowSpanOf<TRow>(
  column: ColumnDef<TRow>,
  row: TRow
): number | undefined {
  return typeof column.rowSpan === "function"
    ? column.rowSpan(row)
    : column.rowSpan;
}

/** Resolve one origin's span, clamped to what is left of the grid. */
export function resolveCellSpan<TRow>(
  args: GetCellSpanArgs<TRow>,
  getCellSpan: GetCellSpan<TRow> | undefined,
  remainingCols: number,
  remainingRows: number
): { colSpan: number; rowSpan: number } {
  const asked = getCellSpan?.(args);
  return {
    colSpan: clampSpan(
      asked?.colSpan ?? columnSpanOf(args.column, args.row),
      remainingCols
    ),
    rowSpan: clampSpan(
      asked?.rowSpan ?? rowSpanOf(args.column, args.row),
      remainingRows
    ),
  };
}

/** Clip a column span so it does not cross a pin boundary. */
export function clipColSpanAtPin<TRow>(
  columns: readonly ColumnDef<TRow>[],
  start: number,
  colSpan: number,
  pinOffset?: (key: string) => PinOffset | undefined
): number {
  if (!pinOffset || colSpan <= 1) return colSpan;
  const startSide = pinOffset(columns[start]?.key ?? "")?.side;
  let span = 1;
  for (let offset = 1; offset < colSpan && start + offset < columns.length;) {
    const next = columns[start + offset];
    if (!next || pinOffset(next.key)?.side !== startSide) break;
    span += 1;
    offset += 1;
  }
  return span;
}

function keyOf(row: number, col: number): string {
  return `${row}:${col}`;
}

interface Origin {
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
}

function markCoverage(
  origins: Map<string, Origin>,
  covered: Map<string, Origin>,
  origin: Origin
): void {
  origins.set(keyOf(origin.row, origin.col), origin);
  for (let rowOffset = 0; rowOffset < origin.rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < origin.colSpan; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      covered.set(
        keyOf(origin.row + rowOffset, origin.col + colOffset),
        origin
      );
    }
  }
}

function firstWindowedColumn(
  origin: Origin,
  columns: readonly { key: string }[],
  windowKeys: ReadonlySet<string>
): number | undefined {
  for (let offset = 0; offset < origin.colSpan; offset += 1) {
    const column = columns[origin.col + offset];
    if (column && windowKeys.has(column.key)) return origin.col + offset;
  }
  return undefined;
}

function windowedColSpan(
  origin: Origin,
  startCol: number,
  columns: readonly { key: string }[],
  windowKeys: ReadonlySet<string>
): number {
  let span = 0;
  for (let col = startCol; col < origin.col + origin.colSpan; col += 1) {
    const column = columns[col];
    if (!column || !windowKeys.has(column.key)) break;
    span += 1;
  }
  return Math.max(1, span);
}

function originSpan<TRow>(options: {
  row: TRow;
  column: ColumnDef<TRow>;
  localRow: number;
  col: number;
  firstRowIndex: number;
  remainingCols: number;
  remainingRows: number;
  sectionRows: readonly TRow[];
  getCellSpan: GetCellSpan<TRow> | undefined;
  armed: boolean;
}): { colSpan: number; rowSpan: number } {
  const {
    row,
    column,
    localRow,
    col,
    firstRowIndex,
    remainingCols,
    remainingRows,
    sectionRows,
    getCellSpan,
    armed,
  } = options;
  if (!armed) return { colSpan: 1, rowSpan: 1 };
  return resolveCellSpan(
    {
      row,
      column,
      rowIndex: firstRowIndex + localRow,
      columnIndex: col,
      sectionRows,
      sectionRowIndex: localRow,
    },
    getCellSpan,
    remainingCols,
    remainingRows
  );
}

function collectOrigins<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  getCellSpan?: GetCellSpan<TRow>;
  firstRowIndex: number;
  pinOffset?: (key: string) => PinOffset | undefined;
}): { origins: Map<string, Origin>; covered: Map<string, Origin> } {
  const { rows, columns, getCellSpan, firstRowIndex, pinOffset } = options;
  const origins = new Map<string, Origin>();
  const covered = new Map<string, Origin>();
  const armed = spanningArmed(columns, getCellSpan);
  for (let localRow = 0; localRow < rows.length; localRow += 1) {
    const row = rows[localRow]!;
    for (let col = 0; col < columns.length; col += 1) {
      if (covered.has(keyOf(localRow, col))) continue;
      const span = originSpan({
        row,
        column: columns[col]!,
        localRow,
        col,
        firstRowIndex,
        remainingCols: columns.length - col,
        remainingRows: rows.length - localRow,
        sectionRows: rows,
        getCellSpan,
        armed,
      });
      markCoverage(origins, covered, {
        row: localRow,
        col,
        colSpan: clipColSpanAtPin(columns, col, span.colSpan, pinOffset),
        rowSpan: span.rowSpan,
      });
    }
  }
  return { origins, covered };
}

function windowedOriginCell<TRow>(
  origin: Origin,
  columns: readonly ColumnDef<TRow>[],
  windowKeys: ReadonlySet<string> | undefined
): BodyCell<TRow> | undefined {
  const startCol = windowKeys
    ? firstWindowedColumn(origin, columns, windowKeys)
    : origin.col;
  if (startCol === undefined) return undefined;
  return {
    column: columns[startCol]!,
    columnIndex: startCol,
    colSpan: windowKeys
      ? windowedColSpan(origin, startCol, columns, windowKeys)
      : origin.colSpan,
    rowSpan: origin.rowSpan,
  };
}

/** Row-span whose origin sits outside this section (or off the window). */
function rowSpanContinuation<TRow>(
  cover: Origin | undefined,
  localRow: number,
  col: number,
  columns: readonly ColumnDef<TRow>[],
  windowKeys: ReadonlySet<string> | undefined
): BodyCell<TRow> | undefined {
  if (!cover || !windowKeys || cover.row === localRow) return undefined;
  if (firstWindowedColumn(cover, columns, windowKeys) !== col) return undefined;
  if (windowKeys.has(columns[cover.col]?.key ?? "")) return undefined;
  return {
    column: columns[col]!,
    columnIndex: col,
    colSpan: windowedColSpan(cover, col, columns, windowKeys),
    rowSpan: cover.rowSpan - (localRow - cover.row),
  };
}

function emitRowCells<TRow>(
  localRow: number,
  columns: readonly ColumnDef<TRow>[],
  origins: Map<string, Origin>,
  covered: Map<string, Origin>,
  windowKeys: ReadonlySet<string> | undefined
): BodyCell<TRow>[] {
  const cells: BodyCell<TRow>[] = [];
  for (let col = 0; col < columns.length; col += 1) {
    const origin = origins.get(keyOf(localRow, col));
    if (origin) {
      const cell = windowedOriginCell(origin, columns, windowKeys);
      if (cell) cells.push(cell);
      continue;
    }
    const cell = rowSpanContinuation(
      covered.get(keyOf(localRow, col)),
      localRow,
      col,
      columns,
      windowKeys
    );
    if (cell) cells.push(cell);
  }
  return cells;
}

/**
 * Per-row body cells for the visual body (pinned top, scroll, then pinned
 * bottom). A consecutive merge walks that whole list so pinning a teammate
 * does not split one Team run. HTML `rowSpan` still needs those rows in
 * one tbody.
 *
 * @public
 */
export function buildBodyCells<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  getRowId: (row: TRow) => string;
  getCellSpan?: GetCellSpan<TRow>;
  firstRowIndex?: number;
  pinOffset?: (key: string) => PinOffset | undefined;
  windowKeys?: ReadonlySet<string>;
}): ReadonlyMap<string, readonly BodyCell<TRow>[]> {
  const { rows, columns, getRowId, getCellSpan, pinOffset, windowKeys } =
    options;
  const result = new Map<string, BodyCell<TRow>[]>();
  if (columns.length === 0) {
    for (const row of rows) result.set(getRowId(row), []);
    return result;
  }
  const { origins, covered } = collectOrigins({
    rows,
    columns,
    getCellSpan,
    firstRowIndex: options.firstRowIndex ?? 0,
    pinOffset,
  });
  for (let localRow = 0; localRow < rows.length; localRow += 1) {
    result.set(
      getRowId(rows[localRow]!),
      emitRowCells(localRow, columns, origins, covered, windowKeys)
    );
  }
  return result;
}

function markCoveredRectangle(
  covered: Set<string>,
  seen: Set<string>,
  localRow: number,
  col: number,
  firstRowIndex: number,
  colSpan: number,
  rowSpan: number
): void {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      seen.add(keyOf(localRow + rowOffset, col + colOffset));
      if (rowOffset === 0 && colOffset === 0) continue;
      covered.add(keyOf(firstRowIndex + localRow + rowOffset, col + colOffset));
    }
  }
}

/**
 * Addresses (`row:col`, dataset-relative) covered by a span, not origins.
 *
 * @public
 */
export function coveredAddressSet<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  getCellSpan?: GetCellSpan<TRow>;
  firstRowIndex?: number;
  pinOffset?: (key: string) => PinOffset | undefined;
}): ReadonlySet<string> {
  const { rows, columns, getCellSpan, pinOffset } = options;
  const firstRowIndex = options.firstRowIndex ?? 0;
  const covered = new Set<string>();
  if (!spanningArmed(columns, getCellSpan)) return covered;
  const seen = new Set<string>();
  for (let localRow = 0; localRow < rows.length; localRow += 1) {
    const row = rows[localRow]!;
    for (let col = 0; col < columns.length; col += 1) {
      if (seen.has(keyOf(localRow, col))) continue;
      const span = resolveCellSpan(
        {
          row,
          column: columns[col]!,
          rowIndex: firstRowIndex + localRow,
          columnIndex: col,
          sectionRows: rows,
          sectionRowIndex: localRow,
        },
        getCellSpan,
        columns.length - col,
        rows.length - localRow
      );
      markCoveredRectangle(
        covered,
        seen,
        localRow,
        col,
        firstRowIndex,
        clipColSpanAtPin(columns, col, span.colSpan, pinOffset),
        span.rowSpan
      );
    }
  }
  return covered;
}

/**
 * Memo digest so a virtualized row repaints when its spans change.
 *
 * @public
 */
export function rowSpanSignature<TRow>(
  cells: readonly BodyCell<TRow>[] | undefined
): string {
  if (!cells || cells.length === 0) return "";
  return cells
    .map((cell) => `${cell.column.key}:${cell.colSpan}x${cell.rowSpan}`)
    .join(",");
}

/**
 * Look up a row's cells; empty when the row is unknown.
 *
 * @public
 */
export function cellsForRow<TRow>(
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]> | undefined,
  rowKey: string
): readonly BodyCell<TRow>[] {
  return cellsByRow?.get(rowKey) ?? [];
}
