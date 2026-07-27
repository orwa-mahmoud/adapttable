import type { ColumnDef } from "../types";
import { isBrowser } from "../utils/env";

/** Options for {@link rowsToCsv}. */
export interface RowsToCsvOptions<TRow> {
  /**
   * Resolve a cell's CSV value. Defaults to the column's `accessor` when it
   * yields a primitive, falling back to `sortValue`, else an empty string —
   * so JSX cells export their underlying value instead of `[object Object]`.
   */
  getValue?: (row: TRow, column: ColumnDef<TRow>) => unknown;
  /** Field delimiter. Defaults to `","`. */
  delimiter?: string;
  /**
   * Neutralise spreadsheet formula injection: string cells beginning with
   * `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'` so
   * Excel and Google Sheets show them as text instead of executing them.
   * Number and boolean cells are never touched. Disable ONLY when the
   * output is consumed by machines, never opened in a spreadsheet.
   * @defaultValue true
   */
  escapeFormulas?: boolean;
}

/** A cell value as text: primitives stringify, anything else is empty. */
function cellText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

/** Characters that make a spreadsheet treat a leading cell as a formula. */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/** RFC-4180 quoting: wrap when the value carries delimiter/quote/newline. */
function escapeCell(
  value: unknown,
  delimiter: string,
  escapeFormulas: boolean
): string {
  let text = cellText(value);
  // Only string values can smuggle formulas — a numeric -5 stays a number.
  if (
    escapeFormulas &&
    typeof value === "string" &&
    FORMULA_PREFIX_RE.test(text)
  ) {
    text = `'${text}`;
  }
  if (
    text.includes(delimiter) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function defaultValue<TRow>(row: TRow, column: ColumnDef<TRow>): unknown {
  const fromAccessor = column.accessor?.(row);
  if (
    typeof fromAccessor === "string" ||
    typeof fromAccessor === "number" ||
    typeof fromAccessor === "boolean"
  ) {
    return fromAccessor;
  }
  return column.sortValue?.(row) ?? "";
}

/**
 * Serialize rows to CSV using the table's own column definitions: the header
 * row uses each column's string `header` (else its key), and cells resolve
 * via `accessor` → `sortValue`. Pure and headless — pair with
 * {@link downloadCsv} or send the string anywhere.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows to export (e.g. `source.rows`, or the full set).
 * @param columns - The columns to export, in order.
 * @param options - See {@link RowsToCsvOptions}.
 * @returns The CSV text (no BOM; {@link downloadCsv} adds one for Excel).
 */
export function rowsToCsv<TRow>(
  rows: readonly TRow[],
  columns: readonly ColumnDef<TRow>[],
  options: RowsToCsvOptions<TRow> = {}
): string {
  const {
    getValue = defaultValue,
    delimiter = ",",
    escapeFormulas = true,
  } = options;
  const head = columns
    .map((c) =>
      escapeCell(
        typeof c.header === "string" ? c.header : c.key,
        delimiter,
        escapeFormulas
      )
    )
    .join(delimiter);
  const body = rows.map((row) =>
    columns
      .map((column) =>
        escapeCell(getValue(row, column), delimiter, escapeFormulas)
      )
      .join(delimiter)
  );
  return [head, ...body].join("\r\n");
}

/**
 * Trigger a browser download of CSV text (UTF-8 with BOM, so Excel opens
 * unicode correctly). No-op outside the browser.
 *
 * @param filename - Download name, e.g. `"people.csv"`.
 * @param csv - The CSV text from {@link rowsToCsv}.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (!isBrowser()) return;
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
