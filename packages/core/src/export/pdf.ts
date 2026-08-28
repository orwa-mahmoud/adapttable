/**
 * A PDF file, written by hand.
 *
 * PDF is a sequence of numbered objects, a cross-reference table and a
 * trailer — small enough to emit without a library, the same reason XLSX
 * is a ZIP we write ourselves. What it needs is a catalog, a page tree,
 * two standard fonts, and one content stream per page. Everything else
 * in the format is optional.
 *
 * Helvetica is one of the fourteen fonts every reader already has, so by
 * default the file embeds nothing and stays a few kilobytes. That is also
 * the limit: glyphs outside WinAnsi become `?` on the page.
 *
 * Hand it a font and that limit lifts. `font` takes a TrueType file as
 * bytes; the writer subsets it to the glyphs the table used, embeds it,
 * shapes Arabic into its presentation forms and reorders right-to-left
 * text for drawing. See `./pdfFont` and `./arabicText` for how. The
 * original characters still travel in `/ActualText`, so copy-paste and a
 * screen reader read the logical string either way.
 *
 * Values resolve exactly as they do for CSV and XLSX. What differs is
 * pagination: a column's width, a group's outline and a page break are
 * honoured here because a PDF that ignores them is a screenshot of the
 * wrong table.
 */
import type { CellEditor } from "../editing/cellEditing";
import type { ColumnFilter } from "../filters/filterDefs";
import type {
  CellProps,
  ColumnDef,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  SortableValue,
} from "../types";
import {
  buildExportTable,
  type ExportPayload,
  type ExportRowMeta,
  type ExportTable,
  type ExportViewEntry,
  type ExportWriteContext,
  type ExportWriter,
} from "./exportWriter";
import {
  embeddedFace,
  hex4,
  type PdfBody,
  pdfLiteral,
  standardFace,
  type TextFace,
} from "./pdfFont";
import {
  exportCellText,
  type PrintPageBreak,
  type PrintPageSize,
  resolvePrintDirection,
} from "./printLayout";
import { parseSfnt } from "./sfnt";

export type {
  CellEditor,
  CellProps,
  ColumnDef,
  ColumnFilter,
  ColumnFooterContext,
  ColumnGroupShow,
  ColumnHeaderContext,
  ExportPayload,
  ExportRowMeta,
  ExportWriteContext,
  ExportWriter,
  PrintPageBreak,
  SortableValue,
};

/**
 * Options the writer and {@link buildTablePdf} share.
 *
 * @public
 */
export interface PdfWriterOptions {
  /** Document title. Defaults to the download name without its extension. */
  title?: string;
  /** Layout direction. Omit it and a browser inherits the page's `dir`. */
  direction?: "ltr" | "rtl";
  /**
   * Paper size. Defaults to A4 landscape — the same default as the print
   * stylesheet, so the two paths agree about how wide a table is.
   */
  pageSize?: PrintPageSize;
  /**
   * `"auto"` (default) starts a new page when the next row will not fit,
   * and will not leave a group header alone at the bottom. `"group"`
   * also starts a page before each top-level group after the first.
   */
  pageBreak?: PrintPageBreak;
  /**
   * A TrueType font to draw with, as the file's bytes.
   *
   * Omit it and the PDF uses Helvetica and embeds nothing, which is right
   * for a Latin table. Supply one and the writer embeds a subset of it —
   * only the glyphs this table used — which is what lets the file draw
   * Arabic, Chinese, Cyrillic or anything else the font covers, instead of
   * the `?` a built-in face has to fall back to.
   *
   * ```ts
   * const font = await fetch("/fonts/NotoSansArabic-Regular.ttf")
   *   .then((res) => res.arrayBuffer());
   *
   * pdfWriter({ font, direction: "rtl" });
   * ```
   *
   * The font must have TrueType outlines — a `.ttf`, or an `.otf` built
   * from one. A CFF-flavoured OpenType file is rejected with a message
   * saying so rather than embedded whole.
   */
  font?: Uint8Array | ArrayBuffer;
}

