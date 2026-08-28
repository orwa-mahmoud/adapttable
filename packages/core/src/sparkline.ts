/**
 * Sparkline chart columns — `@adapttable/core/sparkline`.
 *
 * A separate entry point, so a table that never draws a chart never
 * downloads one. Import it onto a column; do not, and none of this
 * code reaches the bundle.
 *
 * ```tsx
 * import { sparklineColumn } from "@adapttable/core/sparkline";
 *
 * sparklineColumn({
 *   key: "load",
 *   header: "Load",
 *   values: (row) => row.history,
 *   kind: "area",
 * })
 * ```
 */
export {
  finiteSparklineValues,
  Sparkline,
  sparklineColumn,
  type SparklineColumnSpec,
  sparklineExportValue,
  type SparklineKind,
  type SparklineProps,
  sparklineSummary,
} from "./columns/sparkline";
export type { ColumnDef } from "./types";
