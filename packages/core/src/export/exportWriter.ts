/**
 * What turns a resolved export into a file.
 *
 * Scopes and formats are separate questions. Which rows and columns leave the
 * table is decided once — page, all, selected, the highlighted range, and any
 * column subset — and a **writer** decides what the bytes look like. That split
 * is what lets one scope API serve CSV and XLSX without either format knowing
 * the other exists, and it is why adding a format later costs a writer rather
 * than a second export pipeline.
 *
 * A writer is handed **resolved values**, not rows and columns. Every format
 * would otherwise repeat the same resolution — a column's `exportValue`, then
 * its accessor, then `sortValue` — and the first one to get it slightly wrong
 * would quietly disagree with the others about what the same table contains.
 * Resolving once puts that beyond doubt, and it makes a writer non-generic:
 * `xlsxWriter()` drops into a table of any row type without a type argument.
 *
 * The other reason formats stay separate is weight. CSV is built in, so it
 * lives here. XLSX is a separate entry (`@adapttable/core/xlsx`) that only an
 * app importing it ever downloads — a table that exports CSV must not ship a
 * ZIP encoder.
 */
import {
  coveredAddressSet,
  type GetCellSpan,
  spanningArmed,
} from "../rows/cellSpan";
import type { ColumnDef } from "../types";
import { isBrowser } from "../utils/env";
import { getPath } from "../utils/path";
import { defaultCsvValue, matrixToCsv } from "./csv";

/**
 * What a structured export row is: a data leaf, a group header, or a
 * total. CSV ignores the distinction; a spreadsheet uses it for outline
 * levels and for which rows are bold.
 *
 * @public
 */
export type ExportRowRole = "data" | "group" | "aggregate";

/**
 * Per-row structure a writer may honour. Aligned with {@link ExportTable.rows}.
 *
 * @public
 */
export interface ExportRowMeta {
  /** What this row is. */
  role: ExportRowRole;
  /** Outline depth from zero — group headers sit at their grouping level. */
  level: number;
}

/**
 * One row of a grouped or tree-shaped export, before values are resolved.
 *
 * A flat table never produces these. When they are present the file follows
 * the view the reader can see — headers, leaves, footers — instead of a
 * denormalised leaf list.
 *
 * @internal
 */
export type ExportViewEntry<TRow> =
  | { role: "data"; row: TRow; level: number }
  | {
      role: "group" | "aggregate";
      label: string;
      level: number;
      /** Column that receives the label when that cell would otherwise be empty. */
      labelKey?: string;
      values?: Readonly<Partial<Record<string, unknown>>>;
    };

/**
 * An export after the scopes are applied and the cells are resolved: headers,
 * keys, and one row of values per exported row.
 *
 * @public
 */
export interface ExportTable {
  /** Column headings, in file order. */
  headers: readonly string[];
  /** Column keys, in the same order — for a format that names its fields. */
  keys: readonly string[];
  /** One array of values per row, aligned to `headers`. */
  rows: readonly (readonly unknown[])[];
  /**
   * Structure for each row, when the export is a grouped or tree view.
   * Absent on a flat table, so existing writers keep seeing exactly what
   * they always did.
   */
  rowMeta?: readonly ExportRowMeta[];
  /**
   * Suggested character widths, aligned to `headers`. A column that did not
   * state a width is `undefined` and the writer picks its own default.
   */
  widths?: readonly (number | undefined)[];
}

/**
 * What a writer is given: the resolved export, exactly as it will ship.
 *
 * @public
 */
export interface ExportWriteContext {
  /** The values to write. */
  table: ExportTable;
  /** The filename the file will be given — for a writer that embeds a title. */
  filename: string;
  /** The CSV formula-injection guard; formats without the flaw ignore it. */
  escapeFormulas?: boolean;
}

/**
 * A built file, ready to hand to the browser.
 *
 * @public
 */
export interface ExportPayload {
  /** The content, in the pieces a `Blob` takes. */
  parts: readonly BlobPart[];
  /** MIME type for the download. */
  mimeType: string;
  /**
   * The file as text, for `onAfterExport` and for hosts that keep a copy.
   * Binary formats leave this empty — their bytes are in `parts`.
   */
  text: string;
}

/**
 * A file format the export button can produce.
 *
 * @public
 */
export interface ExportWriter {
  /** Extension used when no filename was given, e.g. `"xlsx"`. */
  extension: string;
  /** Build the file from the resolved values. */
  build: (context: ExportWriteContext) => ExportPayload;
}

/**
 * A column's own `exportValue` wins, because it exists precisely to say the
 * file should carry something other than the screen. Without one, the default
 * display-value resolution stands.
 */
function exportCellValue<TRow>(row: TRow, column: ColumnDef<TRow>): unknown {
  if (column.exportValue) return column.exportValue(row);
  const value = defaultCsvValue(row, column);
  if (value !== "") return value;
  const path = getPath(row, column.key);
  return path instanceof Date && !Number.isNaN(path.getTime()) ? path : value;
}

