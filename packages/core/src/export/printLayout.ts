/**
 * What a printer (or "Save as PDF") should see: the current view, as HTML.
 *
 * A downloaded `.pdf` is a file. Print is a different verb — column widths,
 * group structure, page breaks, Unicode and RTL are all things the browser
 * already does well, and a hand-written PDF cannot match them without
 * embedding a font. This module is that path: a self-contained document the
 * host can hand to `window.print()`, or embed in its own page.
 *
 * Values resolve exactly as they do for CSV and XLSX — the caller passes an
 * {@link ExportTable} — so three formats of the same table cannot disagree
 * about what a cell contains.
 */
import type { ColumnDef } from "../types";
import { isBrowser } from "../utils/env";
import {
  buildExportTable,
  type ExportTable,
  type ExportViewEntry,
} from "./exportWriter";

/** Paper the print stylesheet asks the browser for. */
export type PrintPageSize =
  "a4" | "a4-landscape" | "letter" | "letter-landscape";

/** How groups meet a page boundary. */
export type PrintPageBreak = "auto" | "group";

/**
 * Options for the printable document and the print dialog.
 *
 * @public
 */
export interface PrintLayoutOptions {
  /** Document title and table caption. */
  title?: string;
  /** Visible caption when it should differ from {@link PrintLayoutOptions.title}. */
  caption?: string;
  /** `lang` on `<html>` when the host knows it. */
  lang?: string;
  /**
   * Layout direction. Omit it and a browser document inherits
   * `document.documentElement.dir`, so print matches what the reader sees.
   */
  direction?: "ltr" | "rtl";
  /**
   * Paper size. Defaults to A4 landscape — tables are wide, and a portrait
   * page clips columns a landscape one still holds.
   */
  pageSize?: PrintPageSize;
  /**
   * `"auto"` (default) keeps a group together when it fits and never forces
   * a page per group. `"group"` starts each top-level group on a new page.
   */
  pageBreak?: PrintPageBreak;
  /**
   * A font for the printed document, as the file's bytes.
   *
   * The browser already has fonts and shapes text with them, so print
   * needs nothing here to render Arabic or Chinese correctly — unlike the
   * PDF writer's `font` option, which is what makes those scripts
   * possible at all in a downloaded file. Supply it when the printed page
   * has to match the PDF exactly, or when the machine doing the printing
   * cannot be assumed to have a face for the script.
   *
   * It is embedded whole, as an `@font-face` the document carries with
   * it. Nothing is subset: the browser needs every glyph it might shape.
   */
  font?: Uint8Array | ArrayBuffer;
}

/**
 * The direction the print document should use.
 *
 * An explicit value wins. Otherwise a browser inherits the page's `dir`,
 * which is what the reader is looking at; outside a window the fallback is
 * `"ltr"` rather than guessing.
 */
export function resolvePrintDirection(
  direction?: "ltr" | "rtl"
): "ltr" | "rtl" {
  if (direction === "rtl" || direction === "ltr") return direction;
  if (!isBrowser()) return "ltr";
  return document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
}

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

/**
 * Strip what a table cell cannot carry: control characters. Tab, newline
 * and carriage return become a space so a cell stays one line.
 */
function safeText(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "\t" || ch === "\n" || ch === "\r") out += " ";
    else if (ch >= " ") out += ch;
  }
  return out;
}

/** A cell as the print document and the PDF both show it. */
export function exportCellText(value: unknown): string {
  if (typeof value === "string") return safeText(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    if (isDateOnly(value)) return value.toISOString().slice(0, 10);
    return value.toISOString().slice(0, 16).replace("T", " ");
  }
  return "";
}

