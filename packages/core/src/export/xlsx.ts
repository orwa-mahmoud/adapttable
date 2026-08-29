/**
 * A spreadsheet file, written by hand.
 *
 * `.xlsx` is a ZIP of XML documents, which is the only reason writing one
 * without a dependency is reasonable. What it needs is small: a content-type
 * map, two relationship files, a workbook naming one sheet, and the sheet
 * itself. Everything else in the format is optional.
 *
 * Values are written as **inline strings** or numbers rather than through a
 * shared-strings table. Shared strings save space when text repeats and cost a
 * second document plus an index to maintain; for a table export the saving is
 * small and the failure mode — an index that disagrees with the sheet — produces
 * a file Excel refuses to open. Inline is simpler and cannot desynchronise.
 *
 * Numbers stay numbers so a spreadsheet can sum them, which is the entire point
 * of exporting to a spreadsheet rather than a CSV.
 */
import type { ColumnDef } from "../types";
import {
  buildExportTable,
  type ExportTable,
  type ExportViewEntry,
  type ExportWriter,
} from "./exportWriter";
import { buildZip, utf8, type ZipEntry } from "./zip";

export type { ColumnDef, ExportWriter };

/** Escape the five characters XML cannot carry literally. */
function xml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * A column's spreadsheet letter: 0 → A, 25 → Z, 26 → AA.
 *
 * Base-26 with no zero digit, so the usual `% 26` loop is off by one without
 * the decrement — the bug that puts column 26 at "BA".
 */