interface PageBox {
  width: number;
  height: number;
}

interface DrawContext {
  box: PageBox;
  colWidths: number[];
  colXs: number[];
  rtl: boolean;
  face: TextFace;
}

const MARGIN = 36;
const FONT_SIZE = 9;
const ROW_H = 16;
const HEADER_H = 18;
const TITLE_H = 22;
const FOOTER = 20;
const CELL_PAD = 4;
const INDENT = 12;
const HEADER_FILL = "0.9 0.9 0.9";
const GROUP_FILL = "0.95 0.95 0.95";

function pageBox(size: PrintPageSize = "a4-landscape"): PageBox {
  if (size === "a4") return { width: 595, height: 842 };
  if (size === "letter") return { width: 612, height: 792 };
  if (size === "letter-landscape") return { width: 792, height: 612 };
  return { width: 842, height: 595 };
}

function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function ascii(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  let total = 0;
  for (const chunk of chunks) total += chunk.byteLength;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** UTF-16BE with a BOM, as `/ActualText` hex strings require. */
function utf16BeHex(text: string): string {
  let hex = "FEFF";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0xffff) {
      const u = code - 0x10000;
      hex += hex4(0xd800 + (u >> 10));
      hex += hex4(0xdc00 + (u & 0x3ff));
    } else {
      hex += hex4(code);
    }
  }
  return `<${hex}>`;
}

/**
 * How wide the text is once drawn.
 *
 * Shaping happens first, because it changes the answer: an Arabic letter's
 * medial form is narrower than its isolated one, and measuring the letters
 * as typed would leave every joined word short of its column.
 */
function drawnWidth(
  text: string,
  fontSize: number,
  ctx: Pick<DrawContext, "face" | "rtl">
): number {
  return ctx.face.measure(ctx.face.order(text, ctx.rtl), fontSize);
}

/**
 * Trim text to a column, with an ellipsis.
 *
 * The cut is made on the logical string, not the drawn one, so a
 * right-to-left sentence loses its end rather than its beginning and the
 * ellipsis lands where the reader stopped reading.
 */
function fitText(
  text: string,
  maxPt: number,
  fontSize: number,
  ctx: Pick<DrawContext, "face" | "rtl">
): string {
  if (drawnWidth(text, fontSize, ctx) <= maxPt) return text;
  const ellipsis = "…";
  if (drawnWidth(ellipsis, fontSize, ctx) > maxPt) return ellipsis;
  let end = text.length;
  while (
    end > 0 &&
    drawnWidth(text.slice(0, end) + ellipsis, fontSize, ctx) > maxPt
  ) {
    end -= 1;
  }
  return end === 0 ? ellipsis : text.slice(0, end) + ellipsis;
}

function contentTop(box: PageBox, titled: boolean): number {
  return box.height - MARGIN - (titled ? TITLE_H : 0);
}

function columnWidths(table: ExportTable, usable: number): number[] {
  const count = table.headers.length;
  if (count === 0) return [];
  const weights = table.headers.map((_, index) => {
    const stated = table.widths?.[index];
    return stated !== undefined && stated > 0 ? stated : 12;
  });
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => (usable * weight) / sum);
}

function columnXs(
  widths: readonly number[],
  left: number,
  rtl: boolean
): number[] {
  if (!rtl) {
    let x = left;
    return widths.map((width) => {
      const at = x;
      x += width;
      return at;
    });
  }
  let x = left + widths.reduce((total, width) => total + width, 0);
  return widths.map((width) => {
    x -= width;
    return x;
  });
}

