/**
 * The PDF for rows and columns, built in one call.
 */
import type { ColumnMetadata } from "../contracts/columns";
import { buildExportTable, type ExportViewEntry } from "./exportWriter";
import { pdfBytes, type PdfWriterOptions } from "./pdf";

/**
 * Build a PDF for the given rows and columns.
 *
 * Cell values resolve exactly as they do for CSV and XLSX — a column's
 * `exportValue` first, then its accessor — so the same table produces the
 * same data in every format. Page breaks, column widths and group
 * structure are taken from the resolved view.
 *
 * @typeParam TRow - The row type.
 * @param options - Rows, columns, and how the pages should look.
 * @returns The PDF bytes, ready to download.
 *
 * @public
 */
export function buildTablePdf<TRow>(
  options: {
    rows: readonly TRow[];
    columns: readonly ColumnMetadata<TRow>[];
    view?: readonly ExportViewEntry<TRow>[];
    summary?: Readonly<Partial<Record<string, unknown>>>;
  } & PdfWriterOptions
): Uint8Array<ArrayBuffer> {
  return pdfBytes(
    buildExportTable(options.rows, options.columns, {
      view: options.view,
      summary: options.summary,
    }),
    options
  );
}
