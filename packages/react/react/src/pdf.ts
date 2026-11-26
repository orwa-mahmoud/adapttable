/**
 * Opt-in PDF export and print layout: the export feature with core's PDF
 * writer, and core's print and PDF helpers.
 */
export { exportPdf, type ExportPdfOptions } from "./features/export-pdf";
export type {
  PdfWriterOptions,
  PrintLayoutOptions,
  PrintPageBreak,
  PrintPageSize,
} from "@adapttable/core/pdf";
export {
  buildPrintDocument,
  buildPrintTableHtml,
  buildTablePdf,
  openPrintLayout,
  pdfWriter,
  printStyles,
  printTable,
} from "@adapttable/core/pdf";

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
