/**
 * The Vue pages' table data: the shared people table
 * (`../../shared/peopleTable`) as Vue columns, with the kit's own cells.
 */
import { aggregate } from "@adapttable/core";
import type { Direction } from "@adapttable/i18n";
import type { getLabels } from "@adapttable/i18n/catalog";
import type { ColumnDef, ColumnInput } from "@adapttable/vue";
import { h, type VNodeChild } from "vue";

import {
  formatMoney,
  type Person,
  personName,
  personRole,
  strings,
  utilization,
} from "../../people";
import {
  largestGroupsFirst,
  PEOPLE_GROUP_TOTALS,
  PEOPLE_TOTAL_COLUMNS,
  totalOf,
} from "../../shared/groupingScenario";
import {
  applyPersonEdit as applySharedEdit,
  dataLocaleOf,
  groupPeopleColumns,
  loadCaption,
  localizedFilterDefs,
  peopleColumns as sharedPeopleColumns,
  personInitials,
  readShowcasePresentation,
  type StatusTone,
  statusTone,
  timelineLines,
} from "../../shared/peopleTable";

export { fetchPeople, type PeoplePage, type PeopleParams } from "../../mockApi";
export {
  type DemoOrder,
  demoOrders,
  PEOPLE,
  type Person,
  reportsTo,
} from "../../people";
export {
  ORDER_COLUMNS,
  orderKey,
  peopleRows,
  rowKey,
  type StatusTone,
  statusTone,
} from "../../shared/peopleTable";

/** One presentation for every table on a Vue page. */
export const SHOWCASE_PRESENTATION = readShowcasePresentation();

/** The language the page's cell data is written in. */
export const currentDataLocale = (): "ar" | "en" =>
  dataLocaleOf(SHOWCASE_PRESENTATION);

/** How every Vue page groups people: a budget subtotal, footers, largest first. */
export const PEOPLE_GROUPING = {
  groupAggregates: aggregate<Person>(PEOPLE_GROUP_TOTALS, {
    columns: PEOPLE_TOTAL_COLUMNS,
    format: (value) => formatMoney(totalOf(value), "en"),
  }),
  groupFooters: true,
  groupSort: largestGroupsFirst,
};

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

/** Two lines stacked in one cell, as the React pages stack them. */
const CELL_STACK = {
  display: "inline-flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
  lineHeight: 1.35,
} as const;

/**
 * The people columns, drawn with the kit's own cells: the person with an
 * avatar over their role, the status as the kit's tag, the load as its
 * progress bar over the caption; the email muted, the timeline's start over its
 * due date and the budget in tabular figures, as every framework draws them. With `editable`, the columns open editors.
 *
 * @param cells - The kit's status, avatar and progress cells.
 * @param options - `editable`.
 * @returns The columns.
 */
export function peopleColumns(
  cells: PeopleCells,
  options: { readonly editable?: boolean } = {}
): ColumnDef<Person>[] {
  const dataLocale = currentDataLocale();
  const s = strings(dataLocale);
  return sharedPeopleColumns(dataLocale, options).map(
    (column): ColumnDef<Person> => {
      if (column.key === "person" && cells.avatar) {
        const avatar = cells.avatar;
        return {
          ...column,
          cell: ({ row }: { row: Person }) => {
            const name = personName(row, dataLocale);
            return h("div", { class: "demo-mobile-person" }, [
              avatar(personInitials(name)),
              h("div", { style: { minWidth: 0 } }, [
                h("strong", name),
                h("small", personRole(row, dataLocale)),
              ]),
            ]);
          },
        };
      }
      if (column.key === "status" && cells.status) {
        const status = cells.status;
        return {
          ...column,
          cell: ({ row, value }: { row: Person; value: unknown }) =>
            status(statusTone(row), String(value)),
        };
      }
      if (column.key === "load" && cells.progress) {
        const progress = cells.progress;
        return {
          ...column,
          cell: ({ row }: { row: Person }) =>
            h("div", { class: "demo-mobile-load" }, [
              progress(utilization(row), s.load),
              h("small", loadCaption(row, dataLocale)),
            ]),
        };
      }
      if (column.key === "timeline") {
        return {
          ...column,
          cell: ({ row }: { row: Person }) => {
            const { start, end } = timelineLines(row, dataLocale);
            return h("span", { style: CELL_STACK }, [
              h("strong", { style: { fontWeight: 550 } }, start),
              h("small", { style: { opacity: 0.6, fontSize: "0.82em" } }, end),
            ]);
          },
        };
      }
      if (column.key === "email") {
        return {
          ...column,
          cell: ({ value }: { value: unknown }) =>
            h(
              "span",
              { style: { opacity: 0.7, fontSize: "0.9em" } },
              String(value)
            ),
        };
      }
      if (column.key === "budget") {
        return {
          ...column,
          cell: ({ value }: { value: unknown }) =>
            h(
              "span",
              {
                style: { fontVariantNumeric: "tabular-nums", fontWeight: 600 },
              },
              String(value)
            ),
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
  cells: PeopleCells
): ColumnInput<Person>[] {
  return groupPeopleColumns(peopleColumns(cells), currentDataLocale());
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
