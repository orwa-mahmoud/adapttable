/**
 * Pivot tables — `@adapttable/ngx-bootstrap/pivot`.
 *
 * The panel is native HTML. `pivotTableModel` is the binding's model with
 * this kit's row-header cell. The calculation is `@adapttable/angular/pivot`,
 * re-exported here so a host never imports core for a pivot.
 *
 * @packageDocumentation
 */
export { pivotTableModel } from "./pivotTableModel";
export {
  AdaptPivotPanelChrome,
  EMPTY_PIVOT_CONFIG,
  injectPivotUrlState,
  pivot,
  PIVOT_ROW_COLUMN_KEY,
  PIVOT_URL_WRITE_DEBOUNCE_MS,
  type PivotConfig,
  type PivotField,
  type PivotPanelSlots,
  type PivotResult,
  type PivotRow,
  type PivotTableModel,
  type PivotTableModelOptions,
  type PivotUrlBinding,
  type PivotUrlStateOptions,
} from "@adapttable/angular/pivot";
export {
  AdaptPivotPanel,
  AdaptPivotRowHeader,
} from "@adapttable/ngx-bootstrap";
