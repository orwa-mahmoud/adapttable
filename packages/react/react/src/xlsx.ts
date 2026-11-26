/**
 * Opt-in XLSX export: the export feature with core's XLSX writer, and core's
 * XLSX helpers.
 */
export { exportXlsx, type ExportXlsxOptions } from "./features/export-xlsx";
export { buildTableXlsx, xlsxWriter } from "@adapttable/core/xlsx";

// Types this entry's own signatures hand back, named from their owning entry.
export type {
  FeatureProviderContribution,
  FeatureProviderProps,
  FeatureRender,
} from "./features/providers";
export type {
  TableFeature,
  TableFeatureHost,
  TableFeatureMountContext,
} from "./features/tableFeature";
export type { SidePanelEntry } from "./layout/SidePanelChrome";
