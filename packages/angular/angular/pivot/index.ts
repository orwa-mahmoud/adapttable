/**
 * Pivot tables — `@adapttable/angular/pivot`.
 *
 * A separate entry point, so a table that never pivots never downloads the
 * engine. Import it and you get the calculation; the rendering stays with
 * whichever kit you are using.
 *
 * ```ts
 * import { pivot, pivotTableModel } from "@adapttable/angular/pivot";
 *
 * const result = pivot(rows, {
 *   rows: ["region", "team"],
 *   columns: ["quarter"],
 *   measures: [{ key: "amount", agg: "sum" }],
 * });
 * ```
 *
 * `pivotTableModel` turns that result into the props a table takes, so the
 * rendering is your kit's rather than your own markup.
 *
 * @packageDocumentation
 */
export {
  AdaptPivotPanelChrome,
  type PivotPanelSlots,
} from "./pivotPanelChrome";
export {
  PIVOT_ROW_COLUMN_KEY,
  type PivotTableModel,
  pivotTableModel,
  type PivotTableModelOptions,
} from "./pivotTableModel";
export {
  injectPivotUrlState,
  PIVOT_URL_WRITE_DEBOUNCE_MS,
  type PivotUrlBinding,
  type PivotUrlStateOptions,
} from "./pivotUrlState";
export { AdaptPivotRowHeader } from "./rowHeader";
export type {
  CellContext,
  ColumnDef,
  FooterContext,
  HeaderContext,
  MaybeSignalOptional,
  Renderer,
  TableUrlStateOptions,
  UrlSliceOptions,
} from "@adapttable/angular";
// Everything `@adapttable/core/pivot` exports, so a kit's pivot entry passes
// this binding on and never imports core itself.
export * from "@adapttable/core/pivot";
