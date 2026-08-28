/**
 * The pivot engine: rows down the side, dimensions across the top, a measure
 * in every cell.
 *
 * A pivot is the one table shape a data grid cannot fake. Grouping answers
 * "what are the totals per team"; a pivot answers "what are the totals per
 * team **per quarter**", and the second dimension has to become columns that
 * did not exist in the data. Everything downstream — the header tree, the
 * subtotals, the collapse state — follows from that one move.
 *
 * This module is the whole calculation and none of the rendering. It takes
 * rows and a configuration and returns a flat list of lines with a depth and
 * a kind, plus the column tree they line up against. An adapter renders that
 * with its own table markup; nothing here knows what a `<td>` is.
 *
 * Three decisions worth stating, because they are the ones a reader will
 * check:
 *
 * Subtotals are **header** rows, not footers. That is what makes collapsing
 * work: a collapsed group still shows its own line with its own totals,
 * rather than vanishing or leaving a footer with nothing above it. It also
 * matches how grouping already reads in this table, where the aggregates sit
 * in the group header.
 *
 * Values resolve through `resolveAggregateValue`, so a column's `sortValue`
 * decides what gets aggregated — exactly as it does for sorting, grouping and
 * the summary row. A pivot that read raw fields would disagree with the
 * footer of the same table.
 *
 * A missing dimension value is its own bucket, labelled by
 * {@link PIVOT_BLANK}, rather than being dropped. Rows that fall in no column
 * silently disappearing is how a pivot table lies about a total.
 */
import type { ReactNode } from "react";

