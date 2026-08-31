/**
 * Lean desktop-assembly helpers — no optional feature modules.
 *
 * Small functions live here in full. Heavy implementations (cell-span math,
 * extra-row splicing, column-resize drag) are injected through
 * {@link resolveAssembly} when the owning feature is composed.
 */
import type { CSSProperties, ReactNode } from "react";

import { PIN_Z } from "../columns/columnLayoutModel";
import type { ColumnResizeHandleProps } from "../columns/columnResize";
import type { PinOffset } from "../columns/columnLayoutModel";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { FilterDef } from "../filters/filterDefs";
import type { BodyCell, GetCellSpan } from "../rows/cellSpan";
import type { ExtraEntry, ExtraRow } from "../rows/extraRows";
import type { RowPinningState, RowPinSide } from "../rows/rowPinning";
import type { RowReorderState } from "../rows/rowReorder";
import type { RowHeight, RowStyle } from "../rows/rowStyle";
import type { TreeEntry } from "../tree/treeRows";
import type { ColumnDef } from "../types";

/** Width (px) reserved for the leading reorder column. */
export const REORDER_COLUMN_WIDTH = 40;

const LIFTED_OPACITY = 0.45;

/**
 * Overridable heavies. Lean defaults keep optional modules out of the graph.
 *
 * @public
 */
export interface AssemblyFns<TRow = unknown> {
  buildBodyCells: (options: {
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    getCellSpan?: GetCellSpan<TRow>;
    firstRowIndex?: number;
    pinOffset?: (key: string) => PinOffset | undefined;
    windowKeys?: ReadonlySet<string>;
  }) => ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  insertExtraRows: <T extends { key: string }>(
    entries: readonly T[],
    extraRows: readonly ExtraRow[] | undefined,
    dataKey: (entry: T) => string | undefined
  ) => readonly (T | ExtraEntry)[];
  insertExtrasBeforeRows: (
    rows: readonly TRow[],
    extraRows: readonly ExtraRow[] | undefined,
    getRowId: (row: TRow) => string
  ) => readonly ({ key: string; row: TRow } | ExtraEntry)[];
  extraHostFillStyle: (
    extraKey: string,
    extraRows: readonly ExtraRow[] | undefined,
    rows: readonly TRow[],
    getRowId: (row: TRow) => string,
    rowStyle: RowStyle<TRow> | undefined
  ) => CSSProperties | undefined;
  inflateBodyCellRowSpans: (
    cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>,
    visualIds: readonly string[],
    extraRows: readonly ExtraRow[] | undefined
  ) => ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  extraCoveredTableSlots: (
    beforeRowId: string,
    options: {
      visualIds: readonly string[];
      cellsByRow: ReadonlyMap<
        string,
        readonly { columnIndex: number; colSpan: number; rowSpan: number }[]
      >;
      extraRows?: readonly ExtraRow[];
      leadingCells: number;
    }
  ) => ReadonlySet<number>;
  columnResizeHandleProps: (
    key: string,
    setWidth: (key: string, width: number) => void,
    label: string
  ) => ColumnResizeHandleProps | undefined;
}

function leanBuildBodyCells<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly ColumnDef<TRow>[];
  getRowId: (row: TRow) => string;
  windowKeys?: ReadonlySet<string>;
}): ReadonlyMap<string, readonly BodyCell<TRow>[]> {
  const result = new Map<string, BodyCell<TRow>[]>();
  for (const row of options.rows) {
    const cells: BodyCell<TRow>[] = [];
    options.columns.forEach((column, columnIndex) => {
      if (options.windowKeys && !options.windowKeys.has(column.key)) return;
      cells.push({ column, columnIndex, colSpan: 1, rowSpan: 1 });
    });
    result.set(options.getRowId(row), cells);
  }
  return result;
}

function leanInsertExtraRows<T extends { key: string }>(
  entries: readonly T[]
): readonly T[] {
  return entries;
}

function leanInsertExtrasBeforeRows<TRow>(
  rows: readonly TRow[],
  _extraRows: readonly ExtraRow[] | undefined,
  getRowId: (row: TRow) => string
): readonly { key: string; row: TRow }[] {
  return rows.map((row) => ({ key: getRowId(row), row }));
}

