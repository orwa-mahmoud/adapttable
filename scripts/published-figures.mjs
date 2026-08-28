/**
 * Read the size figures a documentation page publishes.
 *
 * A bundle budget is a ceiling, so a fixture can sit under one for months
 * while the sentence beside it drifts — which is how `~51 kB` outlived a
 * 134 KB measurement. `bundle-budget.mjs` uses this to compare what the pages
 * say against what it just measured, so the two cannot part company.
 */
import { readFileSync } from "node:fs";

/**
 * The one figure written just before a `kB` at `unitAt` — `[18]`, or
 * `[127, 140]` for a range.
 *
 * A backwards scan rather than a pattern: the shapes in the docs — `~18 kB`,
 * `~127–140 kB`, `1.6 KB parser` — need an optional range beside an optional
 * tilde, and every regex that expressed that cleanly backtracked.
 *
 * @param text - The line the unit appears on.
 * @param unitAt - Index of the `k` in that line's `kB`.
 * @returns The numbers, low end first; empty when no digits precede the unit.
 */
export function figureBefore(text, unitAt) {
  let end = unitAt;
  while (end > 0 && text[end - 1] === " ") end -= 1;
  const found = [];
  while (end > 0) {
    let digits = end;
    while (digits > 0 && "0123456789.".includes(text[digits - 1])) digits -= 1;
    if (digits === end) break;
    found.unshift(Number(text.slice(digits, end)));
    // A range reads `127–140`, sometimes with a tilde on the low end. Step
    // over the separator and keep reading; anything else ends this figure.
    const tilde = text[digits - 1] === "~" ? digits - 1 : digits;
    if (tilde === 0 || (text[tilde - 1] !== "–" && text[tilde - 1] !== "-")) {
      break;
    }
    end = tilde - 1;
  }
  return found;
}

/**
 * Every `kB` figure on a line, in reading order.
 *
 * @param text - The line, plus its continuation when a figure can wrap.
 * @returns The numbers, a range contributing both ends.
 */
export function figuresIn(text) {
  const lower = text.toLowerCase();
  const figures = [];
  for (let i = lower.indexOf("kb"); i !== -1; i = lower.indexOf("kb", i + 2)) {
    figures.push(...figureBefore(text, i));
  }
  return figures;
}

/**
 * Every `kB` figure on the line of `file` starting with `find`.
 *
 * @param file - Absolute path to the page.
 * @param find - The start of the line carrying the figure.
 * @returns The figures, or `null` when no line starts with `find` — a page
 * reworded around a published number is as stale as a wrong one.
 */
export function publishedFigures(file, find) {
  const lines = readFileSync(file, "utf8").split("\n");
  const at = lines.findIndex((l) => l.startsWith(find));
  if (at === -1) return null;
  // A prose figure can wrap to the next line; a table row cannot.
  const text = find.startsWith("|")
    ? lines[at]
    : `${lines[at]} ${lines[at + 1] ?? ""}`;
  return figuresIn(text);
}
