/**
 * The separators a pivot's composite keys are built from, and the builders that
 * use them.
 *
 * A dimension label is arbitrary data — a team can be called "A / B" or
 * "Q1-Q2" — so any printable separator could turn up inside one and split a key
 * in the wrong place. Control characters cannot appear in a rendered label,
 * which makes them the only safe choice; they are written as escapes so they
 * are visible in this file rather than invisible in it.
 *
 * They live in a module of their own because three files build or read the same
 * keys: the local engine, the server translator whose keys must match it
 * exactly, and the URL codec, which takes a collapse key apart to write it into
 * a link. Kept private to one of those files, the bytes get copied into the
 * others as literal characters — and a source file carrying a raw NUL is a file
 * git treats as binary: no diff, no blame, nothing to review.
 *
 * Nothing here is exported from an entry point. What a key looks like inside is
 * not a promise to anyone; `PIVOT_GRAND_TOTAL_KEY` is the one value a host
 * compares against, and it is re-exported from the engine.
 */

/** Between the values of one dimension path. */
export const PATH_SEP = "\u0000";
/** Between a column path and the measure rendered in it. */
export const MEASURE_SEP = "\u0001";
/** In front of a key that stands for a total rather than a real path. */
export const TOTAL_PREFIX = "\u0002";

/**
 * The key of the grand-total line, distinct from every real row path.
 *
 * @internal
 */
export const PIVOT_GRAND_TOTAL_KEY = `${TOTAL_PREFIX}grand`;

/** A stable key for a dimension path. */
export function pivotPathKey(path: readonly string[]): string {
  return path.join(PATH_SEP);
}

/** A rendered column's key: where it sits, and what it shows. */
export function pivotLeafKey(
  path: readonly string[],
  measureKey: string
): string {
  return `${pivotPathKey(path)}${MEASURE_SEP}${measureKey}`;
}

/** The grand-total column's key for one measure. */
export function pivotTotalLeafKey(measureKey: string): string {
  return `${TOTAL_PREFIX}total${MEASURE_SEP}${measureKey}`;
}
