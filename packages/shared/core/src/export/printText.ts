/**
 * Cell text and direction, as the print document and the PDF both show them.
 *
 * The PDF writer loads on demand, so this module imports nothing from the
 * table: a lazy chunk that reached into the table's own modules would make a
 * bundler split them out to share.
 */

/**
 * The direction the print document should use.
 *
 * An explicit value wins. Otherwise a browser inherits the page's `dir`,
 * which is what the reader is looking at; without a document the fallback is
 * `"ltr"` rather than guessing.
 */
export function resolvePrintDirection(
  direction?: "ltr" | "rtl"
): "ltr" | "rtl" {
  if (direction === "rtl" || direction === "ltr") return direction;
  const root = (globalThis as { document?: Document }).document
    ?.documentElement;
  if (root === undefined) return "ltr";
  return root.getAttribute("dir") === "rtl" ? "rtl" : "ltr";
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