/** Character width a spreadsheet can use, from a column's own `width`. */
function columnWidthChars<TRow>(column: ColumnDef<TRow>): number | undefined {
  const raw = column.width;
  let pixels = Number.NaN;
  if (typeof raw === "number") pixels = raw;
  else if (typeof raw === "string") pixels = Number.parseFloat(raw);
  if (!Number.isFinite(pixels) || pixels <= 0) return undefined;
  // Excel's width unit is roughly a character. A pixel width divided by
  // eight is the usual conversion; clamp so a 400px column does not become
  // a poster and a 20px one does not vanish.
  return Math.min(40, Math.max(8, pixels / 8));
}

function tableChrome<TRow>(columns: readonly ColumnDef<TRow>[]): {
  headers: string[];
  keys: string[];
  widths: (number | undefined)[];
} {
  return {
    headers: columns.map((column) =>
      typeof column.header === "string" ? column.header : column.key
    ),
    keys: columns.map((column) => column.key),
    widths: columns.map(columnWidthChars),
  };
}

function viewRowValues<TRow>(
  entry: ExportViewEntry<TRow>,
  columns: readonly ColumnDef<TRow>[]
): unknown[] {
  if (entry.role === "data") {
    return columns.map((column) => exportCellValue(entry.row, column));
  }
  return columns.map((column) => {
    const fromValues = entry.values?.[column.key];
    if (fromValues !== undefined) return fromValues;
    return column.key === entry.labelKey ? entry.label : "";
  });
}

/**
 * Resolve rows and columns into the values a file carries.
 *
 * Values keep their type — a number stays a number — because a format that can
 * express one should say so, and text is a lossy last resort rather than the
 * only option.
 *
 * @typeParam TRow - The row type.
 * @param rows - The rows a scope resolved to, in table order.
 * @param columns - The columns a scope resolved to, in file order.
 * @returns The resolved table a writer receives.
 *
 * @internal
 */
export function buildExportTable<TRow>(
  rows: readonly TRow[],
  columns: readonly ColumnDef<TRow>[],
  span?: {
    getCellSpan?: GetCellSpan<TRow>;
    firstRowIndex?: number;
    view?: readonly ExportViewEntry<TRow>[];
    summary?: Readonly<Partial<Record<string, unknown>>>;
  }
): ExportTable {
  const chrome = tableChrome(columns);
  const firstRowIndex = span?.firstRowIndex ?? 0;
  const view = span?.view;
  if (view) {
    const body = view.map((entry) => ({
      values: viewRowValues(entry, columns),
      meta: { role: entry.role, level: entry.level } satisfies ExportRowMeta,
    }));
    const summary = span?.summary;
    if (summary && Object.keys(summary).length > 0) {
      body.push({
        values: columns.map((column) => summary[column.key] ?? ""),
        meta: { role: "aggregate", level: 0 },
      });
    }
    return {
      ...chrome,
      rows: body.map((row) => row.values),
      rowMeta: body.map((row) => row.meta),
    };
  }
  const coveredSet =
    span?.getCellSpan && spanningArmed(columns, span.getCellSpan)
      ? coveredAddressSet({
          rows,
          columns,
          getCellSpan: span.getCellSpan,
          firstRowIndex,
        })
      : undefined;
  const dataRows = rows.map((row, rowIndex) =>
    columns.map((column, col) => {
      if (coveredSet?.has(`${firstRowIndex + rowIndex}:${col}`)) return "";
      return exportCellValue(row, column);
    })
  );
  const summary = span?.summary;
  if (summary && Object.keys(summary).length > 0) {
    const total = columns.map((column) => summary[column.key] ?? "");
    return {
      ...chrome,
      rows: [...dataRows, total],
      rowMeta: [
        ...dataRows.map(() => ({ role: "data" as const, level: 0 })),
        { role: "aggregate", level: 0 },
      ],
    };
  }
  return {
    ...chrome,
    rows: dataRows,
  };
}

/** The UTF-8 byte-order mark, which is what makes Excel read the file as UTF-8. */
const BOM = "\uFEFF";

/**
 * The built-in writer: comma-separated text, UTF-8 with a BOM so Excel opens
 * unicode correctly. This is what the export button uses when no writer is
 * given.
 *
 * @internal
 */
export const csvWriter: ExportWriter = {
  extension: "csv",
  build: ({ table, escapeFormulas }) => {
    const text = matrixToCsv(table, { escapeFormulas });
    return { parts: [BOM, text], mimeType: "text/csv;charset=utf-8", text };
  },
};

/** `"export.xlsx"` — the name when the caller did not choose one. */
export function defaultExportFilename(writer: ExportWriter): string {
  return `export.${writer.extension}`;
}

/**
 * Hand a built file to the browser. No-op outside it, so a server render that
 * reaches this does nothing rather than throwing.
 *
 * @param filename - Download name, e.g. `"people.xlsx"`.
 * @param payload - The file from `ExportWriter.build`.
 *
 * @internal
 */
export function downloadExportFile(
  filename: string,
  payload: ExportPayload
): void {
  if (!isBrowser()) return;
  const blob = new Blob([...payload.parts], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
