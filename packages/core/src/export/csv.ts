import type { ColumnDef } from "../types";
import { isBrowser } from "../utils/env";

/**
 * Options for {@link rowsToCsv}.
 *
 * @public
 */
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

/** A cell value as text: primitives stringify, a date is its ISO day, anything else is empty. */
function cellText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
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

/** A value a file can type: a primitive, or a real `Date`. */
function isTypedCell(value: unknown): boolean {
  if (typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * How a cell resolves when nothing overrides it: the display value, since a
 * CSV with no other instruction should carry what the table shows.
 *
 * Internal to the export module — exported so the table-level export can fall
 * back to it after checking a column's `exportValue`.
 */
export function defaultCsvValue<TRow>(
  row: TRow,
  column: ColumnDef<TRow>
): unknown {
  const fromAccessor = column.accessor?.(row);
  if (isTypedCell(fromAccessor)) return fromAccessor;
  const fromSort = column.sortValue?.(row);
  return isTypedCell(fromSort) ? fromSort : (fromSort ?? "");
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
 *
 * @public
 */
export function rowsToCsv<TRow>(
  rows: readonly TRow[],
  columns: readonly ColumnDef<TRow>[],
  options: RowsToCsvOptions<TRow> = {}
): string {
  const { getValue = defaultCsvValue } = options;
  return matrixToCsv(
    {
      headers: columns.map((c) =>
        typeof c.header === "string" ? c.header : c.key
      ),
      rows: rows.map((row) => columns.map((column) => getValue(row, column))),
    },
    options
  );
}

/**
 * The same CSV, from values that are already resolved.
 *
 * This is the one place that writes CSV. The table-level export resolves its
 * cells once and hands the result to a writer, so routing `rowsToCsv` through
 * here is what keeps the two from ever disagreeing about quoting, line endings
 * or formula escaping.
 *
 * @param table - Headers and one array of values per row.
 * @param options - Delimiter and formula escaping.
 * @returns The CSV text (no BOM).
 *
 * @public
 */
export function matrixToCsv(
  table: {
    headers: readonly string[];
    rows: readonly (readonly unknown[])[];
  },
  options: { delimiter?: string; escapeFormulas?: boolean } = {}
): string {
  const { delimiter = ",", escapeFormulas = true } = options;
  const head = table.headers
    .map((header) => escapeCell(header, delimiter, escapeFormulas))
    .join(delimiter);
  const body = table.rows.map((row) =>
    row
      .map((value) => escapeCell(value, delimiter, escapeFormulas))
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
 *
 * @public
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
