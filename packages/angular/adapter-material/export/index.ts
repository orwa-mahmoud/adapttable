/**
 * CSV export — `@adapttable/angular-material/export`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  type ExportCsvOptions,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { coreExportCsv, TOOLBAR_EXTRAS } from "@adapttable/angular/adapter";
import {
  exportPdf as bindingExportPdf,
  exportXlsx as bindingExportXlsx,
} from "@adapttable/angular/features";
import { AdaptExportButton } from "@adapttable/angular-material";

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