/** Escape the five characters HTML cannot carry literally. */
function html(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageSizeCss(size: PrintPageSize = "a4-landscape"): string {
  if (size === "letter") return "letter portrait";
  if (size === "letter-landscape") return "letter landscape";
  if (size === "a4") return "A4 portrait";
  return "A4 landscape";
}

function colPercents(table: ExportTable): number[] {
  const count = table.headers.length;
  if (count === 0) return [];
  const weights = table.headers.map((_, index) => {
    const stated = table.widths?.[index];
    return stated !== undefined && stated > 0 ? stated : 12;
  });
  const sum = weights.reduce((total, weight) => total + weight, 0);
  return weights.map((weight) => (100 * weight) / sum);
}

function colGroup(table: ExportTable): string {
  const percents = colPercents(table);
  const cols = percents.map((percent, index) => {
    const stated = table.widths?.[index];
    const ch = stated !== undefined ? ` data-ch="${String(stated)}"` : "";
    const width = (Math.round(percent * 100) / 100).toString();
    return `<col${ch} style="width:${width}%"/>`;
  });
  return cols.length > 0 ? `<colgroup>${cols.join("")}</colgroup>` : "";
}

function firstCellTag(
  role: string,
  column: number
): {
  tag: "th" | "td";
  scope: string;
} {
  if (column === 0 && role === "group") {
    return { tag: "th", scope: ' scope="row"' };
  }
  return { tag: "td", scope: "" };
}

function cellHtml(
  value: unknown,
  column: number,
  role: string,
  level: number
): string {
  const { tag, scope } = firstCellTag(role, column);
  const indent =
    column === 0 && level > 0
      ? ` style="padding-inline-start:${String(6 + level * 16)}pt"`
      : "";
  return `<${tag}${scope}${indent}>${html(exportCellText(value))}</${tag}>`;
}

function dataRow(
  table: ExportTable,
  row: readonly unknown[],
  index: number
): string {
  const meta = table.rowMeta?.[index];
  const role = meta?.role ?? "data";
  const level = meta?.level ?? 0;
  const cells = row
    .map((value, column) => cellHtml(value, column, role, level))
    .join("");
  return `<tr data-role="${role}" data-level="${String(level)}">${cells}</tr>`;
}

function flushGroup(
  chunks: string[],
  rows: string,
  level: number,
  open: boolean
): boolean {
  if (!open) return false;
  chunks.push(
    `<tbody class="print-group" data-level="${String(level)}">${rows}</tbody>`
  );
  return true;
}

/**
 * One `<tbody>` per group so `break-inside: avoid` can keep a header with
 * its leaves. A flat table is a single body. Tree rows (all `data`, with
 * a level) stay in one body and indent instead.
 */
function tableBodies(table: ExportTable): string {
  const meta = table.rowMeta;
  if (!meta) {
    const rows = table.rows
      .map((row, index) => dataRow(table, row, index))
      .join("");
    return `<tbody>${rows}</tbody>`;
  }
  const chunks: string[] = [];
  let rows = "";
  let level = 0;
  let open = false;
  table.rows.forEach((row, index) => {
    const role = meta[index]?.role ?? "data";
    const rowLevel = meta[index]?.level ?? 0;
    if (role === "group") {
      if (flushGroup(chunks, rows, level, open)) {
        rows = "";
        open = false;
      }
      level = rowLevel;
    } else if (!open) {
      level = rowLevel;
    }
    rows += dataRow(table, row, index);
    open = true;
  });
  flushGroup(chunks, rows, level, open);
  return chunks.join("");
}

function headerRow(table: ExportTable): string {
  const cells = table.headers
    .map((text) => `<th scope="col">${html(text)}</th>`)
    .join("");
  return `<tr>${cells}</tr>`;
}

/**
 * A font file as a `data:` URL.
 *
 * The bytes are turned into a string in chunks: spreading a whole font
 * into `String.fromCodePoint` is hundreds of thousands of arguments in one
 * call, which overflows the stack on every engine.
 */
function fontDataUrl(font: Uint8Array | ArrayBuffer): string {
  const bytes = font instanceof Uint8Array ? font : new Uint8Array(font);
  const CHUNK = 0x8000;
  let binary = "";
  for (let at = 0; at < bytes.byteLength; at += CHUNK) {
    binary += String.fromCodePoint(...bytes.subarray(at, at + CHUNK));
  }
  return `data:font/ttf;base64,${btoa(binary)}`;
}

/**
 * The print stylesheet: repeating headers, row/group keep-together, and
 * column widths the table already decided.
 *
 * @param options - Paper size, page-break behaviour, and a font to embed.
 * @returns A CSS string, ready for a `<style>` element.
 *
 * @public
 */
export function printStyles(options?: PrintLayoutOptions): string {
  const paper = pageSizeCss(options?.pageSize);
  const face = options?.font
    ? "@font-face{font-family:AdaptTablePrint;font-display:block;" +
      `src:url(${fontDataUrl(options.font)}) format("truetype")}`
    : "";
  const family = options?.font ? "AdaptTablePrint," : "";
  const groupBreak =
    options?.pageBreak === "group"
      ? 'table.adapttable-print-break-group tbody.print-group[data-level="0"] + tbody.print-group[data-level="0"]{break-before:page;page-break-before:always}'
      : "";
  return (
    face +
    `@page{size:${paper};margin:12mm}` +
    "html,body{margin:0;padding:0;background:#fff;color:#111;" +
    `font:11pt/1.35 ${family}` +
    'system-ui,-apple-system,"Segoe UI",sans-serif}' +
    "table.adapttable-print{width:100%;border-collapse:collapse;" +
    "table-layout:fixed}" +
    "table.adapttable-print caption{caption-side:top;text-align:start;" +
    "font-size:14pt;font-weight:650;margin:0 0 12pt}" +
    "table.adapttable-print thead{display:table-header-group}" +
    "table.adapttable-print th,table.adapttable-print td{" +
    "border:0.4pt solid #bbb;padding:4pt 6pt;vertical-align:top;" +
    "overflow:hidden;word-wrap:break-word;text-align:start}" +
    "table.adapttable-print th{font-weight:650;background:#f0f0f0}" +
    "table.adapttable-print tr{break-inside:avoid;page-break-inside:avoid}" +
    'table.adapttable-print tr[data-role="group"]{break-after:avoid;' +
    "page-break-after:avoid;font-weight:650;background:#f7f7f7}" +
    'table.adapttable-print tr[data-role="aggregate"]{break-before:avoid;' +
    "page-break-before:avoid;font-weight:650}" +
    "table.adapttable-print tbody.print-group{break-inside:avoid;" +
    "page-break-inside:avoid}" +
    groupBreak
  );
}

/**
 * The table element alone — for a host that already has a page and a
 * stylesheet, and only needs the rows.
 *
 * @public
 */
export function buildPrintTableHtml(
  table: ExportTable,
  options?: PrintLayoutOptions
): string {
  const captionText = options?.caption ?? options?.title;
  const caption = captionText ? `<caption>${html(captionText)}</caption>` : "";
  const breakClass =
    options?.pageBreak === "group" ? " adapttable-print-break-group" : "";
  return (
    `<table class="adapttable-print${breakClass}">` +
    caption +
    colGroup(table) +
    `<thead>${headerRow(table)}</thead>` +
    tableBodies(table) +
    "</table>"
  );
}

/**
 * A complete HTML document: doctype, direction, the print stylesheet, and
 * the table. This is what {@link openPrintLayout} loads into the iframe.
 *
 * @public
 */
export function buildPrintDocument(
  table: ExportTable,
  options?: PrintLayoutOptions
): string {
  const direction = resolvePrintDirection(options?.direction);
  const title = options?.title ?? "Table";
  const lang = options?.lang ? ` lang="${html(options.lang)}"` : "";
  return (
    "<!DOCTYPE html>" +
    `<html${lang} dir="${direction}">` +
    '<head><meta charset="utf-8"/>' +
    `<title>${html(title)}</title>` +
    `<style>${printStyles(options)}</style></head>` +
    `<body>${buildPrintTableHtml(table, options)}</body></html>`
  );
}

/**
 * Open the browser print dialog on the current view.
 *
 * A hidden iframe holds the document so the host page is not rewritten and
 * a popup blocker never sees a window. No-op outside a browser, so a
 * server render that reaches this does nothing rather than throwing.
 *
 * @public
 */
export function openPrintLayout(
  table: ExportTable,
  options?: PrintLayoutOptions
): void {
  if (!isBrowser()) return;
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", options?.title ?? "Print");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.insetInlineEnd = "0";
  iframe.style.insetBlockEnd = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  const cleanup = () => {
    iframe.remove();
  };
  iframe.addEventListener("load", () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }
    frameWindow.addEventListener("afterprint", cleanup);
    frameWindow.focus();
    frameWindow.print();
  });
  iframe.srcdoc = buildPrintDocument(table, options);
  document.body.appendChild(iframe);
}

/**
 * Print rows and columns the same way the PDF builder writes a file:
 * resolve once, then open the dialog.
 *
 * @public
 */
export function printTable<TRow>(
  options: {
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    view?: readonly ExportViewEntry<TRow>[];
    summary?: Readonly<Partial<Record<string, unknown>>>;
  } & PrintLayoutOptions
): void {
  openPrintLayout(
    buildExportTable(options.rows, options.columns, {
      view: options.view,
      summary: options.summary,
    }),
    options
  );
}
