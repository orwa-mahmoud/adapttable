/**
 * The totals that are not data rows, written once for React, Vue and
 * Angular: a pinned team total above the body and a grand total below it,
 * and a full-width note that travels with the row it is attached to.
 */
import { budget, type Person, summaryPerson } from "../people";

/** Every row's budget added up: what the pinned totals show. */
export function budgetTotalOf(rows: readonly Person[]): number {
  return rows.reduce((sum, row) => sum + budget(row), 0);
}

/**
 * The pinned summary rows: host-owned totals the page sums from the rows it
 * already owns. Numeric ids keep the showcase's derived cells defined.
 *
 * @param total - The budget the totals show.
 * @returns The rows above and below the body.
 */
export function pinnedTotals(total: number): {
  readonly top: Person[];
  readonly bottom: Person[];
} {
  return {
    top: [{ ...summaryPerson("901", "Team total"), budget: total }],
    bottom: [{ ...summaryPerson("902", "Grand total"), budget: total }],
  };
}

/**
 * A full-width note in front of one row: it moves with that row when the
 * row is dragged or pinned.
 *
 * @param anchorId - The id of the row the note sits in front of.
 * @param anchorName - That row's name, as the note reads it.
 * @returns The extra row.
 */
export function attachedNote(
  anchorId: string,
  anchorName: string
): {
  readonly key: string;
  readonly kind: "fullWidth";
  readonly beforeRowId: string;
  readonly render: () => string;
} {
  return {
    key: "note",
    kind: "fullWidth",
    beforeRowId: anchorId,
    render: () =>
      `Full-width extra attached to ${anchorName}. Drag or pin them — this note stays in front of them.`,
  };
}
