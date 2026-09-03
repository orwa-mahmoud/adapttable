/**
 * Lean desktop-assembly helpers — no optional feature modules.
 *
 * Small functions live here in full. Heavy implementations (cell-span math,
 * extra-row splicing, column-resize drag) are injected through
 * {@link resolveAssembly} when the owning feature is composed.
 */
import type { CSSProperties, ReactNode } from "react";

import type { PinOffset } from "../columns/columnLayoutModel";
import type { ColumnResizeHandleProps } from "../columns/columnResize";
import type { FilterDef } from "../filters/filterDefs";
import type { BodyCell, GetCellSpan } from "../rows/cellSpan";
import type { ExtraEntry, ExtraRow } from "../rows/extraRows";
import type { RowPinSide } from "../rows/rowPinning";
import { extraHostFillStyle } from "../rows/rowPresentation";
import type { RowStyle } from "../rows/rowStyle";
import type { TreeEntry } from "../tree/treeRows";
import type { ColumnDef } from "../types";

export {
  bodyCellsHaveRowSpan,
  cellsForRow,
  extraHostFillStyle,
  pinnedRowCellStyle,
  pinnedRowSticky,
  resolveRowStyle,
  rowEditingSignature,
  rowIsDirty,
  rowPinSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "../rows/rowPresentation";

/** Width (px) reserved for the leading reorder column. */
export const REORDER_COLUMN_WIDTH = 64;

const LIFTED_OPACITY = 0.45;

/**
 * Overridable heavies. Lean defaults keep optional modules out of the graph.
 *
 * @public
 */
export interface AssemblyFns<TRow = unknown> {
  /** Build per-row body cells, optionally merging spans. */
  buildBodyCells: (options: {
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    getCellSpan?: GetCellSpan<TRow>;
    firstRowIndex?: number;
    pinOffset?: (key: string) => PinOffset | undefined;
    windowKeys?: ReadonlySet<string>;
  }) => ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /** Insert full-width extra rows into a flat entry list. */
  insertExtraRows: <T extends { key: string }>(
    entries: readonly T[],
    extraRows: readonly ExtraRow[] | undefined,
    dataKey: (entry: T) => string | undefined
  ) => readonly (T | ExtraEntry)[];
  /** Insert extra rows immediately before matching data rows. */
  insertExtrasBeforeRows: (
    rows: readonly TRow[],
    extraRows: readonly ExtraRow[] | undefined,
    getRowId: (row: TRow) => string
  ) => readonly ({ key: string; row: TRow } | ExtraEntry)[];
  /** Background fill for a host row hosting an extra separator. */
  extraHostFillStyle: (
    extraKey: string,
    extraRows: readonly ExtraRow[] | undefined,
    rows: readonly TRow[],
    getRowId: (row: TRow) => string,
    rowStyle: RowStyle<TRow> | undefined
  ) => CSSProperties | undefined;
  /** Inflate row spans where extra rows cover body cells. */
  inflateBodyCellRowSpans: (
    cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>,
    visualIds: readonly string[],
    extraRows: readonly ExtraRow[] | undefined
  ) => ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /** Table slots an extra row covers in a grouped layout. */
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
  /** Props for a column resize handle, when resizing is enabled. */
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
  extraHostFillStyle,
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

/** Narrow a body slot to a host-injected extra. */
export function isExtraEntry(entry: object): entry is ExtraEntry {
  if (!("kind" in entry)) return false;
  const kind = (entry as { kind?: unknown }).kind;
  return kind === "separator" || kind === "fullWidth";
}

/** Part name for a pinned row, or `undefined` when the row is not pinned. */
export function pinnedRowPart(
  side: RowPinSide | undefined
): "pinned-top" | "pinned-bottom" | undefined {
  if (side === "top") return "pinned-top";
  if (side === "bottom") return "pinned-bottom";
  return undefined;
}

/** Drop-edge paint for a row being reordered. */
export function rowReorderDropStyle(
  attrs:
    | {
        "data-dragging"?: "";
        "data-drop"?: "before" | "inside" | "after";
      }
    | undefined
): CSSProperties {
  if (attrs === undefined) return {};
  const edge = attrs["data-drop"];
  const offset = edge === "before" ? "2px" : "-2px";
  let boxShadow: string | undefined;
  if (edge === "inside") boxShadow = "inset 0 0 0 2px currentColor";
  else if (edge) boxShadow = `inset 0 ${offset} 0 0 currentColor`;
  return {
    opacity: attrs["data-dragging"] === "" ? LIFTED_OPACITY : undefined,
    boxShadow,
  };
}

export { rowReorderSignature } from "../rows/rowReorder";

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
