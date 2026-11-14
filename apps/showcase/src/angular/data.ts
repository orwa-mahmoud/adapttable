/**
 * The Angular pages' table data: the shared people table
 * (`../shared/peopleTable`) as Angular columns.
 */
import {
  aggregate,
  type ColumnDef,
  type ColumnInput,
} from "@adapttable/angular";

import { formatMoney, type Person } from "../people";
import {
  largestGroupsFirst,
  PEOPLE_GROUP_TOTALS,
  PEOPLE_TOTAL_COLUMNS,
  totalOf,
} from "../shared/groupingScenario";
import {
  applyPersonEdit as applySharedEdit,
  dataLocaleOf,
  groupPeopleColumns,
  localizedFilterDefs,
  peopleColumns as sharedPeopleColumns,
  readShowcasePresentation,
} from "../shared/peopleTable";

export { fetchPeople, type PeoplePage, type PeopleParams } from "../mockApi";
export {
  type DemoOrder,
  demoOrders,
  largePerson,
  makeLargeDirectory,
  PEOPLE,
  type Person,
  reportsTo,
} from "../people";
export { peopleRows, rowKey } from "../shared/peopleTable";

/** One presentation for every table on an Angular page. */
export const SHOWCASE_PRESENTATION = readShowcasePresentation();

/** The language the page's cell data is written in. */
export const currentDataLocale = (): "ar" | "en" =>
  dataLocaleOf(SHOWCASE_PRESENTATION);

/** How every Angular page groups people: a budget subtotal, footers, largest first. */
export const PEOPLE_GROUPING = {
  groupAggregates: aggregate<Person>(PEOPLE_GROUP_TOTALS, {
    columns: PEOPLE_TOTAL_COLUMNS,
    format: (value) => formatMoney(totalOf(value), "en"),
  }),
  groupFooters: true,
  groupSort: largestGroupsFirst,
};

/** The filters every Angular page that filters declares. */
export const FILTER_DEFS = localizedFilterDefs(currentDataLocale());

/** Refresh the same exported objects before a same-document Angular remount. */
export function refreshShowcasePresentation(): void {
  Object.assign(SHOWCASE_PRESENTATION, readShowcasePresentation());
  FILTER_DEFS.splice(
    0,
    FILTER_DEFS.length,
    ...localizedFilterDefs(currentDataLocale())
  );
}

/**
 * The people columns. With `editable`, name, team, status, timeline and
 * budget open an editor.
 *
 * @param options - `editable` marks the editable columns.
 * @returns The columns.
 */
export function peopleColumns(
  options: { readonly editable?: boolean } = {}
): ColumnDef<Person>[] {
  return sharedPeopleColumns(currentDataLocale(), options);
}

/**
 * The rows after one cell edit.
 *
 * @param rows - The rows before the edit.
 * @param row - The edited row.
 * @param key - The column that was edited.
 * @param value - The committed value.
 * @returns The rows after it.
 */
export function applyPersonEdit(
  rows: readonly Person[],
  row: Person,
  key: string,
  value: unknown
): readonly Person[] {
  return applySharedEdit(rows, { row, key, value }, currentDataLocale());
}

/** The people columns under three header groups, one per collapse mode. */
export function groupedPeopleColumns(): ColumnInput<Person>[] {
  return groupPeopleColumns(peopleColumns(), currentDataLocale());
}
