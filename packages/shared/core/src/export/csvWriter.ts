/**
 * CSV encoding.
 *
 * Comma-separated text with a UTF-8 BOM so Excel reads the file as Unicode.
 * PDF and XLSX are separate entries and are not imported here.
 */

import { matrixToCsv } from "./csv";
import type { ExportWriter } from "./exportWriter";

/** The UTF-8 byte-order mark, which is what makes Excel read the file as UTF-8. */
const BOM = "\uFEFF";

/**
 * The built-in writer: comma-separated text, UTF-8 with a BOM so Excel opens
 * unicode correctly. This is what the export button uses when no writer is
 * given.
 *
 * @public
 */
export const csvWriter: ExportWriter = {
  extension: "csv",
  build: ({ table, escapeFormulas }) => {
    const text = matrixToCsv(table, { escapeFormulas });
    return { parts: [BOM, text], mimeType: "text/csv;charset=utf-8", text };
  },
};