function leanExtraHostFillStyle<TRow>(
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

function leanInflateBodyCellRowSpans<TRow>(
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>
): ReadonlyMap<string, readonly BodyCell<TRow>[]> {
  return cellsByRow;
}

function leanExtraCoveredTableSlots(): ReadonlySet<number> {
  return new Set();
}

function leanColumnResizeHandleProps(): undefined {
  return undefined;
}

/** Lean defaults — identity / 1×1 / no-op. */
export const LEAN_ASSEMBLY: AssemblyFns = {
  buildBodyCells: leanBuildBodyCells,
  insertExtraRows: leanInsertExtraRows,
  insertExtrasBeforeRows: leanInsertExtrasBeforeRows,
  extraHostFillStyle: leanExtraHostFillStyle,
  inflateBodyCellRowSpans: leanInflateBodyCellRowSpans,
  extraCoveredTableSlots: leanExtraCoveredTableSlots,
  columnResizeHandleProps: leanColumnResizeHandleProps,
};

/**
 * Merge a feature-supplied bag onto the lean defaults.
 *
 * @public
 */
export function resolveAssembly<TRow>(
  partial?: Partial<AssemblyFns<TRow>>
): AssemblyFns<TRow> {
  return { ...LEAN_ASSEMBLY, ...partial } as AssemblyFns<TRow>;
}

/** The definition that drives a column's header filter, if any. */
export function filterDefForColumn<TRow>(
  defs: readonly FilterDef<TRow>[],
  key: string
): FilterDef<TRow> | undefined {
  return defs.find((def) => (def.column ?? def.key) === key);
}

/** Accessible name for a column-selection checkbox. */
export function columnSelectLabel(
  label: string | undefined,
  column: { header?: ReactNode; key: string }
): string {
  const name = typeof column.header === "string" ? column.header : column.key;
  return `${label ?? "Select column"}: ${name}`;
}

/** Memo digest for flashing cells on one row. */
export function rowFlashSignature(
  isCellFlashing: ((rowId: string, columnKey: string) => boolean) | undefined,
  rowId: string,
  columns: readonly { readonly key: string }[]
): string {
  if (!isCellFlashing) return "";
  const keys: string[] = [];
  for (const column of columns) {
    if (isCellFlashing(rowId, column.key)) keys.push(column.key);
  }
  return keys.join(",");
}

/** True when any origin cell is taller than one row. */
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

/** Memo digest so a virtualized row repaints when its spans change. */
export function rowSpanSignature<TRow>(
  cells: readonly BodyCell<TRow>[] | undefined
): string {
  if (!cells || cells.length === 0) return "";
  return cells
    .map((cell) => `${cell.column.key}:${cell.colSpan}x${cell.rowSpan}`)
    .join(",");
}

/** Look up a row's cells; empty when the row is unknown. */
export function cellsForRow<TRow>(
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]> | undefined,
  rowKey: string
): readonly BodyCell<TRow>[] {
  return cellsByRow?.get(rowKey) ?? [];
}

/** Narrow a body slot to a host-injected extra. */
export function isExtraEntry(entry: object): entry is ExtraEntry {
  if (!("kind" in entry)) return false;
  const kind = (entry as { kind?: unknown }).kind;
  return kind === "separator" || kind === "fullWidth";
}

/** Resolve `rowHeight` for one row. */
function resolveRowHeight<TRow>(
  rowHeight: RowHeight<TRow> | undefined,
  row: TRow,
  index: number
): number | undefined {
  if (rowHeight === undefined) return undefined;
  return typeof rowHeight === "number" ? rowHeight : rowHeight(row, index);
}

/** Merge `rowStyle` with an explicit height. */
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

/** Stable compare key for a memoized row's resolved style. */
export function rowStyleSignature(style: CSSProperties | undefined): string {
  if (style === undefined) return "";
  return JSON.stringify(style);
}

/** Part name for a pinned row, or `undefined` when the row is not pinned. */
export function pinnedRowPart(
  side: RowPinSide | undefined
): "pinned-top" | "pinned-bottom" | undefined {
  if (side === "top") return "pinned-top";
  if (side === "bottom") return "pinned-bottom";
  return undefined;
}

/** Sticky style when the row is pinned and the kit asked for sticky pins. */
export function pinnedRowSticky(
  side: RowPinSide | undefined,
  sticky: boolean,
  headerOffsetPx: number
):
  | { position: "sticky"; top?: number; bottom?: number; zIndex: number }
  | undefined {
  if (!sticky || !side) return undefined;
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

/** Extra sticky inset a cell in a pinned row needs. */
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

/** Memo digest so a virtualized row repaints when it is pinned or unpinned. */
export function rowPinSignature(
  pinning: Pick<RowPinningState<unknown>, "sideOf"> | undefined,
  rowId: string
): string | null {
  if (!pinning) return null;
  return pinning.sideOf(rowId) ?? "";
}

/** Whether to mark the row dirty. */
export function rowIsDirty<TRow>(
  editing: EditableCellEditing<TRow> | undefined,
  rowId: string
): boolean {
  return editing?.dirty?.isRowDirty(rowId) ?? false;
}

/** Memo digest for one desktop/card row's editing state. */
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

/** Drop-edge paint for a row being reordered. */
export function rowReorderDropStyle(
  attrs: { "data-dragging"?: ""; "data-drop"?: "before" | "after" } | undefined
): CSSProperties {
  if (attrs === undefined) return {};
  const edge = attrs["data-drop"];
  const offset = edge === "before" ? "2px" : "-2px";
  return {
    opacity: attrs["data-dragging"] === "" ? LIFTED_OPACITY : undefined,
    boxShadow: edge ? `inset 0 ${offset} 0 0 currentColor` : undefined,
  };
}

/** Memo digest for one row's reorder state. */
export function rowReorderSignature<TRow>(
  reorder: RowReorderState<TRow> | undefined,
  rowId: string,
  localIndex: number
): string | null {
  if (!reorder) return null;
  const inFlight = reorder.lifted !== null ? "L" : "";
  const lifted = reorder.isLifted(rowId) ? "d" : "";
  const targeted =
    reorder.overIndex === localIndex && reorder.lifted !== null ? "t" : "";
  return `${inFlight}${lifted}${targeted}`;
}

/** Rows a body renders: tree entries when armed, otherwise the flat list. */
export function bodyRowEntries<TRow>(
  rows: readonly {
    row: TRow;
    index: number;
    key: string;
    sourceIndex?: number;
  }[],
  tree?: { entries: readonly TreeEntry<TRow>[] }
): {
  row: TRow;
  index: number;
  key: string;
  sourceIndex?: number;
  treeEntry?: TreeEntry<TRow>;
}[] {
  if (tree) {
    return tree.entries.map((entry, position) => ({
      row: entry.row,
      index: position,
      key: entry.key,
      treeEntry: entry,
    }));
  }
  return rows.map((entry) => ({
    row: entry.row,
    index: entry.index,
    sourceIndex: entry.sourceIndex,
    key: entry.key,
  }));
}
