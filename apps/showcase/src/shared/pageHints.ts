/**
 * What the selection, rows, column-group, nested-table and accessibility
 * pages tell the reader,
 * and the accessibility page's transcript, written once for React, Vue and
 * Angular.
 */

/** The selection page's hints, in order. */
export const SELECTION_HINTS: readonly string[] = [
  "the header box takes the whole page",
  "selection survives paging — it is a set of ids",
  "bulk actions run over the selection",
];

/** The rows page's hints, in order. */
export const ROWS_HINTS: readonly string[] = [
  "pin a row to the top or the floor of the scroll box",
  "Team is written once down consecutive teammates",
  "the 3-dot menu is add, duplicate, delete, pin",
];

/** The column-groups page's hints, in order. */
export const COLUMN_GROUP_HINTS: readonly string[] = [
  "Contact folds to a chevron, Assignment keeps Team, Delivery shows budget and the 35-day span",
  "groups start open — collapse one to see its mode",
];

/** The nested-tables page's hints, in order. */
export const NESTED_HINTS: readonly string[] = [
  "first row is open — the panel is another table, same kit",
  "orders have their own columns and row keys",
  "the inner table does not write the URL",
];

/** The accessibility page's hints, in order. */
export const ACCESSIBILITY_HINTS: readonly string[] = [
  "Tab into the grid, then arrow between cells",
  "Home / End jump to the row's edges",
  "every announcement appears in the transcript",
  "hover a header to select its whole column",
  "focus, selection and disabled stay visible in forced-colors — nothing is color-only",
];

/** The live regions a screen reader hears, as the transcript reads them. */
export const ANNOUNCEMENT_REGIONS =
  '[aria-live="polite"], [aria-live="assertive"], [role="status"]:not([aria-live="off"]), [role="alert"]:not([aria-live="off"])';

/** How many past announcements the transcript keeps on screen. */
export const TRANSCRIPT_LENGTH = 6;

/** The transcript's title and what it says before anything is announced. */
export const TRANSCRIPT_TEXT = {
  title: "Announced to a screen reader",
  empty:
    "Nothing yet — move through the grid and each announcement appears here as it is made.",
} as const;

/**
 * The announcements a table has made since the last reading: each live
 * region's text, newest first, skipping a message repeated back to back.
 *
 * @param root - The element holding the table.
 * @param last - The message read last, so a repeat is not listed twice.
 * @returns The new messages, newest first, and the latest message.
 */
export function readAnnouncements(
  root: ParentNode,
  last: string
): { readonly lines: readonly string[]; readonly last: string } {
  const lines: string[] = [];
  let latest = last;
  for (const region of root.querySelectorAll<HTMLElement>(
    ANNOUNCEMENT_REGIONS
  )) {
    const text = region.textContent?.trim() ?? "";
    if (text === "" || text === latest) continue;
    latest = text;
    lines.unshift(text);
  }
  return { lines, last: latest };
}
