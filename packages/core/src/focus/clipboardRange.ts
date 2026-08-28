/**
 * The selected rectangle, as a spreadsheet reads it.
 *
 * Excel, Google Sheets, Numbers and LibreOffice all put tab-separated text on
 * the clipboard and all parse it back, so TSV — not CSV, not JSON — is what
 * makes copy and paste work between a table and the thing people actually use.
 * A cell containing a tab or a newline is quoted the way those applications
 * quote it, which is RFC-4180's rule applied to a tab delimiter.
 *
 * Values come from the same resolution the exports use, so what lands in a
 * spreadsheet from a copy and from a downloaded file cannot disagree.
 */
import { buildExportTable } from "../export/exportWriter";
import type { ColumnDef } from "../types";
import { type CellRange, cellRangeIndices } from "./cellRange";

/**
 * What a copy needs to know: the rectangle, and the data under it.
 *
 * @public
 */
export interface ClipboardRangeOptions<TRow> {
  /** The selected rectangle, in absolute addresses. */
  range: CellRange;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered — a range's column indices address these. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
  /** Include a header row naming each column. Defaults to `false`. */
  headers?: boolean;
}

/** A tab or a newline inside a cell would end the field or the row. */
function escapeCell(text: string): string {
  return /[\t\n\r"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** A value as clipboard text — primitives stringify, anything else is empty. */
function cellText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/**
 * The selected rectangle as tab-separated text, ready for the clipboard.
 *
 * Rows outside what the browser holds are skipped rather than written blank: a
 * range can only cover loaded rows, and inventing empty ones would paste holes
 * into someone's spreadsheet.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link ClipboardRangeOptions}.
 * @returns TSV text; an empty string when the range covers nothing loaded.
 *
 * @public
 */
export function clipboardRangeText<TRow>(
  options: ClipboardRangeOptions<TRow>
): string {
  const { range, rows, columns, firstRowIndex = 0, headers = false } = options;
  const indices = cellRangeIndices(range);
  const cols = indices.cols.flatMap((index) => {
    const column = columns[index];
    return column ? [column] : [];
  });
  if (cols.length === 0) return "";

  const selected = indices.rows.flatMap((index) => {
    const row = rows[index - firstRowIndex];
    return row === undefined ? [] : [row];
  });
  const table = buildExportTable(selected, cols);

  const lines = table.rows.map((row) =>
    row.map(cellText).map(escapeCell).join("\t")
  );
  return headers
    ? [table.headers.map(escapeCell).join("\t"), ...lines].join("\n")
    : lines.join("\n");
}

/**
 * Write text to the clipboard, reporting whether it landed.
 *
 * The async Clipboard API is unavailable outside a secure context and can be
 * refused by permission, so this answers with a boolean rather than throwing:
 * a copy that silently did nothing is the thing worth avoiding, and the caller
 * needs to know in order to say so.
 *
 * @param text - What to write.
 * @returns Whether the clipboard accepted it.
 *
 * @public
 */
export async function writeClipboardText(text: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    // A refused permission is not an error to propagate — it is an answer.
    return false;
  }
}

/**
 * Read text from the clipboard, or `null` when the browser will not give it.
 *
 * Reading is the more restricted half: Safari and Firefox gate `readText`
 * behind a permission or refuse it outside a user gesture. `null` says "no
 * text", never "empty paste", so a caller can tell the difference and say so.
 *
 * @returns The clipboard's text, or `null` when it is unavailable.
 *
 * @public
 */
export async function readClipboardText(): Promise<string | null> {
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.readText) return null;
  try {
    return await clipboard.readText();
  } catch {
    return null;
  }
}
