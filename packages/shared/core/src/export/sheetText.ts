/**
 * The text rules a spreadsheet imposes: column letters, the characters XML
 * 1.0 can carry, and Excel's sheet-name limits. The XLSX writer and the
 * bindings both use them, so they live apart from the writer.
 */

/**
 * A column's spreadsheet letter: 0 → A, 25 → Z, 26 → AA.
 *
 * Base-26 with no zero digit, so the usual `% 26` loop is off by one without
 * the decrement — the bug that puts column 26 at "BA".
 *
 * @public
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
 * and carriage return, lone surrogates, and U+FFFE / U+FFFF. One such
 * character from a database makes the whole workbook unopenable, and the user
 * has no way to tell which cell did it.
 *
 * Written as a scan rather than a regex because the regex form needs a lint
 * suppression, and a rule worth silencing here is a rule worth not tripping.
 */
export function safeText(text: string): string {
  let out = "";
  for (const ch of text) {
    if (isXmlChar(ch.codePointAt(0) ?? 0)) out += ch;
  }
  return out;
}

/**
 * Whether XML 1.0 allows a code point: tab, newline, carriage return, and
 * U+0020–U+D7FF, U+E000–U+FFFD and U+10000–U+10FFFF. A lone surrogate
 * (U+D800–U+DFFF) and U+FFFE / U+FFFF are outside every range.
 */
function isXmlChar(point: number): boolean {
  if (point === 0x9 || point === 0xa || point === 0xd) return true;
  if (point >= 0x20 && point <= 0xd7ff) return true;
  if (point >= 0xe000 && point <= 0xfffd) return true;
  return point >= 0x10000 && point <= 0x10ffff;
}

/**
 * Excel's own rules for a sheet name: at most 31 characters and none of
 * `: \ / ? * [ ]`. A name that breaks them makes the whole file unopenable, so
 * it is corrected rather than passed through.
 */
export function safeSheetName(name: string): string {
  const cleaned = safeText(name)
    .replaceAll(/[:\\/?*[\]]/g, " ")
    .trim();
  return firstUnits(cleaned === "" ? "Sheet1" : cleaned, 31);
}

/**
 * The first `limit` UTF-16 units of `text`, never ending halfway through a
 * surrogate pair — half of one is a lone surrogate XML cannot carry.
 */
function firstUnits(text: string, limit: number): string {
  let out = "";
  for (const ch of text) {
    if (out.length + ch.length > limit) break;
    out += ch;
  }
  return out;
}