function paginate(
  rowCount: number,
  roles: ExportTable["rowMeta"],
  box: PageBox,
  pageBreak: PrintPageBreak | undefined,
  titled: boolean
): number[][] {
  const pages: number[][] = [];
  let current: number[] = [];
  let y = contentTop(box, titled) - HEADER_H;
  const bottom = MARGIN + FOOTER;
  for (let index = 0; index < rowCount; index++) {
    const role = roles?.[index]?.role ?? "data";
    const level = roles?.[index]?.level ?? 0;
    const force =
      pageBreak === "group" &&
      role === "group" &&
      level === 0 &&
      current.length > 0;
    const overflow = y - ROW_H < bottom;
    const orphan = role === "group" && y - ROW_H * 2 < bottom;
    if ((force || overflow || orphan) && current.length > 0) {
      pages.push(current);
      current = [];
      y = contentTop(box, false) - HEADER_H;
    }
    current.push(index);
    y -= ROW_H;
  }
  pages.push(current);
  return pages;
}

function fillRow(
  ctx: DrawContext,
  y: number,
  height: number,
  rgb: string
): string {
  const left = ctx.colXs.reduce(
    (min, x) => Math.min(min, x),
    ctx.colXs[0] ?? MARGIN
  );
  const width = ctx.colWidths.reduce((total, col) => total + col, 0);
  return (
    `${rgb} rg\n${num(left)} ${num(y - height)} ${num(width)} ` +
    `${num(height)} re f\n0 g\n`
  );
}

function cellBox(x: number, y: number, w: number, h: number): string {
  return (
    `0.7 0.7 0.7 RG\n0.4 w\n${num(x)} ${num(y - h)} ${num(w)} ` +
    `${num(h)} re S\n0 g\n`
  );
}

interface CellTextOptions {
  text: string;
  x: number;
  y: number;
  w: number;
  height: number;
  indent: number;
  bold: boolean;
  ctx: DrawContext;
}

function cellText({
  text,
  x,
  y,
  w,
  height,
  indent,
  bold,
  ctx,
}: Readonly<CellTextOptions>): string {
  const { face, rtl } = ctx;
  const max = Math.max(8, w - CELL_PAD * 2 - indent);
  const shown = fitText(text, max, FONT_SIZE, ctx);
  const ordered = face.order(shown, rtl);
  const drawn = face.measure(ordered, FONT_SIZE);
  const tx = rtl ? x + w - CELL_PAD - indent - drawn : x + CELL_PAD + indent;
  const ty = y - height + 5;
  const weight = face.boldRun(bold);
  return (
    `q\n${num(x)} ${num(y - height)} ${num(w)} ${num(height)} re W n\n` +
    `BT\n${face.fontRef(bold)} ${String(FONT_SIZE)} Tf\n` +
    `1 0 0 1 ${num(Math.max(x, tx))} ${num(ty)} Tm\n` +
    `/Span << /ActualText ${utf16BeHex(text)} >> BDC\n` +
    `${weight.open}${face.operand(ordered)} Tj\n${weight.close}EMC\nET\nQ\n`
  );
}

function drawCells(
  count: number,
  values: readonly unknown[],
  ctx: DrawContext,
  y: number,
  height: number,
  style: { bold: boolean; fill?: string; level: number }
): string {
  const parts: string[] = [];
  if (style.fill) parts.push(fillRow(ctx, y, height, style.fill));
  for (let i = 0; i < count; i++) {
    const x = ctx.colXs[i] ?? 0;
    const w = ctx.colWidths[i] ?? 0;
    const indent = i === 0 ? style.level * INDENT : 0;
    parts.push(cellBox(x, y, w, height));
    const text = exportCellText(values[i]);
    if (text !== "") {
      parts.push(
        cellText({
          text,
          x,
          y,
          w,
          height,
          indent,
          bold: style.bold,
          ctx,
        })
      );
    }
  }
  return parts.join("");
}

function drawTitle(title: string, ctx: DrawContext): string {
  const y = ctx.box.height - MARGIN - 14;
  const ordered = ctx.face.order(title, ctx.rtl);
  const width = ctx.face.measure(ordered, 12);
  const x = ctx.rtl ? ctx.box.width - MARGIN - width : MARGIN;
  const weight = ctx.face.boldRun(true);
  return (
    `BT\n${ctx.face.fontRef(true)} 12 Tf\n` +
    `1 0 0 1 ${num(Math.max(MARGIN, x))} ${num(y)} Tm\n` +
    `${weight.open}${ctx.face.operand(ordered)} Tj\n${weight.close}ET\n`
  );
}

