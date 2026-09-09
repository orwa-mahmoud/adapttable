/**
 * Pivot tables — `@adapttable/core/pivot`.
 *
 * A separate entry point, so a table that never pivots never downloads the
 * engine. React URL-state hooks and `pivotTableModel` live on
 * `@adapttable/react/pivot`.
 *
 * @packageDocumentation
 */
export type {
  AggregateFormatContext,
  AggregateName,
  Aggregator,
} from "./aggregate/aggregate";
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
  deserializePivot,
  deserializePivotState,
  type PivotUrlState,
  serializePivot,
  serializePivotState,
} from "./pivot/pivotUrlCodec";
export {
  type QueryPivotPage,
  type QueryPivotRow,
  type ServerPivotOptions,
  serverPivotResult,
} from "./pivot/serverPivot";

/**
 * Member types the signatures above hand back, reachable from the entry that
 * returns them.
 */
export type {
  Aggregatable,
  AggregatableConfig,
  AggregateOperation,
  CustomAggregateOperation,
} from "./aggregate/aggregatable";
export type {
  AggregateOperationId,
  AggregateOrderedValue,
} from "./aggregate/aggregate";
export type { ColumnModel, SortableValue } from "./columnModel";
export type {
  ColumnGroupShow,
  ColumnModelEditor,
  ColumnModelFilter,
} from "./columnModel";
export type { DisplayValue } from "./display";
