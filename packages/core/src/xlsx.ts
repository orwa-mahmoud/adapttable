/**
 * Spreadsheet export — `@adapttable/core/xlsx`.
 *
 * A separate entry point, so a table that exports CSV never downloads a ZIP
 * encoder. Import it and the export button writes `.xlsx` instead; do not, and
 * none of this code reaches the bundle.
 *
 * ```tsx
 * import { xlsxWriter } from "@adapttable/core/xlsx";
 *
 * <DataTable exportCsv={{ writer: xlsxWriter() }} … />
 * ```
 */
export type { ExportViewEntry, ExportWriter } from "./export/exportWriter";
export { buildTableXlsx, xlsxWriter } from "./export/xlsx";
export type { ColumnDef } from "./types";