function drawFooter(page: number, pageCount: number, ctx: DrawContext): string {
  // This label is written here, in one script, so it is laid out left to
  // right whichever way the table runs.
  const label = `Page ${String(page)} of ${String(pageCount)}`;
  const x = (ctx.box.width - ctx.face.measure(label, 8)) / 2;
  return (
    `BT\n${ctx.face.fontRef(false)} 8 Tf\n` +
    `1 0 0 1 ${num(x)} ${num(MARGIN - 4)} Tm\n` +
    `${ctx.face.operand(label)} Tj\nET\n`
  );
}

function drawHeaderRow(
  table: ExportTable,
  ctx: DrawContext,
  y: number
): string {
  return drawCells(table.headers.length, table.headers, ctx, y, HEADER_H, {
    bold: true,
    fill: HEADER_FILL,
    level: 0,
  });
}

function drawBodyRow(
  table: ExportTable,
  index: number,
  ctx: DrawContext,
  y: number
): string {
  const meta = table.rowMeta?.[index];
  const role = meta?.role ?? "data";
  const level = meta?.level ?? 0;
  const chrome = role === "group" || role === "aggregate";
  return drawCells(
    table.headers.length,
    table.rows[index] ?? [],
    ctx,
    y,
    ROW_H,
    {
      bold: chrome,
      fill: chrome ? GROUP_FILL : undefined,
      level,
    }
  );
}

function pageStream(
  table: ExportTable,
  rowIndices: readonly number[],
  ctx: DrawContext,
  extras: { title?: string; page: number; pageCount: number }
): string {
  const parts: string[] = [];
  if (extras.title) parts.push(drawTitle(extras.title, ctx));
  let y = contentTop(ctx.box, Boolean(extras.title));
  parts.push(drawHeaderRow(table, ctx, y));
  y -= HEADER_H;
  for (const index of rowIndices) {
    parts.push(drawBodyRow(table, index, ctx, y));
    y -= ROW_H;
  }
  parts.push(drawFooter(extras.page, extras.pageCount, ctx));
  return parts.join("");
}

function xrefLine(offset: number, gen: number, inUse: boolean): string {
  const off = String(offset).padStart(10, "0");
  const g = String(gen).padStart(5, "0");
  const flag = inUse ? "n" : "f";
  return `${off} ${g} ${flag} \n`;
}

function streamObject(body: string): string {
  const bytes = ascii(body);
  return `<< /Length ${String(bytes.byteLength)} >>\nstream\n${body}\nendstream`;
}

function pageObject(
  contentId: number,
  box: PageBox,
  fontResources: string
): string {
  return (
    "<< /Type /Page /Parent 2 0 R " +
    `/MediaBox [0 0 ${String(box.width)} ${String(box.height)}] ` +
    `/Contents ${String(contentId)} 0 R ` +
    `/Resources << /Font ${fontResources} >> >>`
  );
}

/**
 * The document title in the `/Info` dictionary.
 *
 * A literal string is WinAnsi, which is all a Latin title needs and is
 * what this has always written. A title the built-in face cannot spell
 * goes as UTF-16 instead, so a reader's window caption and a file
 * manager's preview show the words rather than question marks.
 */
function infoTitle(title: string, face: TextFace): string {
  return face.embedded ? utf16BeHex(title) : pdfLiteral(title);
}

