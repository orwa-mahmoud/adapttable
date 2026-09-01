import type { CSSProperties } from "react";

import { PIN_Z } from "../columns/columnLayoutModel";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { BodyCell } from "./cellSpan";
import type { ExtraRow } from "./extraRows";
import type { RowPinningState, RowPinSide, RowPinState } from "./rowPinning";
import type { RowHeight, RowStyle } from "./rowStyle";

/**
 * Resolve `rowHeight` for one row.
 *
 * @public
 */
export function resolveRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  row: TRow,
  index: number
): number | undefined {
  if (rowHeight === undefined) return undefined;
  return typeof rowHeight === "number" ? rowHeight : rowHeight(row, index);
}

/**
 * Merge `rowStyle` with an explicit height.
 *
 * @public
 */
export function resolveRowStyle<TRow>(
  rowStyle: RowStyle<TRow> | undefined,
  rowHeight: RowHeight<TRow> | undefined,
  row: TRow,
  index: number
): CSSProperties | undefined {
  const style = rowStyle?.(row, index);
  const height = resolveRowHeight(rowHeight, row, index);
  if (style === undefined && height === undefined) return undefined;
  if (height === undefined) return style;
  return { ...style, height };
}

/**
 * Stable compare key for a memoized row's resolved style.
 *
 * @public
 */
export function rowStyleSignature(style: CSSProperties | undefined): string {
  if (style === undefined) return "";
  return JSON.stringify(style);
}

/**
 * Virtualizer estimate from a constant or per-row height.
 *
 * @public
 */
export function estimateFromRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  fallback: number,
  rowAt: (index: number) => { row: TRow; index: number } | undefined
): (index: number) => number {
  if (rowHeight === undefined) return () => fallback;
  if (typeof rowHeight === "number") return () => rowHeight;
  return (index: number) => {
    const found = rowAt(index);
    if (!found) return fallback;
    return rowHeight(found.row, found.index);
  };
}

/**
 * The host row's background fill for an injected extra row.
 *
 * @public
 */
export function extraHostFillStyle<TRow>(
  extraKey: string,
  extraRows: readonly ExtraRow[] | undefined,
  rows: readonly TRow[],
  getRowId: (row: TRow) => string,
  rowStyle: RowStyle<TRow> | undefined
): CSSProperties | undefined {
  const extra = extraRows?.find((item) => item.key === extraKey);
  if (!extra?.beforeRowId) return undefined;
  const index = rows.findIndex((row) => getRowId(row) === extra.beforeRowId);
  if (index < 0) return undefined;
  const visual = resolveRowStyle(rowStyle, undefined, rows[index]!, index);
  if (!visual) return undefined;
  const fill: CSSProperties = {};
  if (visual.backgroundColor !== undefined) {
    fill.backgroundColor = visual.backgroundColor;
  }
  if (visual.background !== undefined) fill.background = visual.background;
  return Object.keys(fill).length > 0 ? fill : undefined;
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

/**
 * Sticky style for a pinned row section.
 *
 * @public
 */
export function pinnedRowStickyStyle(
  side: RowPinSide,
  headerOffsetPx: number
): { position: "sticky"; top?: number; bottom?: number; zIndex: number } {
  if (side === "top") {
    return {
      position: "sticky",
      top: headerOffsetPx,
      zIndex: PIN_Z.rowPinned,
    };
  }
  return {
    position: "sticky",
    bottom: 0,
    zIndex: PIN_Z.rowPinned,
  };
}

/**
 * Sticky style when row pinning is enabled.
 *
 * @public
 */
export function pinnedRowSticky(
  side: RowPinSide | undefined,
  sticky: boolean,
  headerOffsetPx: number
): ReturnType<typeof pinnedRowStickyStyle> | undefined {
  if (!sticky || !side) return undefined;
  const offset = side === "bottom" ? 0 : headerOffsetPx;
  return pinnedRowStickyStyle(side, offset);
}

/**
 * Sticky inset and stacking for a cell in a pinned row.
 *
 * @public
 */
export function pinnedRowCellStyle(
  side: RowPinSide | undefined,
  headerOffsetPx: number,
  columnPinned: boolean
): {
  position?: "sticky";
  top?: number;
  bottom?: number;
  zIndex?: number;
} {
  if (!side) return {};
  const edge = side === "top" ? { top: headerOffsetPx } : { bottom: 0 };
  return {
    position: "sticky",
    ...edge,
    zIndex: columnPinned ? PIN_Z.rowPinnedColumn : PIN_Z.rowPinned,
  };
}

/**
 * Split rows into top pins, the scroll window, and bottom pins.
 *
 * @public
 */
export function partitionPinnedRows<TRow>(
  rows: readonly TRow[],
  state: RowPinState,
  getRowId: (row: TRow) => string
): { top: TRow[]; scroll: TRow[]; bottom: TRow[] } {
  const topSet = new Set(state.top);
  const bottomSet = new Set(state.bottom);
  const byId = new Map<string, TRow>();
  for (const row of rows) byId.set(getRowId(row), row);
  const top: TRow[] = [];
  for (const id of state.top) {
    const row = byId.get(id);
    if (row !== undefined) top.push(row);
  }
  const bottom: TRow[] = [];
  for (const id of state.bottom) {
    const row = byId.get(id);
    if (row !== undefined) bottom.push(row);
  }
  const scroll: TRow[] = [];
  for (const row of rows) {
    const id = getRowId(row);
    if (!topSet.has(id) && !bottomSet.has(id)) scroll.push(row);
  }
  return { top, scroll, bottom };
}

/**
 * Memo digest for one row's pin state.
 *
 * @public
 */
export function rowPinSignature(
  pinning: Pick<RowPinningState<unknown>, "sideOf"> | undefined,
  rowId: string
): string | null {
  if (!pinning) return null;
  return pinning.sideOf(rowId) ?? "";
}

/**
 * Whether any cell in a row has an unsettled change.
 *
 * @public
 */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return editing?.dirty?.isRowDirty(rowId) ?? false;
}

/**
 * Memo digest for one row's editing state.
 *
 * @public
 */
export function rowEditingSignature<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): string | null {
  if (!editing) return null;
  const { active, draft } = editing.state;
  const marked = editing.validation?.rowHasError(rowId) ?? false;
  const busy = editing.validation?.isValidating(rowId, active?.columnKey ?? "");
  const save = editing.saving?.signature ?? "";
  const rowSave = save.includes(`${rowId} `) ? save : "";
  const marks = editing.dirty?.signature ?? "";
  const rowMarks = marks.includes(`${rowId} `) ? marks : "";
  const rowMode = editing.rowEditing;
  const rowDrafts =
    rowMode?.activeRowId === rowId ? (rowMode.signature ?? "") : "";
  const batchAll = editing.batch?.signature ?? "";
  const batchRow =
    batchAll.split(";").find((entry) => entry.startsWith(`${rowId}:`)) ?? "";
  const live = editing.conflict?.current;
  const conflictMark =
    live?.rowId === rowId
      ? `conflict:${live.columnKey}:${live.incomingValue}`
      : "";
  if (active?.rowId !== rowId) {
    const base = `${rowSave}${rowMarks}${rowDrafts}${batchRow}${conflictMark}`;
    return marked ? `invalid${base}` : base;
  }
  const message = editing.validation?.errorFor(rowId, active.columnKey) ?? "";
  return `${active.columnKey}:${draft}:${message}:${busy === true ? "1" : ""}${rowSave}${rowMarks}${rowDrafts}${batchRow}${conflictMark}`;
}
