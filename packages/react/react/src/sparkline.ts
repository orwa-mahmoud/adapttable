/**
 * Sparkline chart columns — `@adapttable/react/sparkline`.
 *
 * A separate entry point, so a table that never draws a chart never
 * downloads one. Import it onto a column; do not, and none of this
 * code reaches the bundle.
 *
 * ```tsx
 * import { sparklineColumn } from "@adapttable/react/sparkline";
 *
 * sparklineColumn({
 *   key: "load",
 *   header: "Load",
 *   values: (row) => row.history,
 *   kind: "area",
 * })
 * ```
 */
export type { ColumnDef } from "./columnDef";
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

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "@adapttable/core";
export type { ColumnFilter } from "@adapttable/core";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type {
  CellEditorOption,
  CustomCellEditorRender,
} from "@adapttable/core";
export type { FilterDef, FilterType } from "@adapttable/core";
export type { ColumnHeaderController } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CustomCellEditorCtrl } from "@adapttable/core";
export type { FilterOptionsSource } from "@adapttable/core";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FilterOption } from "@adapttable/core";
