/**
 * Sparkline chart columns — `@adapttable/angular/sparkline`.
 *
 * A separate entry point, so a table that never draws a chart never
 * downloads one. Import it onto a column; do not, and none of this
 * code reaches the bundle.
 *
 * ```ts
 * import { sparklineColumn } from "@adapttable/angular/sparkline";
 *
 * sparklineColumn({
 *   key: "load",
 *   header: "Load",
 *   values: (row) => row.history,
 *   kind: "area",
 * })
 * ```
 *
 * @packageDocumentation
 */
export {
  AdaptSparkline,
  finiteSparklineValues,
  sparklineColumn,
  type SparklineColumnSpec,
  sparklineExportValue,
  type SparklineKind,
  type SparklineProps,
  sparklineSummary,
} from "./sparkline";
export type {
  CellContext,
  ColumnDef,
  FooterContext,
  HeaderContext,
  Renderer,
} from "@adapttable/angular";
