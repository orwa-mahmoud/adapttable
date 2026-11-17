/**
 * `@adapttable/angular/pdf` — PDF export and print layout: the export feature
 * with core's PDF writer, and core's print and PDF helpers.
 *
 * @packageDocumentation
 */
export { exportPdf } from "./features/export";
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
  AdaptTableFeature,
  FeatureMountContext,
  FeatureState,
  SlotComponent,
} from "@adapttable/angular";
