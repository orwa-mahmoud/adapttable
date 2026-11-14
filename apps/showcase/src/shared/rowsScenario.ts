/**
 * The rows page, written once for React, Vue and Angular: teammates
 * clustered so a Team cell can merge down its run, and the rows a reader
 * adds, duplicates and deletes. The table asks; the page owns the list.
 */
import { PEOPLE, type Person } from "../people";

/** Cluster teammates so a Team row-span has a consecutive run to cover. */
export function orderPeopleByTeam(rows: readonly Person[]): Person[] {
  return [...rows].sort((a, b) => {
    const byTeam = a.team.localeCompare(b.team);
    if (byTeam !== 0) return byTeam;
    return Number(a.id) - Number(b.id);
  });
}

/**
 * How many following rows share this row's team. 1 when this row is not
 * the start of the run in this list — the origin already covers them.
 * Pass visual body order, so pinning a teammate keeps one merge instead of
 * splitting a team into two cells.
 *
 * @param rows - The rows in the order they are drawn.
 * @param index - The row to measure from.
 * @returns The run's length.
 */
export function consecutiveTeamSpan(
  rows: readonly Person[],
  index: number
): number {
  const current = rows[index];
  if (!current) return 1;
  if (rows[index - 1]?.team === current.team) return 1;
  let span = 1;
  while (rows[index + span]?.team === current.team) span += 1;
  return span;
}

/**
 * Merge Team down a run of teammates; Person and Email stay their own cells.
 *
 * @returns The cell's row span, or undefined to draw it alone.
 */
export function teamSpan({
  column,
  sectionRows,
  sectionRowIndex,
}: {
  readonly column: { readonly key: string };
  readonly sectionRows: readonly Person[];
  readonly sectionRowIndex: number;
}): { readonly rowSpan: number } | undefined {
  if (column.key !== "team") return undefined;
  const span = consecutiveTeamSpan(sectionRows, sectionRowIndex);
  return span > 1 ? { rowSpan: span } : undefined;
}

/** The next free id, so an added row never collides with a seeded one. */
export function nextPersonId(rows: readonly Person[]): string {
  return String(
    rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
  );
}

/** A blank person to fill in: the row an Add starts from. */
export function blankPerson(rows: readonly Person[]): Person {
  return {
    id: nextPersonId(rows),
    name: "",
    email: "",
    role: "",
    team: PEOPLE[0]?.team ?? "",
    nameAr: "",
    roleAr: "",
    teamAr: "",
  };
}

/**
 * The rows after an Add on a page without editing: a blank person on top,
 * named so the reader can find it.
 */
export const withAddedPerson = (rows: readonly Person[]): Person[] => [
  { ...blankPerson(rows), name: "New person", nameAr: "شخص جديد" },
  ...rows,
];

/** The rows after a Duplicate: a copy of the row on top. */
export const withDuplicatedPerson = (
  rows: readonly Person[],
  row: Person
): Person[] => [{ ...row, id: nextPersonId(rows) }, ...rows];

/** The rows after a Delete. */
export const withoutPerson = (rows: readonly Person[], row: Person): Person[] =>
  rows.filter((current) => current.id !== row.id);
