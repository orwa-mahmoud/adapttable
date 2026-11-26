/**
 * The workbook for rows and columns, built in one call.
 */
import type { ColumnMetadata } from "../contracts/columns";
import { buildExportTable, type ExportViewEntry } from "./exportWriter";
import { xlsxBytes } from "./xlsx";

/**
 * Build an `.xlsx` for the given rows and columns.
 *
 * Cell values resolve exactly as they do for CSV — a column's `exportValue`
 * first, then its accessor or `sortValue` — so the same table produces the same
 * data in either format. What differs is that numbers, booleans and dates stay
 * typed, because a spreadsheet that cannot sum a column is a screenshot.
 *
 * @typeParam TRow - The row type.
 * @param options - Rows, columns, and the sheet's name.
 * @returns The workbook bytes, ready to download.
 *
 * @public
 */
export function buildTableXlsx<TRow>(options: {
  rows: readonly TRow[];
  columns: readonly ColumnMetadata<TRow>[];
  sheetName?: string;
  view?: readonly ExportViewEntry<TRow>[];
  summary?: Readonly<Partial<Record<string, unknown>>>;
}): Uint8Array<ArrayBuffer> {
  return xlsxBytes(
    buildExportTable(options.rows, options.columns, {
      view: options.view,
      summary: options.summary,
    }),
    options.sheetName
  );
}
