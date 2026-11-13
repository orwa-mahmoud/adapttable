/**
 * The people table every showcase draws, written once for React, Vue and
 * Angular: the page's presentation, the filters, the columns with their
 * widths and editors, the edits a cell writes back and the demo behaviours.
 * A framework adds only its renderers.
 *
 * Everything about a person comes from `../people`, which the mock API reads
 * too, so a row reads the same in every framework.
 */
import {
  applyRowPatches,
  type ColumnLayoutState,
  type ColumnMetadata,
  updateRow,
} from "@adapttable/core";
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

/** How a page presents its tables: language, direction and labels. */
export interface ShowcasePresentation {
  readonly locale: string;
  readonly dir: Direction;
  readonly labels: ReturnType<typeof getLabels>;
  /** `?library=1`: the kit provider is the only source of direction and labels. */
  readonly libraryOnly: boolean;
  /** The table's `dir`, unset when the kit provider is the source. */
  readonly tableDir: Direction | undefined;
  /** The table's labels, unset when the kit provider is the source. */
  readonly tableLabels: ReturnType<typeof getLabels> | undefined;
}

/**
 * One presentation for every table on a page. `?locale=…` exercises every
 * bundled label set; `?dir=rtl` mirrors any example on its own. The RTL
 * destination opens in Arabic without a query.
 *
 * @returns The page's presentation.
 */
export function readShowcasePresentation(): ShowcasePresentation {
  const url =
    typeof window === "undefined" ? undefined : new URL(window.location.href);
  const locale =
    url?.searchParams.get("locale") ??
    (url?.pathname.includes("/rtl/") ? "ar" : "en");
  const requestedDirection = url?.searchParams.get("dir");
  const dir =
    requestedDirection === "rtl" || requestedDirection === "ltr"
      ? requestedDirection
      : getDirection(locale);
  const labels = getLabels(locale);
  const libraryOnly = url?.searchParams.get("library") === "1";
  return {
    locale,
    dir,
    labels,
    libraryOnly,
    tableDir: libraryOnly ? undefined : dir,
    tableLabels: libraryOnly ? undefined : labels,
  };
}

/** The language a presentation's cell data is written in. */
export const dataLocaleOf = (
  presentation: ShowcasePresentation
): "ar" | "en" => (presentation.locale.split("-")[0] === "ar" ? "ar" : "en");

/** Every page keys its rows by the person's id. */
export const rowKey = (row: Person): string => row.id;

/**
 * The filters every page that filters declares, with the name filter on the
 * built-in text type (the React pages alias it as `personText` to exercise
 * their custom-type registry).
 *
 * @param dataLocale - The language of the cell data.
 * @returns The filter definitions.
 */
export function localizedFilterDefs(
  dataLocale: "ar" | "en"
): ReturnType<typeof demoFilterDefs> {
  return demoFilterDefs(dataLocale).map((def) =>
    def.type === "personText" ? { ...def, type: "text" } : def
  );
}

/** How a status reads: the tone a kit's tag or badge takes for it. */
export type StatusTone = "success" | "error" | "info" | "neutral";

/**
 * The tone of a person's status.
 *
 * @param row - The person.
 * @returns The tone.
 */
export function statusTone(row: Person): StatusTone {
  switch (personStatus(row)) {
    case "Active":
      return "success";
    case "Blocked":
      return "error";
    case "Planned":
      return "info";
    default:
      return "neutral";
  }
}

/**
 * One people column as every framework reads it: the keys, widths, sort,
 * aggregation and editors; a framework adds its cell renderers.
 */
export type PeopleColumn = Omit<
  ColumnMetadata<Person>,
  "header" | "filter" | "accessor"
> & {
  readonly key: string;
  readonly header: string;
  readonly accessor: (row: Person) => string;
};

/** An ISO day (`2026-03-08`) for the date editor's draft. */
const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * The people columns: name, team, status, timeline, budget and load. With
 * `editable`, name, team, status, timeline and budget open an editor.
 *
 * @param dataLocale - The language of the cell data.
 * @param options - `editable` marks the editable columns.
 * @returns The columns.
 */
export function peopleColumns(
  dataLocale: "ar" | "en",
  options: { readonly editable?: boolean } = {}
): PeopleColumn[] {
  const s = strings(dataLocale);
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
 * The people columns under three header groups, one per collapse mode:
 * Assignment keeps its Team column, Delivery draws the budget in one cell,
 * and Workload folds to a stub.
 *
 * @param columns - A framework's people columns, keyed like {@link peopleColumns}.
 * @param dataLocale - The language of the cell data.
 * @returns The grouped columns.
 */
export function groupPeopleColumns<TColumn extends { readonly key: string }>(
  columns: readonly TColumn[],
  dataLocale: "ar" | "en"
) {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const column = (key: string): TColumn => {
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
      align: "start" as const,
      collapsedRender: (row: Person) =>
        `${formatMoney(budget(row), dataLocale)} budget`,
      children: [column("timeline"), column("budget")],
    },
    { header: "Workload", children: [column("load")] },
  ];
}

/**
 * The fields a cell edit writes: the column's field set to the value the
 * table hands the host. The timeline cell shows a range; its editor edits the
 * start it sorts by. A name edit writes the field of the language the cell
 * reads.
 *
 * @param key - The column that was edited.
 * @param value - The committed value.
 * @param dataLocale - The language of the cell data.
 * @returns The changed fields.
 */
function personChanges(
  key: string,
  value: unknown,
  dataLocale: "ar" | "en"
): Partial<Person> {
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
 * @param edit - The edited row, the column and the committed value.
 * @param dataLocale - The language of the cell data.
 * @returns The rows after it.
 */
export function applyPersonEdit(
  rows: readonly Person[],
  edit: { readonly row: Person; readonly key: string; readonly value: unknown },
  dataLocale: "ar" | "en"
): readonly Person[] {
  return applyRowPatches(
    rows,
    [updateRow(edit.row.id, personChanges(edit.key, edit.value, dataLocale))],
    rowKey
  );
}

/** A fresh copy of the people, for a page that edits or reorders them. */
export const peopleRows = (): Person[] =>
  PEOPLE.map((person) => ({ ...person }));

/**
 * The live demo hides Email and Team, so the people fit the frame with no
 * horizontal scroll.
 */
export const LIVE_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "team"],
};

/**
 * Pinning a column reveals every hidden column, so the table widens past its
 * frame and the pinned column is seen to stick while the body scrolls
 * sideways. Only a pin that was not there before reveals; an unpin or a
 * resize leaves the layout as the reader set it.
 *
 * @param previous - The layout before the change.
 * @param next - The layout the table asks for.
 * @returns The layout to apply.
 */
export function revealHiddenOnPin(
  previous: ColumnLayoutState,
  next: ColumnLayoutState
): ColumnLayoutState {
  const pinAdded = Object.keys(next.pinned).some(
    (key) => !(key in previous.pinned)
  );
  return pinAdded && next.hidden.length > 0 ? { ...next, hidden: [] } : next;
}
