/**
 * Pivot tables — `@adapttable/core/pivot`.
 *
 * A separate entry point, so a table that never pivots never downloads the
 * engine. Import it and you get the calculation; the rendering stays with
 * whichever adapter you are using.
 *
 * ```tsx
 * import { pivot } from "@adapttable/core/pivot";
 *
 * const result = pivot(rows, {
 *   rows: ["region", "team"],
 *   columns: ["quarter"],
 *   measures: [{ key: "amount", agg: "sum" }],
 * });
 * ```
 *
 * `pivotTableModel` turns that result into the props a `DataTable` takes, so
 * the rendering is your kit's rather than your own markup:
 *
 * ```tsx
 * <DataTable {...pivotTableModel(result)} />;
 * ```
 */
export type { AggregateName, Aggregator } from "./aggregate/aggregate";
export {
  assignField,
  availableFields,
  EMPTY_PIVOT_CONFIG,
  isPivotReady,
  measureLabel,
  moveField,
  PIVOT_ZONES,
  type PivotField,
  type PivotZone,
  removeField,
  setMeasureAgg,
} from "./pivot/pivotConfigModel";
export {
  pivot,
  PIVOT_BLANK,
  PIVOT_GRAND_TOTAL_KEY,
  type PivotColumnLeaf,
  type PivotColumnNode,
  type PivotConfig,
  type PivotMeasure,
  type PivotOptions,
  type PivotResult,
  type PivotRow,
  type PivotRowKind,
} from "./pivot/pivotModel";
export {
  PIVOT_ROW_COLUMN_KEY,
  type PivotTableModel,
  pivotTableModel,
  type PivotTableModelOptions,
} from "./pivot/pivotTableModel";
export {
  deserializePivot,
  deserializePivotState,
  type PivotUrlState,
  serializePivot,
  serializePivotState,
} from "./pivot/pivotUrlCodec";
export {
  usePivotUrlState,
  type UsePivotUrlStateOptions,
  type UsePivotUrlStateResult,
} from "./pivot/pivotUrlState";
export {
  type QueryPivotPage,
  type QueryPivotRow,
  type ServerPivotOptions,
  serverPivotResult,
} from "./pivot/serverPivot";
export type { ColumnDef, TableLabels } from "./types";
export type { UrlStateAdapter } from "./url/adapter";

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
