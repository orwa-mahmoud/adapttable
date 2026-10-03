import {
  type AdaptTableFeature,
  coreExportCsv,
  type ExportCsvOptions,
  exportPdf as bindingExportPdf,
  exportXlsx as bindingExportXlsx,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular";
import { AdaptExportButton } from "@adapttable/taiga-ui";

/**
 * CSV export — `@adapttable/taiga-ui/export`.
 *
 * @packageDocumentation
 */

/**
 * CSV export of the current view, from a toolbar button.
 *
 * @param options - `true`, or the export's scope, columns, filename,
 *   writer and hooks.
 *
 * @public
 */
export function exportCsv<TRow>(
  options: boolean | ExportCsvOptions<TRow> = true
): AdaptTableFeature {
  return extendFeature(
    coreExportCsv(options as Parameters<typeof coreExportCsv>[0]),
    [
      slotRender(TOOLBAR_EXTRAS, () => AdaptExportButton, {
        orderAs: "export-csv",
      }),
    ]
  );
}

/**
 * XLSX export of the current view, from a toolbar button.
 *
 * @param options - `true`, `false`, or the export's scope, columns, filename
 *   and hooks. The writer is the XLSX workbook.
 *
 * @public
 */
export function exportXlsx<TRow>(
  options: boolean | Omit<ExportCsvOptions<TRow>, "writer"> = true
): AdaptTableFeature {
  return extendFeature(bindingExportXlsx(options), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptExportButton, {
      orderAs: "export-xlsx",
    }),
  ]);
}

/**
 * PDF export of the current view, from a toolbar button.
 *
 * @param options - `true`, `false`, or the export's scope, columns, filename
 *   and hooks. The writer is the PDF document.
 *
 * @public
 */
export function exportPdf<TRow>(
  options: boolean | Omit<ExportCsvOptions<TRow>, "writer"> = true
): AdaptTableFeature {
  return extendFeature(bindingExportPdf(options), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptExportButton, {
      orderAs: "export-pdf",
    }),
  ]);
}
