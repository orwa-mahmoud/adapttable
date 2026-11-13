/**
 * The Vue pages' table data: the shared people table
 * (`../../shared/peopleTable`) as Vue columns, with the kit's own cells.
 */
import type { Direction, getLabels } from "@adapttable/i18n";
import type { ColumnDef, ColumnInput } from "@adapttable/vue";
import { h, type VNodeChild } from "vue";

import {
  formatPercent,
  type Person,
  personName,
  personRole,
  strings,
  utilization,
} from "../../people";
import {
  applyPersonEdit as applySharedEdit,
  dataLocaleOf,
  groupPeopleColumns,
  localizedFilterDefs,
  peopleColumns as sharedPeopleColumns,
  readShowcasePresentation,
  type StatusTone,
  statusTone,
} from "../../shared/peopleTable";

export { fetchPeople, type PeoplePage, type PeopleParams } from "../../mockApi";
export {
  type DemoOrder,
  demoOrders,
  largePerson,
  makeLargeDirectory,
  PEOPLE,
  type Person,
  reportsTo,
} from "../../people";
export {
  peopleRows,
  rowKey,
  type StatusTone,
  statusTone,
} from "../../shared/peopleTable";

/** One presentation for every table on a Vue page. */
export const SHOWCASE_PRESENTATION = readShowcasePresentation();

const currentDataLocale = (): "ar" | "en" =>
  dataLocaleOf(SHOWCASE_PRESENTATION);

/** The same localized field the matrix's person cells and editors display. */
export const personDisplayName = (row: Person): string =>
  personName(row, currentDataLocale());

/** The filters every Vue page that filters declares. */
export const FILTER_DEFS = localizedFilterDefs(currentDataLocale());

/** Draws a status as the kit's own tag or badge. */
export type StatusRenderer = (tone: StatusTone, label: string) => VNodeChild;

/** The kit's own cells for the people columns. */
export interface PeopleCells {
  /** Draws the status cell. */
  readonly status?: StatusRenderer;
  /** Draws the person's avatar from their initials. */
  readonly avatar?: (initials: string) => VNodeChild;
  /** Draws the load as a progress bar. */
  readonly progress?: (value: number, label: string) => VNodeChild;
}

const initialsOf = (name: string): string =>
  name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => [...part][0] ?? "")
    .join("");

/**
 * The people columns, drawn with the kit's own cells where it hands them.
 * With `editable`, name, team, status, timeline and budget open an editor.
 *
 * @param options - `editable`, and the kit's status, avatar and progress cells.
 * @returns The columns.
 */
export function peopleColumns(
  options: { readonly editable?: boolean } & PeopleCells = {}
): ColumnDef<Person>[] {
  const dataLocale = currentDataLocale();
  const s = strings(dataLocale);
  return sharedPeopleColumns(dataLocale, options).map(
    (column): ColumnDef<Person> => {
      if (column.key === "person" && options.avatar) {
        const avatar = options.avatar;
        return {
          ...column,
          cell: ({ row }: { row: Person }) => {
            const name = personName(row, dataLocale);
            return h("div", { class: "demo-mobile-person" }, [
              avatar(initialsOf(name)),
              h("div", { style: { minWidth: 0 } }, [
                h("strong", name),
                h("small", personRole(row, dataLocale)),
              ]),
            ]);
          },
        };
      }
      if (column.key === "status" && options.status) {
        const status = options.status;
        return {
          ...column,
          cell: ({ row, value }: { row: Person; value: unknown }) =>
            status(statusTone(row), String(value)),
        };
      }
      if (column.key === "load" && options.progress) {
        const progress = options.progress;
        return {
          ...column,
          cell: ({ row }: { row: Person }) =>
            h("div", { class: "demo-mobile-load" }, [
              progress(utilization(row), s.load),
              h("small", formatPercent(utilization(row), dataLocale)),
            ]),
        };
      }
      return column;
    }
  );
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
export function groupedPeopleColumns(
  status?: StatusRenderer
): ColumnInput<Person>[] {
  return groupPeopleColumns(peopleColumns({ status }), currentDataLocale());
}

/** The direction, labels and language every table on the page shares. */
export const TABLE_PRESENTATION: {
  dir?: Direction;
  labels?: ReturnType<typeof getLabels>;
  lang?: string;
} = {};

/** `?library=1` leaves the table props unset so the kit provider is the source. */
function syncTablePresentation(): void {
  if (SHOWCASE_PRESENTATION.libraryOnly) {
    delete TABLE_PRESENTATION.dir;
    delete TABLE_PRESENTATION.labels;
    delete TABLE_PRESENTATION.lang;
    return;
  }
  TABLE_PRESENTATION.dir = SHOWCASE_PRESENTATION.dir;
  TABLE_PRESENTATION.labels = SHOWCASE_PRESENTATION.labels;
  TABLE_PRESENTATION.lang = SHOWCASE_PRESENTATION.locale;
}

syncTablePresentation();

/** Keep shared locale objects current before a same-document demo remount. */
export function refreshShowcasePresentation(): void {
  Object.assign(SHOWCASE_PRESENTATION, readShowcasePresentation());
  FILTER_DEFS.splice(
    0,
    FILTER_DEFS.length,
    ...localizedFilterDefs(currentDataLocale())
  );
  syncTablePresentation();
}

/** How many rows the scale page windows. */
export const SCALE_ROWS = 40_000;
