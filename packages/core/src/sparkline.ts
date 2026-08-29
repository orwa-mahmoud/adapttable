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

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CellEditor } from "./editing/cellEditing";
export type { ColumnFilter } from "./filters/filterDefs";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "./types";

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
} from "./editing/cellEditing";
export type { FilterDef, FilterType } from "./filters/filterDefs";
export type { ColumnHeaderController } from "./types";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { CustomCellEditorCtrl } from "./editing/cellEditing";
export type { FilterOptionsSource } from "./filters/filterDefs";

/**
 * The member types the signatures above hand back.
 *
 * A subpath that exports `ColumnDef` but not `ColumnHeaderContext` hands
 * a consumer a type whose parts they cannot name. These are already
 * public on `@adapttable/core`; this is the same declaration, reachable
 * from the entry that returns it.
 */
export type { FilterOption } from "./filters/filterDefs";