import {
  type AggregateName,
  type Aggregator,
  resolveAggregateValue,
} from "../aggregate/aggregate";
import type { CellEditor } from "../editing/cellEditing";
import type { ColumnFilter } from "../filters/filterDefs";
import { compareValues } from "../sort/compare";
import type {
  CellProps,
  ColumnDef,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "../types";

export type {
  AggregateName,
  Aggregator,
  CellEditor,
  CellProps,
  ColumnDef,
  ColumnFilter,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
};
import {
  PIVOT_GRAND_TOTAL_KEY,
  pivotLeafKey,
  pivotPathKey,
  pivotTotalLeafKey,
} from "./pivotKeys";

// Keys are built in `./pivotKeys`, which the server translator and the URL
// codec share, so the three agree by construction rather than by copying. The
// grand-total key is the one of them a host compares against, so the engine is
// still where it is exported from.
export { PIVOT_GRAND_TOTAL_KEY };

/**
 * The label a dimension value gets when the row has none.
 *
 * @public
 */
export const PIVOT_BLANK = "—";

/**
 * One computed value per cell.
 *
 * @public
 */
export interface PivotMeasure {
  /** The column key whose values are aggregated. */
  key: string;
  /**
   * A built-in name, a name registered on the table that called
   * `pivot`, or your own function.
   */
  agg: AggregateName | (string & {}) | Aggregator;
  /** Header caption. Defaults to the column key. */
  label?: string;
}

/**
 * What to pivot, and how.
 *
 * @public
 */
export interface PivotConfig {
  /** Dimensions down the side, outermost first. Empty pivots to one line. */
  rows: readonly string[];
  /** Dimensions across the top, outermost first. Empty gives measure columns. */
  columns: readonly string[];
  /** What every cell computes. At least one, or there is nothing to show. */
  measures: readonly PivotMeasure[];
  /** A totals line for every level above the innermost. Defaults to `true`. */
  subtotals?: boolean;
  /** A grand-total line across everything. Defaults to `true`. */
  grandTotals?: boolean;
}

/**
 * A node in the column header tree.
 *
 * @public
 */
export interface PivotColumnNode {
  /** The dimension value this node stands for. */
  label: string;
  /** Its full path from the outermost dimension. */
  path: readonly string[];
  /** How many leaf columns sit under it — the header cell's `colSpan`. */
  span: number;
  /** Nested dimension values, or empty at the innermost level. */
  children: readonly PivotColumnNode[];
}

/**
 * One rendered column: a column path plus the measure shown in it.
 *
 * @public
 */
export interface PivotColumnLeaf {
  /** Stable key for React and for column-level state. */
  key: string;
  /** The column-dimension values, outermost first. Empty without any. */
  path: readonly string[];
  /** The measure this column shows. */
  measure: PivotMeasure;
  /** Whether this is the grand-total column rather than a real path. */
  total: boolean;
}

/**
 * What a line in the body is.
 *
 * @public
 */
export type PivotRowKind = "leaf" | "subtotal" | "grandTotal";

/**
 * One rendered line.
 *
 * @public
 */
export interface PivotRow {
  /** Stable id — also the collapse key for a `subtotal` line. */
  key: string;
  /** The row-dimension values, outermost first. */
  path: readonly string[];
  /** Nesting level, 0 for the outermost. */
  depth: number;
  /** Whether this line is a data line, a subtotal, or the grand total. */
  kind: PivotRowKind;
  /** The dimension value this line is labelled with. */
  label: string;
  /** One value per entry of {@link PivotResult.columnLeaves}, in order. */
  cells: readonly ReactNode[];
  /** How many source rows it covers — for "12 rows" affordances. */
  count: number;
}

/**
 * The whole pivot, ready to render.
 *
 * @public
 */
export interface PivotResult {
  /** The column header tree; empty when there are no column dimensions. */
  columnTree: readonly PivotColumnNode[];
  /** The rendered columns, left to right — the order every row's cells use. */
  columnLeaves: readonly PivotColumnLeaf[];
  /** Every line of the body, in render order. */
  rows: readonly PivotRow[];
  /** Depth of the row-header area — how many dimensions are down the side. */
  rowDepth: number;
}

/**
 * Options for `pivot`.
 *
 * @public
 */
export interface PivotOptions<TRow> {
  /**
   * Columns, so dimension and measure values resolve through `sortValue`
   * exactly as sorting and grouping do.
   */
  columns?: readonly ColumnDef<TRow>[];
  /** Format a computed cell. Receives the raw result and the measure. */
  format?: (value: ReactNode, measure: PivotMeasure) => ReactNode;
  /**
   * Subtotal keys the user has collapsed. A collapsed line keeps its own
   * totals and drops everything beneath it.
   */
  collapsed?: ReadonlySet<string>;
  /**
   * Aggregators the calling table has registered by name. Built-in names
   * resolve without this; a standalone `pivot()` that never passes a map
   * keeps today's behaviour. The pivot entry must not look the host up
   * itself — that would drag the feature host into every pivot import.
   */
  aggregators?: ReadonlyMap<string, Aggregator>;
}

/** The label for a dimension value, with a bucket for "no value". */
function dimensionLabel(value: SortableValue): string {
  if (value === undefined || value === null || value === "") return PIVOT_BLANK;
  return String(value);
}

/** Resolve a row's value for one dimension, as a display label. */
function dimensionOf<TRow>(
  row: TRow,
  key: string,
  byKey: ReadonlyMap<string, ColumnDef<TRow>>
): string {
  return dimensionLabel(resolveAggregateValue(row, key, byKey.get(key)));
}

/**
 * Distinct paths for a set of dimensions, in sorted order, with each level
 * sorted within its parent.
 */
function distinctPaths<TRow>(
  rows: readonly TRow[],
  dimensions: readonly string[],
  byKey: ReadonlyMap<string, ColumnDef<TRow>>
): string[][] {
  if (dimensions.length === 0) return [[]];
  let paths: string[][] = [[]];
  for (const [level, dimension] of dimensions.entries()) {
    const next: string[][] = [];
    const seen = new Map<string, Set<string>>();
    for (const row of rows) {
      const prefix = pivotPathKey(
        dimensions.slice(0, level).map((d) => dimensionOf(row, d, byKey))
      );
      let bucket = seen.get(prefix);
      if (!bucket) {
        bucket = new Set();
        seen.set(prefix, bucket);
      }
      bucket.add(dimensionOf(row, dimension, byKey));
    }
    for (const path of paths) {
      const values = [...(seen.get(pivotPathKey(path)) ?? [])].sort(
        compareValues
      );
      for (const value of values) next.push([...path, value]);
    }
    paths = next;
  }
  return paths;
}

/** Build the column header tree from the leaf paths. */
function columnTreeOf(
  paths: readonly (readonly string[])[],
  measures: number,
  depth: number
): PivotColumnNode[] {
  if (depth === 0) return [];
  const build = (
    prefix: readonly string[],
    level: number
  ): PivotColumnNode[] => {
    const seen: string[] = [];
    for (const path of paths) {
      if (path.length <= level) continue;
      const matches = prefix.every((value, i) => path[i] === value);
      const label = path[level];
      if (matches && label !== undefined && !seen.includes(label)) {
        seen.push(label);
      }
    }
    return seen.map((label) => {
      const path = [...prefix, label];
      const children = level + 1 < depth ? build(path, level + 1) : [];
      const span =
        children.length > 0
          ? children.reduce((sum, child) => sum + child.span, 0)
          : measures;
      return { label, path, span, children };
    });
  };
  return build([], 0);
}

/** Every rendered column, left to right. */
function columnLeavesOf(
  paths: readonly (readonly string[])[],
  measures: readonly PivotMeasure[],
  grandTotals: boolean,
  hasColumnDimensions: boolean
): PivotColumnLeaf[] {
  const leaves: PivotColumnLeaf[] = [];
  for (const path of paths) {
    for (const measure of measures) {
      leaves.push({
        key: pivotLeafKey(path, measure.key),
        path,
        measure,
        total: false,
      });
    }
  }
  // A grand-total column only means something when the columns are split by
  // something; without dimensions it would repeat the only column there is.
  if (grandTotals && hasColumnDimensions) {
    for (const measure of measures) {
      leaves.push({
        key: pivotTotalLeafKey(measure.key),
        path: [],
        measure,
        total: true,
      });
    }
  }
  return leaves;
}

/** Compute one line's cells from the rows it covers. */
function cellsOf<TRow>(
  covered: readonly TRow[],
  leaves: readonly PivotColumnLeaf[],
  columnDimensions: readonly string[],
  byKey: ReadonlyMap<string, ColumnDef<TRow>>,
  aggregate: (leaf: PivotColumnLeaf) => Aggregator,
  format: PivotOptions<TRow>["format"]
): ReactNode[] {
  return leaves.map((leaf) => {
    const matching = leaf.total
      ? covered
      : covered.filter((row) =>
          leaf.path.every(
            (value, i) =>
              dimensionOf(row, columnDimensions[i] ?? "", byKey) === value
          )
        );
    const values: SortableValue[] = [];
    for (const row of matching) {
      const value = resolveAggregateValue(
        row,
        leaf.measure.key,
        byKey.get(leaf.measure.key)
      );
      // A missing value is not a zero — the aggregator sees only what is
      // really there, the same rule the summary row follows.
      if (value !== undefined && value !== null) values.push(value);
    }
    const result = aggregate(leaf)(values);
    return format ? format(result, leaf.measure) : result;
  });
}

/** Whether a line sits under a collapsed ancestor. */
function hiddenByCollapse(
  path: readonly string[],
  collapsed: ReadonlySet<string>
): boolean {
  for (let depth = 1; depth < path.length; depth++) {
    if (collapsed.has(pivotPathKey(path.slice(0, depth)))) return true;
  }
  return false;
}

/**
 * Pivot rows into a table.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to pivot. Filtering and searching happen upstream.
 * @param config - Which dimensions go where, and what each cell computes.
 * @param options - Columns for value resolution, formatting, collapse state.
 * @returns The column tree, the rendered columns and every body line.
 *
 * @public
 */
export function pivot<TRow>(
  rows: readonly TRow[],
  config: PivotConfig,
  options: PivotOptions<TRow> = {}
): PivotResult {
  const {
    columns,
    format,
    collapsed = new Set<string>(),
    aggregators,
  } = options;
  const byKey = new Map(columns?.map((column) => [column.key, column]));
  const subtotals = config.subtotals ?? true;
  const grandTotals = config.grandTotals ?? true;

  const columnPaths = distinctPaths(rows, config.columns, byKey);
  const columnLeaves = columnLeavesOf(
    columnPaths,
    config.measures,
    grandTotals,
    config.columns.length > 0
  );
  const columnTree = columnTreeOf(
    columnPaths,
    config.measures.length,
    config.columns.length
  );

  const cells = (covered: readonly TRow[]) =>
    cellsOf(
      covered,
      columnLeaves,
      config.columns,
      byKey,
      (leaf) => aggregatorOf(leaf.measure, aggregators),
      format
    );

  const body = bodyRows({
    rows,
    dimensions: config.rows,
    paths: distinctPaths(rows, config.rows, byKey),
    byKey,
    subtotals,
    collapsed,
    cells,
  });

  if (grandTotals) {
    body.push({
      key: PIVOT_GRAND_TOTAL_KEY,
      path: [],
      depth: 0,
      kind: "grandTotal",
      label: "",
      cells: cells(rows),
      count: rows.length,
    });
  }

  return {
    columnTree,
    columnLeaves,
    rows: body,
    rowDepth: config.rows.length,
  };
}

/** What {@link bodyRows} needs. */
interface BodyInput<TRow> {
  rows: readonly TRow[];
  dimensions: readonly string[];
  paths: readonly (readonly string[])[];
  byKey: ReadonlyMap<string, ColumnDef<TRow>>;
  subtotals: boolean;
  collapsed: ReadonlySet<string>;
  cells: (covered: readonly TRow[]) => ReactNode[];
}

/**
 * Every body line in render order: each group's subtotal before the lines it
 * covers, and nothing at all beneath a collapsed one.
 *
 * Only subtotal lines carry a collapse key, so a key that names a leaf simply
 * has no effect — hiding a leaf would take its data out of view with no
 * subtotal standing in for it.
 */
function bodyRows<TRow>({
  rows,
  dimensions,
  paths,
  byKey,
  subtotals,
  collapsed,
  cells,
}: BodyInput<TRow>): PivotRow[] {
  const body: PivotRow[] = [];
  const emitted = new Set<string>();

  const push = (
    path: readonly string[],
    depth: number,
    kind: PivotRowKind,
    label: string
  ) => {
    const covered = rowsUnder(rows, path, dimensions, byKey);
    body.push({
      key: pivotPathKey(path),
      path,
      depth,
      kind,
      label,
      cells: cells(covered),
      count: covered.length,
    });
  };

  for (const path of paths) {
    if (subtotals) {
      for (let depth = 1; depth < path.length; depth++) {
        const prefix = path.slice(0, depth);
        const key = pivotPathKey(prefix);
        if (emitted.has(key) || hiddenByCollapse(prefix, collapsed)) continue;
        emitted.add(key);
        push(prefix, depth - 1, "subtotal", prefix[depth - 1] ?? "");
      }
    }
    if (hiddenByCollapse(path, collapsed)) continue;
    push(path, Math.max(path.length - 1, 0), "leaf", path.at(-1) ?? "");
  }
  return body;
}

/** The rows matching a row-dimension prefix. */
function rowsUnder<TRow>(
  rows: readonly TRow[],
  prefix: readonly string[],
  dimensions: readonly string[],
  byKey: ReadonlyMap<string, ColumnDef<TRow>>
): TRow[] {
  return rows.filter((row) =>
    prefix.every(
      (value, i) => dimensionOf(row, dimensions[i] ?? "", byKey) === value
    )
  );
}

const BUILT_IN_NAMES: readonly AggregateName[] = [
  "sum",
  "avg",
  "count",
  "min",
  "max",
];

function isBuiltInName(name: string): name is AggregateName {
  return (BUILT_IN_NAMES as readonly string[]).includes(name);
}

/** What an unknown name computes: nothing, the same as today. */
const unknownAggregator: Aggregator = () => undefined;

/**
 * The aggregator a measure names.
 *
 * A function is used as-is. A built-in name is re-derived here so this
 * entry never imports the aggregate module's table. Any other string is
 * a registration the caller passed in — or, if they did not, nothing.
 */
function aggregatorOf(
  measure: PivotMeasure,
  extras?: ReadonlyMap<string, Aggregator>
): Aggregator {
  if (typeof measure.agg !== "string") return measure.agg;
  if (isBuiltInName(measure.agg)) return builtInAggregator(measure.agg);
  return extras?.get(measure.agg) ?? unknownAggregator;
}

/**
 * The built-in aggregators, by name.
 *
 * Re-derived here rather than imported from the aggregate module's private
 * table: the pivot entry is optional and must not drag anything extra into
 * the base bundle for tables that never pivot.
 */
function builtInAggregator(name: AggregateName): Aggregator {
  return (values) => {
    if (name === "count") return values.length;
    const numbers = summableNumbers(values);
    // Nothing summable is no value, not a zero: a missing budget is not $0.
    if (numbers.length === 0) return undefined;
    switch (name) {
      case "sum":
        return sum(numbers);
      case "avg":
        return sum(numbers) / numbers.length;
      case "min":
        return Math.min(...numbers);
      case "max":
        return Math.max(...numbers);
    }
  };
}

/** The values that are actually numbers, in the aggregate module's sense. */
function summableNumbers(values: readonly SortableValue[]): number[] {
  const numbers: number[] = [];
  for (const value of values) {
    if (typeof value === "number") {
      if (Number.isFinite(value)) numbers.push(value);
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) numbers.push(parsed);
  }
  return numbers;
}

const sum = (numbers: readonly number[]): number =>
  numbers.reduce((total, n) => total + n, 0);
