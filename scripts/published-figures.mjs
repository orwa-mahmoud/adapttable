/**
 * Read the size figures a documentation page publishes.
 *
 * A bundle budget is a ceiling, so a fixture can sit under one for months
 * while the sentence beside it drifts — which is how `~51 kB` outlived a
 * 134 KiB measurement. `bundle-budget.mjs` uses this to compare what the pages
 * say against what it just measured, so the two cannot part company.
 */
import { readFileSync } from "node:fs";

/**
 * The one figure written just before a `KiB` at `unitAt` — `[18]`, or
 * `[127, 140]` for a range.
 *
 * A backwards scan rather than a pattern: the shapes in the docs — `~18 KiB`,
 * `~127–140 KiB`, `1.6 KiB parser` — need an optional range beside an optional
 * tilde, and every regex that expressed that cleanly backtracked.
 *
 * @param text - The line the unit appears on.
 * @param unitAt - Index of the `K` in that line's `KiB`.
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
 * Every `KiB` figure on a line, in reading order.
 *
 * `kB` and `KB` are not this unit. The budget divides by 1,024. A page that
 * prints either of those fails in {@link wrongByteUnit} instead of being read
 * as a matching figure.
 *
 * @param text - The line, plus its continuation when a figure can wrap.
 * @returns The numbers, a range contributing both ends.
 */
export function figuresIn(text) {
  const figures = [];
  for (let i = text.indexOf("KiB"); i !== -1; i = text.indexOf("KiB", i + 3)) {
    figures.push(...figureBefore(text, i));
  }
  return figures;
}

/**
 * True when `text` labels a size `kB` or `KB`.
 *
 * Those names are not KiB. `KiB` itself does not match.
 *
 * @param text - A documentation line.
 * @returns Whether the line uses the other unit.
 */
export function wrongByteUnit(text) {
  return /(?:^|[^\w])(?:kB|KB)(?!\w)/.test(text);
}

/**
 * Every `KiB` figure on the line of `file` starting with `find`.
 *
 * @param file - Absolute path to the page.
 * @param find - The start of the line carrying the figure.
 * @returns The figures, or `null` when no line starts with `find` — a page
 * reworded around a published number is as stale as a wrong one.
 */
export function publishedSizeText(file, find) {
  const lines = readFileSync(file, "utf8").split("\n");
  const at = lines.findIndex((l) => l.startsWith(find));
  if (at === -1) return null;
  // A prose figure can wrap to the next line; a table row cannot.
  return find.startsWith("|")
    ? lines[at]
    : `${lines[at]} ${lines[at + 1] ?? ""}`;
}

export function publishedFigures(file, find) {
  const text = publishedSizeText(file, find);
  if (text === null) return null;
  return figuresIn(text);
}

/** How many decimals a published figure is written to: `2.7` is one, `18` none. */
export function decimalsOf(figure) {
  return (String(figure).split(".")[1] ?? "").length;
}

/** `value` rounded the way a figure written to `decimals` places would be. */
export function roundTo(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/**
 * The figures a page should carry for these measurements.
 *
 * Each page picks its own precision — the adapter range reads `127–141 KiB`,
 * the pivot engine reads `1.5 KiB` — and is held to exactly that. Rounding
 * every figure to a whole KiB would make an accurate `1.5` wrong and demand a
 * less true `2` in its place; the rule that catches a stale number without
 * coarsening a good one is "the figure equals the measurement, at the
 * precision it is written to".
 *
 * No window either way. A tolerance is how a number drifts one KiB at a time
 * while every run stays green, and the pages promise the opposite: that
 * `pnpm budget` fails the build rather than let one quietly go stale.
 *
 * @param measuredKB - One or more measured sizes, in kibibytes.
 * @param decimals - Places to round to, per end of the range.
 * @returns `[n]`, or `[low, high]` when the ends differ once rounded.
 */
export function expectedFigures(measuredKB, decimals = [0, 0]) {
  const low = roundTo(Math.min(...measuredKB), decimals[0]);
  const high = roundTo(Math.max(...measuredKB), decimals[decimals.length - 1]);
  return low === high ? [low] : [low, high];
}

/**
 * Why a page's figures no longer match, or `null` when they do.
 *
 * Both ends of a range are checked, and each exactly: a correct low end does
 * not excuse a wrong high one.
 *
 * @param figures - What the page prints, from {@link publishedFigures}.
 * @param measuredKB - What this run measured, in kibibytes.
 * @returns A sentence naming the disagreement, or `null`.
 */
export function staleReason(figures, measuredKB) {
  const expected = expectedFigures(measuredKB, figures.map(decimalsOf));
  if (figures.length !== expected.length) {
    return `published ${figures.join("–") || "no figure"}, expected ${expected.join("–")} KiB`;
  }
  if (!expected.some((want, i) => figures[i] !== want)) return null;
  const ends = [Math.min(...measuredKB), Math.max(...measuredKB)];
  const shown = ends[0] === ends[1] ? [ends[0]] : ends;
  return (
    `published ${figures.join("–")} KiB, expected ${expected.join("–")} KiB ` +
    `(measured ${shown.map((n) => n.toFixed(1)).join("–")} KiB)`
  );
}
