/**
 * The Angular pages' table data: the same people, derived fields and filter
 * definitions the React pages show, as Angular columns.
 *
 * Everything that is not a column comes from `../people`, which the React
 * pages and the mock API read too, so a row reads the same in either
 * framework.
 */
import type { ColumnDef, ColumnInput } from "@adapttable/angular";
import { applyRowPatches, updateRow } from "@adapttable/core";
import { type Direction, getDirection, getLabels } from "@adapttable/i18n";

import {
  budget,
  budgetAggregateText,
  demoFilterDefs,
  dueDate,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
  PEOPLE,
  type Person,
  personName,
  personStatus,
  startDate,
  STATUS_LABELS,
  STATUSES,
  strings,
  TEAM_LABELS,
  TEAMS,
  utilization,
} from "../people";

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

/**
 * One presentation configuration for every real table on an Angular page.
 * `?locale=…` exercises every bundled label set; `?dir=rtl` can independently
 * mirror any example. The RTL destination opens in Arabic without a query.
 */
export const SHOWCASE_PRESENTATION = ((): {
  readonly locale: string;
  readonly dir: Direction;
  readonly labels: ReturnType<typeof getLabels>;
} => {
  const url =
    typeof window === "undefined" ? undefined : new URL(window.location.href);
  const locale =
    url?.searchParams.get("locale") ??
    (url?.pathname.includes("/rtl/") ? "ar" : "en");
  const requestedDirection = url?.searchParams.get("dir");
  return {
    locale,
    dir:
      requestedDirection === "rtl" || requestedDirection === "ltr"
        ? requestedDirection
        : getDirection(locale),
    labels: getLabels(locale),
  };
})();

/** The seed includes Arabic cell data as well as English cell data. */
const dataLocale =
  SHOWCASE_PRESENTATION.locale.split("-")[0] === "ar" ? "ar" : "en";
const s = strings(dataLocale);

/** Every page keys its rows by the person's id. */
export const rowKey = (row: Person): string => row.id;

/**
 * The filters every Angular page that filters declares — the React pages'
 * definitions, with the name filter on the built-in text type the React pages
 * alias as `personText` to exercise their custom-type registry.
 */
export const FILTER_DEFS = demoFilterDefs(dataLocale).map((def) =>
  def.type === "personText" ? { ...def, type: "text" } : def
);

/** An ISO day (`2026-03-08`) for the date editor's draft. */
const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * The people columns: name, team, status, timeline, budget and load. With
 * `editable`, name, team, status, timeline and budget open an editor.
 *
 * @param options - `editable` marks the editable columns.
 * @returns The columns.
 */
export function peopleColumns(
  options: { readonly editable?: boolean } = {}
): ColumnDef<Person>[] {
  const editable = options.editable === true;
  return [
    {
      key: "person",
      header: s.person,
      accessor: (row) => personName(row, dataLocale),
      sortValue: (row) => personName(row, dataLocale),
      sortable: true,
      editable,
      editor: "text",
      validate: (value) =>
        String(value).trim() === "" ? s.nameRequired : undefined,
      width: 200,
      mobileLabel: "",
    },
    {
      key: "team",
      header: s.team,
      accessor: (row) => TEAM_LABELS[dataLocale][row.team] ?? row.team,
      editable,
      editor: {
        type: "select",
        options: TEAMS.map((team) => ({
          value: team,
          label: TEAM_LABELS[dataLocale][team] ?? team,
        })),
      },
      width: 130,
      mobileLabel: s.team,
    },
    {
      key: "status",
      header: s.status,
      accessor: (row) => STATUS_LABELS[dataLocale][personStatus(row)],
      sortValue: (row) => personStatus(row),
      sortable: true,
      aggregatable: { operations: ["count"] },
      editable,
      editor: {
        type: "select",
        options: STATUSES.map((status) => ({
          value: status,
          label: STATUS_LABELS[dataLocale][status],
        })),
      },
      editValue: (row) => personStatus(row),
      width: 130,
      mobileLabel: s.status,
    },
    {
      key: "timeline",
      header: s.timeline,
      accessor: (row) =>
        `${formatDate(startDate(row), dataLocale)} → ${formatDate(dueDate(row), dataLocale)}`,
      sortValue: (row) => startDate(row).getTime(),
      groupValue: (row) => formatMonth(startDate(row), dataLocale),
      exportValue: (row) => isoDay(startDate(row)),
      sortable: true,
      editable,
      editor: "date",
      editValue: (row) => isoDay(startDate(row)),
      width: 240,
      mobileLabel: s.timeline,
    },
    {
      key: "budget",
      header: s.budget,
      accessor: (row) => formatMoney(budget(row), dataLocale),
      sortValue: (row) => budget(row),
      exportValue: (row) => budget(row),
      sortable: true,
      aggregatable: {
        operations: ["sum", "avg", "min", "max"],
        default: "sum",
      },
      formatAggregate: (value, context) =>
        typeof value === "number"
          ? budgetAggregateText(value, context.aggregation, dataLocale)
          : value,
      editable,
      editor: "number",
      editValue: (row) => String(budget(row)),
      parseValue: (draft) => Number(draft),
      width: 120,
      mobileLabel: s.budget,
    },
    {
      key: "load",
      header: s.load,
      accessor: (row) => formatPercent(utilization(row), dataLocale),
      sortValue: (row) => utilization(row),
      sortable: true,
      width: 100,
      mobileLabel: s.load,
    },
  ];
}

/**
 * The fields a cell edit writes: the column's field set to the value the
 * table hands the host, the way the React pages apply the same edit. The
 * timeline cell shows a range; its editor edits the start it sorts by. A name
 * edit writes the locale-specific field the cell reads, including live patches.
 *
 * @param key - The column that was edited.
 * @param value - The committed value.
 * @returns The changed fields.
 */
function personChanges(key: string, value: unknown): Partial<Person> {
  switch (key) {
    case "person":
      return dataLocale === "ar"
        ? { nameAr: String(value) }
        : { name: String(value) };
    case "team":
      return { team: String(value) };
    case "status":
      return { status: STATUSES.find((status) => status === value) };
    case "timeline":
      return { start: String(value) };
    case "budget":
      return { budget: Number(value) };
    default:
      return {};
  }
}

/**
 * The rows after one cell edit, written through core's row patches.
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
  return applyRowPatches(
    rows,
    [updateRow(row.id, personChanges(key, value))],
    rowKey
  );
}

/** A fresh copy of the people, for a page that edits or reorders them. */
export const peopleRows = (): Person[] =>
  PEOPLE.map((person) => ({ ...person }));

/**
 * The people columns under three header groups, one per collapse mode:
 * Assignment keeps its Team column, Delivery draws the budget in one cell,
 * and Workload folds to a stub.
 */
export function groupedPeopleColumns(): ColumnInput<Person>[] {
  const byKey = new Map(peopleColumns().map((column) => [column.key, column]));
  const column = (key: string): ColumnDef<Person> => {
    const found = byKey.get(key);
    if (!found) throw new Error(`no people column "${key}"`);
    return found;
  };
  return [
    column("person"),
    {
      header: "Assignment",
      collapsedKey: "team",
      children: [column("team"), column("status")],
    },
    {
      header: "Delivery",
      align: "start",
      collapsedRender: (row) =>
        `${formatMoney(budget(row), dataLocale)} budget`,
      children: [column("timeline"), column("budget")],
    },
    { header: "Workload", children: [column("load")] },
  ];
}
