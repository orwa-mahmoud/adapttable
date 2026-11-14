/**
 * The rows and row-reordering pages, written once for React, Vue and
 * Angular: teammates clustered so a Team cell can merge down its run, the
 * rows a reader adds, duplicates and deletes, and where a moved row lands in
 * a flat, grouped or tree list. The table asks; the page owns the list.
 */
import { applyRowReorder, type RowGroupRef } from "@adapttable/core";

import { PEOPLE, type Person, reportsTo } from "../people";

/**
 * The rows page's scroll box height: the whole cast scrolls inside it, so a
 * pinned row is seen to stay put while the rest move under it.
 */
export const ROWS_PAGE_HEIGHT = 420;

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

/** How the reordering page lays its rows out. */
export type ReorderShape = "flat" | "grouped" | "tree";

/** The shapes, in the order the page offers them. */
export const REORDER_SHAPES: readonly {
  readonly value: ReorderShape;
  readonly label: string;
}[] = [
  { value: "flat", label: "Flat" },
  { value: "grouped", label: "Grouped" },
  { value: "tree", label: "Tree" },
];

/** What the reordering page tells the reader, in order. */
export const REORDER_HINTS: readonly string[] = [
  "Space lifts, arrows move, Space drops",
  "a drop opens the kit confirm menu",
  "the host writes — the table never owns the array",
];

/** The shape a table's grouping and tree flags describe. */
export function reorderShapeOf(
  grouping: boolean | undefined,
  tree: boolean | undefined
): ReorderShape {
  if (grouping) return "grouped";
  return tree ? "tree" : "flat";
}

/** Whether two rows move among the same siblings in `shape`. */
function sameReorderScope(
  candidate: Person,
  row: Person,
  shape: ReorderShape
): boolean {
  if (shape === "grouped") {
    return candidate.team === row.team && candidate.status === row.status;
  }
  if (shape === "tree") return reportsTo(candidate) === reportsTo(row);
  return true;
}

/**
 * The list after a row moves among its siblings: its group in a grouped
 * list, the people sharing its manager in a tree, everyone in a flat list.
 *
 * @param rows - The list.
 * @param from - The row's place among its siblings.
 * @param to - Where it lands among them.
 * @param row - The row that moved.
 * @param shape - How the list is laid out.
 * @returns The new list.
 */
export function reorderPeople(
  rows: readonly Person[],
  from: number,
  to: number,
  row: Person,
  shape: ReorderShape
): readonly Person[] {
  const sameScope = (candidate: Person) =>
    sameReorderScope(candidate, row, shape);
  const siblings = rows.filter(sameScope);
  const source = siblings.findIndex((candidate) => candidate.id === row.id);
  const reordered = applyRowReorder(siblings, source < 0 ? from : source, to);
  let siblingIndex = 0;
  return rows.map((candidate) => {
    if (!sameScope(candidate)) return candidate;
    const replacement = reordered[siblingIndex];
    siblingIndex += 1;
    return replacement ?? candidate;
  });
}

/** Where a row lands: before the destination at `position`, else after the last. */
function insertionIndex(
  destinations: readonly number[],
  position: number,
  fallback: number
): number {
  if (position >= 0 && position < destinations.length) {
    return destinations[position] ?? fallback;
  }
  return (destinations.at(-1) ?? fallback - 1) + 1;
}

/**
 * The list after a row moves into another group: it takes that group's
 * values and lands at `position` among its rows.
 */
export function withPersonMovedToGroup(
  rows: readonly Person[],
  row: Person,
  group: RowGroupRef,
  position: number
): Person[] {
  const remaining = rows.filter((candidate) => candidate.id !== row.id);
  const changes = Object.fromEntries(
    group.levels.map((level) => [level.key, level.value])
  );
  const moved: Person = Object.assign({}, row, changes);
  const destinations = remaining.flatMap((candidate, index) =>
    group.levels.every(
      (level) => Reflect.get(candidate, level.key) === level.value
    )
      ? [index]
      : []
  );
  const next = remaining.slice();
  next.splice(
    insertionIndex(destinations, position, remaining.length),
    0,
    moved
  );
  return next;
}

/**
 * The list after a row moves under another manager, landing at `position`
 * among that manager's reports.
 */
export function withPersonMovedUnder(
  rows: readonly Person[],
  row: Person,
  parentId: string | null,
  position: number
): Person[] {
  const remaining = rows.filter((candidate) => candidate.id !== row.id);
  const moved: Person = { ...row, managerId: parentId };
  const destinations = remaining.flatMap((candidate, index) =>
    (reportsTo(candidate) ?? null) === parentId ? [index] : []
  );
  const next = remaining.slice();
  next.splice(
    insertionIndex(destinations, position, remaining.length),
    0,
    moved
  );
  return next;
}