export function columnLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCodePoint(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

/**
 * Strip what XML 1.0 cannot carry: control characters other than tab, newline
 * and carriage return. One such byte from a database makes the whole workbook
 * unopenable, and the user has no way to tell which cell did it.
 *
 * Written as a scan rather than a regex because the regex form needs a lint
 * suppression, and a rule worth silencing here is a rule worth not tripping.
 */
function safeText(text: string): string {
  let out = "";
  for (const ch of text) {
    // A character compares below a space exactly when its code point does,
    // which is the whole test — and needs no code-point lookup to make it.
    if (ch >= " " || ch === "\t" || ch === "\n" || ch === "\r") out += ch;
  }
  return out;
}

/** Style index in `styles.xml`: default, header/total bold, date, datetime. */
const STYLE = {
  default: 0,
  bold: 1,
  date: 2,
  datetime: 3,
} as const;

/** Excel's day-zero, including the 1900 leap-year bug it still ships. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** A date with no clock is a day; anything else is a day-and-time. */
function isDateOnly(date: Date): boolean {
  return (
    (date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0 &&
      date.getUTCMilliseconds() === 0) ||
    (date.getHours() === 0 &&
      date.getMinutes() === 0 &&
      date.getSeconds() === 0 &&
      date.getMilliseconds() === 0)
  );
}

/** Excel serial: days (and a fraction) since 1899-12-30. */
function excelSerial(date: Date): number {
  if (isDateOnly(date) && date.getHours() === 0 && date.getUTCHours() !== 0) {
    const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return (local - EXCEL_EPOCH_MS) / 86_400_000;
  }
  return (date.getTime() - EXCEL_EPOCH_MS) / 86_400_000;
}

function styleAttr(style: number): string {
  return style === STYLE.default ? "" : ` s="${String(style)}"`;
}

/**
 * One `<c>` element, typed by what the value actually is.
 *
 * The type comes from the value, never from parsing its text. A postal code of
 * `"01730"` and a phone number of `"0123"` are strings, and a writer that
 * sniffed digits would hand back `1730` and `123` — the classic spreadsheet
 * export bug, and unfixable by the user once the file exists.
 *
 * Strings need no formula guard here: XLSX keeps formulas in an `<f>` element,
 * so text beginning with `=` is text. That is why `escapeFormulas` is a CSV
 * concern and this format ignores it.
 *
 * Dates stay dates: a `Date` becomes an Excel serial with a date or
 * datetime number format, so a spreadsheet can sort and filter the column
 * instead of reading a string that looks like one.
 */
function cellXml(
  ref: string,
  value: unknown,
  style: number = STYLE.default
): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const dateStyle = isDateOnly(value) ? STYLE.date : STYLE.datetime;
    return `<c r="${ref}"${styleAttr(dateStyle)}><v>${excelSerial(value)}</v></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr(style)}><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}"${styleAttr(style)} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  const text = typeof value === "string" ? value : "";
  if (text === "") return `<c r="${ref}"${styleAttr(style)}/>`;
  return `<c r="${ref}"${styleAttr(style)} t="inlineStr"><is><t xml:space="preserve">${xml(
    safeText(text)
  )}</t></is></c>`;
}

function colsXml(table: ExportTable): string {
  const cols = table.headers.map((header, index) => {
    const stated = table.widths?.[index];
    const width = stated ?? Math.min(40, Math.max(8, header.length + 2));
    return `<col min="${String(index + 1)}" max="${String(index + 1)}" width="${String(width)}" customWidth="1"/>`;
  });
  return cols.length > 0 ? `<cols>${cols.join("")}</cols>` : "";
}

function rowOpen(index: number, level: number): string {
  return level > 0
    ? `<row r="${String(index)}" outlineLevel="${String(level)}">`
    : `<row r="${String(index)}">`;
}

/** The sheet document: a header row of column names, then the data. */
function sheetXml(table: ExportTable): string {
  const lines: string[] = [];
  const header = table.headers
    .map((text, i) => cellXml(`${columnLetter(i)}1`, text, STYLE.bold))
    .join("");
  lines.push(`${rowOpen(1, 0)}${header}</row>`);

  let maxLevel = 0;
  table.rows.forEach((row, r) => {
    const meta = table.rowMeta?.[r];
    const level = meta?.level ?? 0;
    if (level > maxLevel) maxLevel = level;
    const style =
      meta?.role === "group" || meta?.role === "aggregate"
        ? STYLE.bold
        : STYLE.default;
    const cells = row
      .map((value, c) => cellXml(`${columnLetter(c)}${r + 2}`, value, style))
      .join("");
    lines.push(`${rowOpen(r + 2, level)}${cells}</row>`);
  });

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetPr><outlinePr summaryBelow="0"/></sheetPr>' +
    `<sheetFormatPr defaultRowHeight="15" outlineLevelRow="${String(maxLevel)}"/>` +
    '<sheetViews><sheetView workbookViewId="0">' +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' +
    "</sheetView></sheetViews>" +
    colsXml(table) +
    `<sheetData>${lines.join("")}</sheetData>` +
    "</worksheet>"
  );
}

/** Fonts, date formats, and the four cell styles the sheet refers to. */
function stylesXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2">' +
    '<numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>' +
    '<numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/>' +
    "</numFmts>" +
    '<fonts count="2">' +
    '<font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
    "</fonts>" +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFD6DCE4"/><bgColor indexed="64"/></patternFill></fill>' +
    "</fills>" +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
    "</cellStyleXfs>" +
    '<cellXfs count="4">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    "</cellXfs>" +
    "</styleSheet>"
  );
}

/** The fixed documents every workbook needs, plus the sheet and its styles. */
function documents(table: ExportTable, sheetName: string): ZipEntry[] {
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    "</Types>";

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${xml(safeSheetName(sheetName))}" sheetId="1" r:id="rId1"/></sheets>` +
    "</workbook>";

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    "</Relationships>";

  return [
    { name: "[Content_Types].xml", data: utf8(contentTypes) },
    { name: "_rels/.rels", data: utf8(rootRels) },
    { name: "xl/workbook.xml", data: utf8(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: utf8(workbookRels) },
    { name: "xl/styles.xml", data: utf8(stylesXml()) },
    { name: "xl/worksheets/sheet1.xml", data: utf8(sheetXml(table)) },
  ];
}

/**
 * Excel's own rules for a sheet name: at most 31 characters and none of
 * `: \ / ? * [ ]`. A name that breaks them makes the whole file unopenable, so
 * it is corrected rather than passed through.
 */
export function safeSheetName(name: string): string {
  const cleaned = name.replaceAll(/[:\\/?*[\]]/g, " ").trim();
  return (cleaned === "" ? "Sheet1" : cleaned).slice(0, 31);
}

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
  columns: readonly ColumnDef<TRow>[];
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

/** The workbook for an already-resolved table — what the writer calls. */
function xlsxBytes(
  table: ExportTable,
  sheetName?: string
): Uint8Array<ArrayBuffer> {
  return buildZip(documents(table, sheetName ?? "Sheet1"));
}

/** The MIME type Excel, Numbers and Google Sheets all register for `.xlsx`. */
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * The spreadsheet writer, for the `exportCsv` prop's `writer` option:
 *
 * ```tsx
 * import { xlsxWriter } from "@adapttable/core/xlsx";
 *
 * <DataTable exportCsv={{ writer: xlsxWriter(), scope: "selected" }} … />
 * ```
 *
 * Every scope works unchanged — page, all, selected, range, and any column
 * subset — because the scope is resolved before a writer is asked for anything.
 *
 * @param options - The sheet's name inside the workbook. Defaults to `"Sheet1"`.
 * @returns A writer to hand to `exportCsv`.
 *
 * @public
 */
export function xlsxWriter(options?: { sheetName?: string }): ExportWriter {
  return {
    extension: "xlsx",
    build: ({ table }) => ({
      parts: [xlsxBytes(table, options?.sheetName)],
      mimeType: XLSX_MIME,
      // Binary: the bytes are the file, and there is no text form of them.
      text: "",
    }),
  };
}

export type { CellEditor } from "../editing/cellEditing";
export type { ColumnFilter } from "../filters/filterDefs";
export type {
  CellProps,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "../types";
export type { ExportPayload, ExportWriteContext } from "./exportWriter";
