/**
 * Clipboard text, turned into ordinary cell edits.
 *
 * Paste is deliberately NOT its own commit path. It parses what a spreadsheet
 * put on the clipboard, maps it onto the selection, and hands back the same
 * edits an inline edit produces — same `parseValue`, same shape, same host
 * handler. Anything later added to that path (validation, async save states,
 * conflict handling) applies to a paste without paste knowing it exists, which
 * is what stops this becoming a second half-maintained editing route.
 *
 * The parsing follows what Excel, Google Sheets, Numbers and LibreOffice write:
 * tab-separated fields, newline-separated rows, and RFC-4180 quoting when a
 * field carries a tab, a newline or a quote.
 */
import { isCellEditable } from "../editing/cellEditing";
import type { ColumnDef } from "../types";
import { batchEditHandler, type CellEdit } from "./cellEdits";
import { type CellRange, cellRangeBounds } from "./cellRange";

/**
 * Parse clipboard text into a grid of raw strings.
 *
 * Quoted fields keep their tabs and newlines: a spreadsheet writes `"a\tb"` for
 * a cell containing a tab, and splitting naively would turn one cell into two
 * and shift every column after it.
 *
 * @param text - The clipboard's text.
 * @returns Rows of raw cell strings; empty when there is nothing to paste.
 *
 * @internal
 */
export function parseClipboardTable(text: string): string[][] {
  if (text === "") return [];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' && field === "") {
      const quoted = readQuotedField(text, i + 1);
      field = quoted.value;
      i = quoted.next;
    } else if (ch === "\t") {
      row.push(field);
      field = "";
      i++;
    } else if (ch === "\n" || ch === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      // CRLF is one break, not two: counting it twice pastes a blank row.
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Read one quoted field, starting just past its opening quote.
 *
 * @param text - The whole clipboard text.
 * @param start - Index of the first character inside the quotes.
 * @returns The field's value and the index just past its closing quote.
 */
function readQuotedField(
  text: string,
  start: number
): { value: string; next: number } {
  let value = "";
  let i = start;
  while (i < text.length) {
    if (text[i] !== '"') {
      value += text[i];
      i++;
    } else if (text[i + 1] === '"') {
      // A doubled quote is one literal quote; a lone one closes the field.
      value += '"';
      i += 2;
    } else return { value, next: i + 1 };
  }
  // Unterminated — a truncated clipboard is still worth what it carries.
  return { value, next: i };
}

/**
 * What a paste needs to know to become edits.
 *
 * @internal
 */
export interface PasteRangeOptions<TRow> {
  /** The clipboard's text. */
  text: string;
  /** Where the paste starts — its top-left cell is the anchor. */
  range: CellRange;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered — a range's column indices address these. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
}

/**
 * Turn clipboard text into the edits it implies, starting at the selection's
 * top-left cell.
 *
 * The clipboard's shape wins over the selection's: pasting a 3×2 block into a
 * single selected cell writes 3×2, which is what every spreadsheet does. Cells
 * falling outside the loaded rows or the rendered columns are dropped rather
 * than invented — a paste must never write into a row the browser has not got.
 *
 * A column that is not editable is skipped: paste is an edit, and an edit into a
 * read-only column is not one.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link PasteRangeOptions}.
 * @returns The edits, in row-major order.
 *
 * @internal
 */
export function pasteRangeEdits<TRow>(
  options: PasteRangeOptions<TRow>
): CellEdit<TRow>[] {
  const { text, range, rows, columns, firstRowIndex = 0 } = options;
  const grid = parseClipboardTable(text);
  if (grid.length === 0) return [];

  const start = cellRangeBounds(range);
  const edits: CellEdit<TRow>[] = [];

  grid.forEach((line, r) => {
    const row = rows[start.fromRow + r - firstRowIndex];
    if (row === undefined) return;
    line.forEach((raw, c) => {
      const column = columns[start.fromCol + c];
      if (!column || !isCellEditable(column, row)) return;
      edits.push({
        row,
        columnKey: column.key,
        // The column's own parser, so a paste commits what typing would.
        value: column.parseValue ? column.parseValue(raw, row) : raw,
      });
    });
  });
  return edits;
}

/**
 * The two ways a table can receive a paste.
 *
 * @internal
 */
export interface CellPasteHandlerOptions<TRow> {
  /** Takes the batch whole — one transaction, one undo entry. */
  onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  /** The ordinary inline-edit channel, used one edit at a time. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => void;
}

/**
 * Resolve who receives a paste — `onCellPaste`, or `onCellEdit` one cell at a
 * time. See {@link batchEditHandler} for why the default is the edit channel.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link CellPasteHandlerOptions}.
 * @returns The handler, or `undefined` when the table takes no edits at all —
 *   which leaves Ctrl/Cmd+V to the browser.
 *
 * @internal
 */
export function cellPasteHandler<TRow>(
  options: CellPasteHandlerOptions<TRow>
): ((edits: CellEdit<TRow>[]) => void) | undefined {
  return batchEditHandler(options.onCellPaste, options.onCellEdit);
}

/**
 * The two ways a table can receive a fill.
 *
 * @internal
 */
export interface CellFillHandlerOptions<TRow> {
  /** Takes the batch whole — one transaction, one undo entry. */
  onCellFill?: (edits: CellEdit<TRow>[]) => void;
  /** The ordinary inline-edit channel, used one edit at a time. */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => void;
}

/**
 * Resolve who receives a fill — `onCellFill`, or `onCellEdit` one cell at a
 * time. See {@link batchEditHandler} for why the default is the edit channel.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link CellFillHandlerOptions}.
 * @returns The handler, or `undefined` when the table takes no edits at all —
 *   which is also when the fill handle is not rendered.
 *
 * @internal
 */
export function cellFillHandler<TRow>(
  options: CellFillHandlerOptions<TRow>
): ((edits: CellEdit<TRow>[]) => void) | undefined {
  return batchEditHandler(options.onCellFill, options.onCellEdit);
}
