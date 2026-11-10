/**
 * `@adapttable/angular/xlsx` — XLSX export: the export feature with core's
 * XLSX writer, and core's XLSX helpers.
 *
 * @packageDocumentation
 */
export { exportXlsx } from "./features/export";
export { buildTableXlsx, xlsxWriter } from "@adapttable/core/xlsx";

// Types this entry's own signatures hand back, named from their owning entry.
export type {
  AdaptTableFeature,
  FeatureMountContext,
  FeatureState,
  SlotComponent,
} from "@adapttable/angular";