function compilePdf(
  title: string,
  streams: readonly string[],
  box: PageBox,
  face: TextFace
): Uint8Array<ArrayBuffer> {
  const kids: string[] = [];
  const pageBodies: PdfBody[] = [];
  // Font objects go after the pages, so their ids are only known once the
  // page count is.
  const firstFontId = 6 + streams.length * 2;
  const fontResources = face.fontResources(firstFontId);
  streams.forEach((stream, index) => {
    const pageId = 6 + index * 2;
    const contentId = pageId + 1;
    kids.push(`${String(pageId)} 0 R`);
    pageBodies.push(
      pageObject(contentId, box, fontResources),
      streamObject(stream)
    );
  });
  const extras = face.extraObjects(firstFontId);
  const objects: PdfBody[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${String(streams.length)} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Title ${infoTitle(title, face)} /Producer (AdaptTable) >>`,
    ...pageBodies,
    ...extras,
  ];
  const header = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3,
    0xcf, 0xd3, 0x0a,
  ]);
  const chunks: Uint8Array[] = [header];
  const offsets = [0];
  let offset = header.byteLength;
  objects.forEach((body, index) => {
    const bytes = concatBytes([
      ascii(`${String(index + 1)} 0 obj\n`),
      typeof body === "string" ? ascii(body) : body,
      ascii("\nendobj\n"),
    ]);
    offsets.push(offset);
    chunks.push(bytes);
    offset += bytes.byteLength;
  });
  let xref = `xref\n0 ${String(objects.length + 1)}\n`;
  xref += xrefLine(0, 65535, false);
  for (let i = 1; i < offsets.length; i++) {
    xref += xrefLine(offsets[i] ?? 0, 0, true);
  }
  const trailer =
    `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R ` +
    `/Info 5 0 R >>\nstartxref\n${String(offset)}\n%%EOF\n`;
  chunks.push(ascii(xref), ascii(trailer));
  return concatBytes(chunks);
}

function makeContext(
  table: ExportTable,
  box: PageBox,
  rtl: boolean,
  face: TextFace
): DrawContext {
  const usable = box.width - MARGIN * 2;
  const widths = columnWidths(table, usable);
  return {
    box,
    colWidths: widths,
    colXs: columnXs(widths, MARGIN, rtl),
    rtl,
    face,
  };
}

function faceFor(font: PdfWriterOptions["font"]): TextFace {
  return font === undefined ? standardFace() : embeddedFace(parseSfnt(font));
}

function pdfBytes(
  table: ExportTable,
  options: PdfWriterOptions
): Uint8Array<ArrayBuffer> {
  const box = pageBox(options.pageSize);
  const rtl = resolvePrintDirection(options.direction) === "rtl";
  const face = faceFor(options.font);
  const ctx = makeContext(table, box, rtl, face);
  const pages = paginate(
    table.rows.length,
    table.rowMeta,
    box,
    options.pageBreak,
    Boolean(options.title)
  );
  const streams = pages.map((rows, index) =>
    pageStream(table, rows, ctx, {
      title: index === 0 ? options.title : undefined,
      page: index + 1,
      pageCount: pages.length,
    })
  );
  return compilePdf(options.title ?? "Table", streams, box, face);
}

function titleFromFilename(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, "");
  return stem === "" ? filename : stem;
}

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
    columns: readonly ColumnDef<TRow>[];
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

/** The MIME type every reader registers for `.pdf`. */
const PDF_MIME = "application/pdf";

/**
 * The PDF writer, for the `exportCsv` prop's `writer` option:
 *
 * ```tsx
 * import { pdfWriter } from "@adapttable/core/pdf";
 *
 * <DataTable exportCsv={{ writer: pdfWriter(), scope: "selected" }} … />
 * ```
 *
 * Every scope works unchanged — page, all, selected, range, and any
 * column subset — because the scope is resolved before a writer is asked
 * for anything. This is the production default for a downloaded PDF.
 * Print (Unicode, RTL chrome, the browser's own page breaks) is
 * {@link openPrintLayout}, not a writer: `downloadExportFile` cannot
 * open a dialog.
 *
 * @param options - Title, direction, paper and page-break behaviour.
 * @returns A writer to hand to `exportCsv`.
 *
 * @public
 */
export function pdfWriter(options?: PdfWriterOptions): ExportWriter {
  return {
    extension: "pdf",
    build: ({ table, filename }) => ({
      parts: [
        pdfBytes(table, {
          ...options,
          title: options?.title ?? titleFromFilename(filename),
          direction: options?.direction,
        }),
      ],
      mimeType: PDF_MIME,
      text: "",
    }),
  };
}
