/**
 * Pivoting on the server.
 *
 * A pivot over ten million rows is not a browser's job. When the server can
 * do it, the table's part is to ask in a shape a server can answer and to
 * render the reply — and the reply has to become the *same* `PivotResult` the
 * local engine produces, or every adapter would need a second rendering path
 * and the two would drift.
 *
 * So this module is a translator, not a second engine. The server sends the
 * numbers it computed; the column tree, the spans and the leaf ordering are
 * rebuilt here from the paths it named, exactly as the local engine builds
 * them. What the server decides is the arithmetic and the ordering. What core
 * decides is the shape.
 *
 * Keys come from {@link ./pivotKeys}, which both engines share: a leaf key that
 * disagreed with the local one by a byte would break column-level state on the
 * way from a local pivot to a server-backed one, and nothing would say why.
 *
 * The wire format is deliberately small. A server that can pivot but cannot
 * count rows, or that has no subtotals, should not have to send empty fields
 * to say so — so `count`, `subtotal` and `totals` are optional, and a missing
 * cell is an empty cell rather than a zero.
 */
import type { ReactNode } from "react";

import {
  PIVOT_GRAND_TOTAL_KEY,
  pivotLeafKey,
  pivotPathKey,
  pivotTotalLeafKey,
} from "./pivotKeys";
import type {
  PivotColumnLeaf,
  PivotConfig,
  PivotResult,
  PivotRow,
} from "./pivotModel";

/**
 * One line of a server-computed pivot.
 *
 * @internal
 */
export interface QueryPivotRow {
  /**
   * The row-dimension values, outermost first, as the server labelled them.
   * An empty path is the grand total.
   */
  path: readonly string[];
  /**
   * The computed values, in column-path order and within that in measure
   * order — the same order the table renders its columns. A missing entry is
   * an empty cell.
   */
  cells: readonly unknown[];
  /**
   * This line's values for the grand-total **column**, one per measure in
   * measure order.
   *
   * That column exists whenever the configuration asks for grand totals and
   * something splits the columns — the local engine's rule, so a table moving
   * from one engine to the other keeps the same columns. What core cannot do is
   * compute it: summing sums is not how an average or a minimum totals. So a
   * server that does not send this leaves the column empty, exactly as an
   * omitted cell is empty, and a configuration with `grandTotals: false` does
   * not ask for it at all.
   */
  totals?: readonly unknown[];
  /** How many source rows this line covers, when the server counts. */
  count?: number;
  /** Whether this line totals the lines beneath it rather than being one. */
  subtotal?: boolean;
}

/**
 * A page of server-computed pivot results.
 *
 * @internal
 */
export interface QueryPivotPage {
  /**
   * The column-dimension paths, outermost value first, in the order the
   * server wants them shown. One entry per path, NOT per rendered column —
   * the measures multiply them here, the way they do locally.
   */
  columns: readonly (readonly string[])[];
  /** The body lines, in display order. */
  rows: readonly QueryPivotRow[];
  /** The grand-total line, when the server computed one. */
  total?: QueryPivotRow;
}

/**
 * What {@link serverPivotResult} needs.
 *
 * @internal
 */
export interface ServerPivotOptions {
  /** The configuration that was sent, for the measures and their order. */
  config: PivotConfig;
  /** Format a computed cell, as the local engine's `format` does. */
  format?: (
    value: ReactNode,
    measure: PivotConfig["measures"][number]
  ) => ReactNode;
}

/** Rebuild the column header tree from the paths the server named. */
function treeOf(
  paths: readonly (readonly string[])[],
  measures: number,
  depth: number
): PivotResult["columnTree"] {
  if (depth === 0) return [];
  const build = (
    prefix: readonly string[],
    level: number
  ): PivotResult["columnTree"] => {
    const seen: string[] = [];
    for (const path of paths) {
      if (path.length <= level) continue;
      if (!prefix.every((value, i) => path[i] === value)) continue;
      const label = path[level];
      if (label !== undefined && !seen.includes(label)) seen.push(label);
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

/**
 * Turn a server's answer into the result the adapters already render.
 *
 * @param page - What the server sent.
 * @param options - The configuration that was asked for, and formatting.
 * @returns The same `PivotResult` shape the local engine returns.
 *
 * @internal
 */
export function serverPivotResult(
  page: QueryPivotPage,
  { config, format }: ServerPivotOptions
): PivotResult {
  const leaves: PivotColumnLeaf[] = [];
  for (const path of page.columns) {
    for (const measure of config.measures) {
      leaves.push({
        key: pivotLeafKey(path, measure.key),
        path,
        measure,
        total: false,
      });
    }
  }
  // Where `cells` stops and `totals` starts. The grand-total column follows
  // every path column, in measure order, so a total leaf's position past this
  // point IS its measure index.
  const columnCells = leaves.length;
  // The local engine's rule, followed here so that moving a table from local to
  // server keeps the columns it had: a grand-total column means something only
  // when the columns are split by something, and it is what `grandTotals` asks
  // for, which defaults to on.
  if ((config.grandTotals ?? true) && config.columns.length > 0) {
    for (const measure of config.measures) {
      leaves.push({
        key: pivotTotalLeafKey(measure.key),
        path: [],
        measure,
        total: true,
      });
    }
  }

  const cellsOf = (row: QueryPivotRow): ReactNode[] =>
    leaves.map((leaf, index) => {
      const value = leaf.total
        ? row.totals?.[index - columnCells]
        : row.cells[index];
      // A cell the server did not send is empty, not zero — the same rule the
      // local engine follows for a value that will not add up.
      const node = (value ?? undefined) as ReactNode;
      return format ? format(node, leaf.measure) : node;
    });

  const body: PivotRow[] = page.rows.map((row) => ({
    key: pivotPathKey(row.path),
    path: row.path,
    depth: Math.max(row.path.length - 1, 0),
    kind: row.subtotal === true ? "subtotal" : "leaf",
    label: row.path.at(-1) ?? "",
    cells: cellsOf(row),
    count: row.count ?? 0,
  }));

  if (page.total) {
    body.push({
      key: PIVOT_GRAND_TOTAL_KEY,
      path: [],
      depth: 0,
      kind: "grandTotal",
      label: "",
      cells: cellsOf(page.total),
      count: page.total.count ?? 0,
    });
  }

  return {
    columnTree: treeOf(
      page.columns,
      config.measures.length,
      config.columns.length
    ),
    columnLeaves: leaves,
    rows: body,
    rowDepth: config.rows.length,
  };
}
