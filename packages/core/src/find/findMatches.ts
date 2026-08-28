/**
 * Find in table — locating text without filtering it away.
 *
 * Search and find are different questions. The search box asks "show me only
 * the rows that match", and on a server tier it asks the server. Find asks
 * "where does this appear in what I am looking at", leaves every row where it
 * is, and walks the hits — which is what people mean when they press Ctrl+F.
 *
 * Matching reads what the cell SHOWS (`columnText`, the same resolution the
 * screen-reader announcements use), so a column that renders a formatted date
 * is searched by that date rather than by the ISO string underneath. Nothing
 * else would match what a person can see on screen.
 */
import { columnText } from "../columns/columnText";
import type { GridCell } from "../focus/gridFocus";
import type { ColumnDef } from "../types";

/**
 * What a find needs to know.
 *
 * @internal
 */
export interface FindMatchesOptions<TRow> {
  /** What to look for. An empty or blank query matches nothing. */
  query: string;
  /** The rows the browser holds, in table order. */
  rows: readonly TRow[];
  /** The columns as rendered — matches are addressed by their index. */
  columns: readonly ColumnDef<TRow>[];
  /** Where the rendered window starts in the dataset. Zero unless paged. */
  firstRowIndex?: number;
}

/**
 * Every cell whose text contains the query, in reading order.
 *
 * Case-insensitive, because nobody types the case of what they are looking
 * for. Only the LOADED rows are searched: a find cannot honestly claim a hit
 * in a row the browser has never seen, and saying "3 of 17" about rows that
 * are not there would be worse than saying nothing.
 *
 * @typeParam TRow - The row type.
 * @param options - See {@link FindMatchesOptions}.
 * @returns The matching cells, in absolute addresses.
 *
 * @internal
 */
export function findMatches<TRow>(
  options: FindMatchesOptions<TRow>
): GridCell[] {
  const { query, rows, columns, firstRowIndex = 0 } = options;
  const needle = query.trim().toLowerCase();
  if (needle === "") return [];

  const matches: GridCell[] = [];
  rows.forEach((row, index) => {
    columns.forEach((column, col) => {
      if (columnText(column, row).toLowerCase().includes(needle)) {
        matches.push({ row: firstRowIndex + index, col });
      }
    });
  });
  return matches;
}

/**
 * A cell address as a string, for set membership without a nested scan.
 *
 * @internal
 */
export function matchKey(cell: GridCell): string {
  return `${cell.row}:${cell.col}`;
}

/**
 * The match keys as a set, so a cell can ask "am I a match" in constant time.
 *
 * A table of 500 rows × 12 columns asks that question 6,000 times per render;
 * scanning an array each time is the difference between a find that feels
 * instant and one that stutters.
 *
 * @param matches - The matches, from {@link findMatches}.
 * @returns Their keys.
 *
 * @internal
 */
export function matchKeySet(matches: readonly GridCell[]): ReadonlySet<string> {
  return new Set(matches.map(matchKey));
}

/**
 * Step through the matches, wrapping at both ends.
 *
 * Wrapping is what a find does — reaching the last hit and pressing next
 * returns to the first, which is why a browser's find bar says "1 of 17"
 * again rather than stopping.
 *
 * @param index - Where the walk is now.
 * @param total - How many matches there are.
 * @param step - `1` for next, `-1` for previous.
 * @returns The next index, or `-1` when there is nothing to step through.
 *
 * @internal
 */
export function stepMatch(index: number, total: number, step: number): number {
  if (total === 0) return -1;
  return (((index + step) % total) + total) % total;
}
