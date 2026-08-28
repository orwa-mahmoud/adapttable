/**
 * Formula columns as a URL parameter — the encoding on its own, without the
 * hook that keeps it in sync.
 *
 * A typed formula is the most expensive table state there is to reproduce by
 * hand, because it is not a choice among things the table offers: it is text
 * somebody wrote. It sits in the URL beside sort, filters and the pivot for
 * exactly that reason, and a [saved view](../url/useSavedViews.ts) captures it
 * with the rest.
 *
 * The encoding is one entry per column, `key:formula` (plus `:header` when the
 * header is not the key), entries joined by `;`, every field percent-encoded so
 * a formula may itself contain the delimiters:
 * `formula=total:quantity%20*%20unitPrice:Total`.
 *
 * **Nothing here parses or evaluates a formula.** Reading a URL produces
 * `FormulaColumnSpec`s and stops — the text stays text until the engine is
 * asked for a value, which is the same rule the parser exists to keep. A codec
 * that "checked" a formula by running it would have handed the page to whoever
 * sent the link, in the one place that is easiest to do and hardest to notice.
 *
 * A `format` function cannot travel: a function has no URL form. The entry
 * still travels — the formula computes the same value either way, so the link
 * loses the presentation and keeps the column, unlike a pivot's custom
 * aggregator, where the function IS the computation.
 *
 * The codec lives apart from {@link ./useFormulaUrlState} because the two ends
 * of a shared link do not run in the same place: the table writes the parameter
 * in a browser, and a route handler reads it in Node. Keeping the reading half
 * free of React is what lets `@adapttable/core/query` decode the same string a
 * backend never renders.
 */
import type { FormulaColumnSpec } from "./formulaColumn";

/**
 * How many formula columns one URL may describe.
 *
 * A URL is hostile input, and a formula column is work per row rather than a
 * flag: a hand-edited parameter naming two hundred of them would be a page
 * that renders once, slowly, for no reason anyone asked for. The limit is the
 * same kind of clamp the column-layout codec puts on a width.
 */
const MAX_FORMULA_COLUMNS = 24;

/**
 * Decode one field, tolerating the malformed input a hand-edited URL brings.
 *
 * Local rather than shared with `url/serialize`: this module deliberately
 * imports nothing at runtime, because it is one of the two files a backend can
 * read a shared link with in a process where React is not installed.
 */
function decodeField(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Write formula columns as a URL parameter value.
 *
 * @param specs - The columns to serialize, in the order to show them.
 * @returns The parameter value, or `""` when there is nothing to say.
 *
 * @internal
 */
export function serializeFormulaColumns(
  specs: readonly FormulaColumnSpec[]
): string {
  const parts: string[] = [];
  for (const spec of specs) {
    const key = spec.key.trim();
    const formula = spec.formula.trim();
    // A column with no key or no formula is not a column. Writing it would
    // produce a link that reads back as one entry fewer than it looks.
    if (key === "" || formula === "") continue;
    const head = `${encodeURIComponent(key)}:${encodeURIComponent(formula)}`;
    const header = spec.header?.trim();
    parts.push(
      header === undefined || header === "" || header === key
        ? head
        : `${head}:${encodeURIComponent(header)}`
    );
  }
  return parts.slice(0, MAX_FORMULA_COLUMNS).join(";");
}

/**
 * Read formula columns back from a URL parameter value.
 *
 * A malformed entry is dropped rather than thrown: a URL is user input, and a
 * hand-edited one should degrade to the columns it still describes instead of
 * an error page. The formula text is carried through untouched and unparsed.
 *
 * @param raw - The parameter value.
 * @returns The columns it describes, in order, each key appearing once.
 *
 * @internal
 */
export function deserializeFormulaColumns(
  raw: string | null
): FormulaColumnSpec[] {
  if (!raw) return [];
  const specs: FormulaColumnSpec[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(";")) {
    const fields = part.split(":");
    // Two fields, or three with a header. Anything else is an entry whose
    // delimiters were not written by this codec, and guessing which field is
    // the formula is how a link starts computing something else.
    if (fields.length < 2 || fields.length > 3) continue;
    const key = decodeField(fields[0] ?? "").trim();
    const formula = decodeField(fields[1] ?? "").trim();
    if (key === "" || formula === "") continue;
    // First entry wins: two columns under one key is one column shadowing the
    // other, and which one won would depend on render order.
    if (seen.has(key)) continue;
    seen.add(key);
    const header = fields.length === 3 ? decodeField(fields[2]!).trim() : "";
    specs.push({ key, formula, ...(header === "" ? {} : { header }) });
    if (specs.length === MAX_FORMULA_COLUMNS) break;
  }
  return specs;
}
