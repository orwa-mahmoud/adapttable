import {
  type ConfirmHandler,
  type ConfirmRequest,
  formatMultiDraft,
  type RowAction,
} from "@adapttable/core";
import {
  aggregate,
  type ColumnDef,
  type ColumnInput,
  computed,
  type SummaryRowFn,
  type UseSavedViewsOptions,
} from "@adapttable/react";
import { sparklineColumn } from "@adapttable/react/sparkline";
import type { CSSProperties, ReactNode } from "react";

import { EditIcon, TrashIcon } from "./icons";
import {
  budget,
  budgetAggregateText,
  type DemoOrder,
  type DemoStatus,
  dueDate,
  formatCount,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
  isRemote,
  loadHistory,
  type Locale,
  PEOPLE,
  type Person,
  personName,
  personRole,
  personSkills,
  personStatus,
  SKILLS,
  startDate,
  STATUS_LABELS,
  STATUSES,
  strings,
  TEAMS,
  utilization,
} from "./people";
import {
  largestGroupsFirst,
  PEOPLE_GROUP_TOTALS,
  PEOPLE_TOTAL_COLUMNS,
  totalOf,
} from "./shared/groupingScenario";
import {
  peopleBulkActions,
  type PeopleBulkHandlers,
  peopleRowActions,
  type PeopleRowHandlers,
} from "./shared/peopleActions";
import {
  groupPeopleColumns,
  loadCaption,
  ORDER_COLUMNS,
  peopleColumns,
  personInitials,
} from "./shared/peopleTable";

export {
  allocationCount,
  budget,
  DEMO_FILTER_RUNTIME,
  demoFilterDefs,
  demoFilterTypes,
  type DemoOrder,
  demoOrders,
  type DemoStatus,
  dueDate,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
  isRemote,
  kitchenFilterDefs,
  LARGE_ROW_COUNT,
  LARGE_TEAM_COUNT,
  loadHistory,
  type Locale,
  makeLargeDirectory,
  matchesDemoFilters,
  PEOPLE,
  type Person,
  personName,
  personRole,
  personSkills,
  personStatus,
  reportsTo,
  SKILLS,
  startDate,
  STATUS_LABELS,
  STATUSES,
  strings,
  TEAM_LABELS,
  TEAMS,
  timelineDays,
  utilization,
} from "./people";
export { notifyDemo } from "./shared/demoNotice";
export {
  EDITING_DEFAULT_LAYOUT,
  GROUPS_DEFAULT_LAYOUT,
  LIVE_DEFAULT_LAYOUT,
  SPAN_DEFAULT_LAYOUT,
} from "./shared/peopleTable";
export { consecutiveTeamSpan, orderPeopleByTeam } from "./shared/rowsScenario";

export const DEMO_CONFIRM_EVENT = "adapttable-demo-confirm";

/**
 * Nested-tables starts with the first row on screen open. The dedicated
 * page does not use {@link PEOPLE} (Ada is `"1"`); landing ids start at
 * `"101"`. Key off the source so Feature Lab and that page both match.
 */
export function nestedOpenIds(
  nested: boolean | undefined,
  rows: readonly { id: string }[]
): readonly string[] | undefined {
  const first = rows[0]?.id;
  return nested && first ? [first] : undefined;
}

/** Columns for the nested orders table — a different shape from the parent's. */
export const DEMO_ORDER_COLUMNS: ColumnDef<DemoOrder>[] = [...ORDER_COLUMNS];

export const demoConfirm: ConfirmHandler = (request: ConfirmRequest) => {
  window.dispatchEvent(
    new CustomEvent<ConfirmRequest>(DEMO_CONFIRM_EVENT, { detail: request })
  );
};

/**
 * Saved-views wiring for the demos. `urlKey` is passed explicitly because the
 * demos own their URL state in {@link DemoBody} rather than on the table, so
 * the menu has no table `urlKey` to inherit its namespace from. The storage
 * key is scoped the same way, so each demo keeps its own views — and every
 * adapter on a page shares one key, so a view saved under Mantine is there
 * when you switch to MUI. The live demo, grouping, filtering, and
 * aggregation pages write views to the address bar (`urlSync`); Feature
 * Lab and every other kit page do not.
 */
export function demoSavedViews(urlKey?: string): UseSavedViewsOptions {
  return {
    storageKey: `adapttable-demo-views-${urlKey ?? "live"}`,
    urlKey,
    urlSync: demoUrlSync(urlKey),
  };
}

/**
 * Pages whose subject is shareable table state write the address bar.
 *
 * The live demo is the home-page table. Grouping, filtering, and aggregation
 * each own a namespace (`grp`, `flt`, `agg`) so a chip reorder, a find
 * query, or a Core-team filter is a link. Other feature pages keep state
 * off the address so opening one never rewrites another.
 */
export function demoUrlSync(urlKey?: string): boolean {
  return (
    urlKey === "live" ||
    urlKey === "grp" ||
    urlKey === "flt" ||
    urlKey === "agg"
  );
}

/**
 * Stable columns (keys + accessors) for the data hooks — keys and sort values
 * never change with the language. The headers are the English captions, so a
 * page that mounts this set directly (`/saved-views/`) has a table whose
 * columns say what they hold; the display columns ({@link makeColumns}) put
 * the localized captions and the rich cells on top.
 */
export const BASE_COLUMNS: ColumnDef<Person>[] = [
  {
    key: "person",
    accessor: (r) => r.name,
    sortValue: (r) => r.name,
    sortable: true,
    header: strings("en").person,
    renameable: true,
  },
  {
    key: "status",
    accessor: (r) => personStatus(r),
    sortValue: (r) => personStatus(r),
    sortable: true,
    header: strings("en").status,
  },
  {
    key: "timeline",
    accessor: (r) => formatDate(startDate(r)),
    sortValue: (r) => startDate(r).getTime(),
    // Grouping by the instant a project starts gives every row a group of its
    // own, captioned with the epoch the sort runs on. The month is the bucket
    // a reader means when they group a timeline.
    groupValue: (r) => formatMonth(startDate(r)),
    sortable: true,
    header: strings("en").timeline,
  },
  {
    key: "budget",
    accessor: (r) => formatMoney(budget(r)),
    sortValue: (r) => budget(r),
    formatAggregate: (value, context) => formatBudgetAggregate(value, context),
    sortable: true,
    header: strings("en").budget,
  },
  // Utilization is derived, not stored — so it is declared once with
  // `computed` rather than written into `accessor` and repeated in
  // `sortValue`. The cell shows a percentage; sorting and export see the
  // number behind it.
  computed<Person, number>({
    key: "load",
    header: strings("en").load,
    deps: (r) => [r.utilization, r.id],
    value: (r) => utilization(r),
    format: (value) => formatPercent(value),
    column: { sortable: true },
  }),
];

/**
 * Provider-native cell renderers. Each adapter passes its OWN kit components
 * (Mantine `Avatar`/`Badge`/`Progress`, MUI `Avatar`/`Chip`/`LinearProgress`,
 * …) so the rich cells look native to that kit — no bespoke showcase CSS. The
 * column STRUCTURE (keys, headers, sort, widths) stays shared via
 * {@link makeColumns}; only these three visuals differ per provider.
 */
/** Props for a provider's avatar cell. */
export interface AvatarCellProps {
  name: string;
}
/** Props for a provider's status-pill cell. */
export interface StatusCellProps {
  status: DemoStatus;
  label: string;
}
/** Props for a provider's load-bar cell. */
export interface LoadCellProps {
  /** Utilisation 0–100. */
  value: number;
  /** Caption rendered under the bar, e.g. `"78% · 4"`. */
  meta: string;
  /** Localized accessible name for the workload indicator. */
  label: string;
}

export interface DemoCells {
  /** Initials avatar (kit-styled, deterministic colour from the name). */
  Avatar: (props: AvatarCellProps) => ReactNode;
  /** Status pill / badge / tag. */
  Status: (props: StatusCellProps) => ReactNode;
  /** Utilisation bar with a `value` (0–100) and a `meta` caption. */
  Load: (props: LoadCellProps) => ReactNode;
}

const cellStack: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  lineHeight: 1.35,
};

/** An avatar's initials: the shared rule every framework draws. */
export const initials = personInitials;

/** Deterministic 0–359 hue from a name, for adapters whose avatar needs a colour. */
export function nameHue(name: string): number {
  let hue = 0;
  for (let i = 0; i < name.length; i += 1) {
    hue = (hue * 31 + name.charCodeAt(i)) % 360;
  }
  return hue;
}

/** Map a demo status to a semantic colour family every kit understands. */
export function statusTone(
  status: DemoStatus
): "green" | "blue" | "red" | "gray" {
  if (status === "Active") return "green";
  if (status === "Planned") return "blue";
  if (status === "Blocked") return "red";
  return "gray";
}

export function makeColumns(
  locale: Locale,
  cells: DemoCells,
  options?: {
    groups?: boolean;
    sparkline?: boolean;
    editors?: boolean;
    /**
     * Columns built from user-typed formulas, appended after the declared set.
     * The page owns them — it is where the formula text is typed and where the
     * parse errors are shown — so they arrive built rather than as specs.
     */
    formulas?: readonly ColumnDef<Person>[];
    /**
     * Mark demo columns editable. Off unless the page also passes
     * `onCellEdit` — the live demo must not warn in the console.
     */
    editable?: boolean;
  }
): ColumnInput<Person>[] {
  const s = strings(locale);
  const { Avatar, Status, Load } = cells;
  const grouped = options?.groups === true;
  const canEdit = options?.editable === true;
  // The boolean and multi-select editors, which no other column uses — off
  // unless a page asks, so the frozen live demo is untouched.
  const editors: ColumnDef<Person>[] = options?.editors
    ? [
        {
          key: "remote",
          header: s.remote,
          accessor: (row) => (isRemote(row) ? "✓" : "—"),
          sortValue: (row) => (isRemote(row) ? 1 : 0),
          sortable: true,
          editable: canEdit,
          editor: "boolean",
          editValue: (row) => String(isRemote(row)),
          width: 110,
          mobileLabel: s.remote,
        },
        {
          key: "skills",
          header: s.skills,
          accessor: (row) => personSkills(row).join(", ") || "—",
          editable: canEdit,
          editor: {
            type: "multi-select",
            options: SKILLS.map((value) => ({ value, label: value })),
          },
          editValue: (row) => formatMultiDraft(personSkills(row)),
          width: 180,
          mobileLabel: s.skills,
        },
      ]
    : [];
  // Off unless a page asks for it: the live demo is frozen, and the trend
  // column belongs to the Feature Lab's sparkline toggle.
  const trend: ColumnDef<Person>[] = options?.sparkline
    ? [
        sparklineColumn({
          key: "trend",
          header: s.trend,
          values: loadHistory,
          kind: "area",
          width: 88,
          height: 28,
          column: { width: 96, mobileLabel: s.trend },
        }),
      ]
    : [];
  // The columns every framework shows, from the shared definition; React
  // draws its kit's cells over them.
  const shared = new Map(
    peopleColumns(locale, { editable: canEdit }).map((column) => [
      column.key,
      column,
    ])
  );
  const sharedColumn = (key: string): ColumnDef<Person> => {
    const found = shared.get(key);
    if (!found) throw new Error(`no people column "${key}"`);
    return found;
  };
  const leaves: ColumnDef<Person>[] = [
    {
      ...sharedColumn("person"),
      accessor: (row) => (
        <span
          className="demo-person-identity"
          style={{ display: "inline-flex", alignItems: "center", gap: 11 }}
        >
          <Avatar name={personName(row, locale)} />
          <span className="demo-person-identity__details" style={cellStack}>
            <strong style={{ fontWeight: 600 }}>
              {personName(row, locale)}
            </strong>
            <small style={{ fontSize: "0.8em", fontWeight: 400 }}>
              {personRole(row, locale)}
            </small>
          </span>
        </span>
      ),
    },
    ...trend,
    ...editors,
    {
      ...sharedColumn("email"),
      accessor: (r) => (
        <span style={{ opacity: 0.7, fontSize: "0.9em" }}>{r.email}</span>
      ),
    },
    sharedColumn("team"),
    {
      ...sharedColumn("status"),
      accessor: (r) => (
        <Status
          status={personStatus(r)}
          label={STATUS_LABELS[locale][personStatus(r)]}
        />
      ),
    },
    {
      ...sharedColumn("timeline"),
      formatAggregate: (value, context) =>
        formatTimelineAggregate(value, context, locale),
      accessor: (row) => (
        <span className="demo-person-identity__details" style={cellStack}>
          <strong style={{ fontWeight: 550 }}>
            {formatDate(startDate(row), locale)}
          </strong>
          <small style={{ opacity: 0.6, fontSize: "0.82em" }}>
            → {formatDate(dueDate(row), locale)}
          </small>
        </span>
      ),
    },
    {
      ...sharedColumn("budget"),
      accessor: (r) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {formatMoney(budget(r), locale)}
        </span>
      ),
      formatAggregate: (value, context) =>
        formatBudgetAggregate(value, context, locale),
    },
    {
      ...sharedColumn("load"),
      formatAggregate: (value, context) =>
        formatLoadAggregate(value, context, locale),
      accessor: (row) => (
        <Load
          label={s.load}
          value={utilization(row)}
          meta={loadCaption(row, locale)}
        />
      ),
    },
    // Last, so a column somebody just typed appears at the end of the table
    // rather than in the middle of the set they already know.
    ...(options?.formulas ?? []),
  ];
  return grouped ? groupPeopleColumns(leaves, locale) : leaves;
}

/**
 * A deliberately WIDE column set (8 fixed-px columns, ~1440px total) for the
 * column-management showcase — wide enough to scroll sideways so a pinned
 * column visibly sticks. `person` is the natural pin target; pair it with
 * `defaultColumnLayout={{ pinned: { person: "start" } }}`.
 */
export function makeWideColumns(
  locale: Locale,
  cells: DemoCells,
  options?: { editable?: boolean }
): ColumnInput<Person>[] {
  const s = strings(locale);
  const { Avatar, Status, Load } = cells;
  const canEdit = options?.editable === true;
  const leaves: ColumnDef<Person>[] = [
    {
      key: "person",
      header: s.person,
      headerTooltip: s.person,
      sortable: true,
      sortValue: (r) => r.name,
      editable: canEdit,
      editor: "text",
      editValue: (r) => personName(r, locale),
      width: 240,
      accessor: (row) => (
        <span
          className="demo-person-identity"
          style={{ display: "inline-flex", alignItems: "center", gap: 11 }}
        >
          <Avatar name={personName(row, locale)} />
          <span className="demo-person-identity__details" style={cellStack}>
            <strong style={{ fontWeight: 600 }}>
              {personName(row, locale)}
            </strong>
            <small style={{ opacity: 0.6, fontSize: "0.82em" }}>
              {row.email}
            </small>
          </span>
        </span>
      ),
    },
    {
      key: "role",
      header: s.role,
      i18n: { ar: "roleAr" },
      editable: canEdit,
      editor: "text",
      width: 150,
    },
    {
      key: "team",
      header: s.team,
      i18n: { ar: "teamAr" },
      sortable: true,
      editable: canEdit,
      editor: {
        type: "select",
        options: TEAMS.map((v) => ({ value: v, label: v })),
      },
      editValue: (r) => r.team,
      width: 130,
    },
    {
      key: "status",
      header: s.status,
      accessor: (r) => (
        <Status
          status={personStatus(r)}
          label={STATUS_LABELS[locale][personStatus(r)]}
        />
      ),
      sortValue: (r) => personStatus(r),
      sortable: true,
      editable: canEdit,
      editor: {
        type: "select",
        options: STATUSES.map((v) => ({
          value: v,
          label: STATUS_LABELS[locale][v],
        })),
      },
      editValue: (r) => personStatus(r),
      width: 140,
    },
    {
      key: "email",
      header: s.email,
      headerTooltip: s.email,
      editable: canEdit,
      editor: "text",
      accessor: (r) => r.email,
      width: 240,
    },
    {
      key: "timeline",
      header: s.timeline,
      sortValue: (r) => startDate(r).getTime(),
      // A localized "Mar 8, 2026 → Apr 22, 2026" is unusable in a spreadsheet;
      // the file gets the sortable ISO start date.
      exportValue: (r) => startDate(r).toISOString().slice(0, 10),
      sortable: true,
      width: 200,
      accessor: (row) => (
        <span className="demo-person-identity__details" style={cellStack}>
          <strong style={{ fontWeight: 550 }}>
            {formatDate(startDate(row), locale)}
          </strong>
          <small style={{ opacity: 0.6, fontSize: "0.82em" }}>
            → {formatDate(dueDate(row), locale)}
          </small>
        </span>
      ),
    },
    {
      key: "budget",
      header: s.budget,
      accessor: (r) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {formatMoney(budget(r), locale)}
        </span>
      ),
      sortValue: (r) => budget(r),
      // The screen shows "$25,300"; a spreadsheet cannot sum that, so the file
      // carries the number underneath.
      exportValue: (r) => budget(r),
      sortable: true,
      editable: canEdit,
      editor: "number",
      editValue: (r) => String(budget(r)),
      width: 150,
    },
    {
      key: "load",
      header: s.load,
      sortValue: (r) => utilization(r),
      sortable: true,
      editable: canEdit,
      editor: "number",
      editValue: (r) => String(utilization(r)),
      width: 190,
      accessor: (row) => (
        <Load
          label={s.load}
          value={utilization(row)}
          meta={loadCaption(row, locale)}
        />
      ),
    },
  ];
  return leaves;
}

/** What the demo's row and bulk actions actually do: the host owns the rows. */
export type DemoRowHandlers = PeopleRowHandlers & PeopleBulkHandlers;

/** The row actions every kit draws, with this kit set's icons. */
const ROW_ACTION_ICONS: Readonly<Record<string, ReactNode>> = {
  edit: <EditIcon />,
  delete: <TrashIcon />,
};

export function makeActions(
  locale: Locale,
  handlers?: DemoRowHandlers
): RowAction<Person>[] {
  return peopleRowActions(locale, handlers).map((action) => ({
    ...action,
    icon: ROW_ACTION_ICONS[action.key],
  }));
}

/** Bulk actions — passing these turns on row selection + the bulk bar. */
export const makeBulkActions = peopleBulkActions;

/** The fields this dataset offers a pivot, in the order the panel lists them. */
export { PIVOT_FIELDS } from "./shared/pivotScenario";

/**
 * The rows a pivot reads.
 *
 * A pivot resolves a dimension or a measure from a FIELD, not from a column's
 * accessor, so the values this demo derives from the id have to be on the row
 * before it can group or sum them. Materialized once, and shared by the /pivot/
 * page and the Feature Lab's docked pivot builder, so both pivot the identical
 * thirty rows.
 */
export const PIVOT_PEOPLE: readonly Person[] = PEOPLE.map((person) => ({
  ...person,
  status: person.status ?? personStatus(person),
  budget: person.budget ?? budget(person),
  utilization: person.utilization ?? utilization(person),
}));

/**
 * Per-group budget subtotal for the opt-in grouping demo (frontend path
 * only), built with the `aggregate` helper rather than a hand-rolled reduce.
 * Shares the `summaryRow` mapper shape — one function type for footer totals
 * and group headers.
 */
/**
 * What a subtotal of Budget reads like, whoever computed it.
 *
 * `groupAggregates` returns money already formatted; a reader who switches the
 * column to average or minimum gets the raw number the table computed. This is
 * what the column says about that — and it is told which operation produced
 * the value, so a count of rows reads as a count rather than as dollars. A
 * value that is not a number is already someone else's formatting and is left
 * exactly as it is.
 */
export function formatBudgetAggregate(
  value: unknown,
  context: { readonly aggregation?: string },
  locale: Locale = "en"
): ReactNode {
  // Already formatted by whoever computed it — shown as it is, in a fragment
  // so this always hands back one kind of thing.
  if (typeof value !== "number") return <>{value as ReactNode}</>;
  const text = budgetAggregateText(value, context.aggregation, locale);
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
      {text}
    </span>
  );
}

/**
 * A utilization aggregate, as a percentage — except a count, which counts.
 *
 * @param value - The computed aggregate.
 * @param context - What the table says produced it.
 * @param locale - The active locale.
 * @returns The cell content.
 */
export function formatLoadAggregate(
  value: unknown,
  context: { readonly aggregation?: string },
  locale: Locale = "en"
): ReactNode {
  if (typeof value !== "number") return <>{value as ReactNode}</>;
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {context.aggregation === "count"
        ? formatCount(value, locale)
        : formatPercent(value, locale)}
    </span>
  );
}

/**
 * A timeline aggregate, as the day it names.
 *
 * The column sorts on epoch milliseconds, so min and max come back as
 * numbers. A millisecond count is not a date to anybody reading it.
 *
 * @param value - The computed aggregate.
 * @param context - What the table says produced it.
 * @param locale - The active locale.
 * @returns The cell content.
 */
export function formatTimelineAggregate(
  value: unknown,
  context: { readonly aggregation?: string },
  locale: Locale = "en"
): ReactNode {
  if (typeof value !== "number") return <>{value as ReactNode}</>;
  return (
    <span>
      {context.aggregation === "count"
        ? formatCount(value, locale)
        : formatDate(new Date(value), locale)}
    </span>
  );
}

/** A budget subtotal as React draws it: tabular figures, set apart. */
export function BudgetTotal({ total }: Readonly<{ total: number }>) {
  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
      {formatMoney(total, "en")}
    </span>
  );
}

export const DEMO_GROUP_AGGREGATES: SummaryRowFn<Person> = aggregate<Person>(
  PEOPLE_GROUP_TOTALS,
  {
    columns: PEOPLE_TOTAL_COLUMNS,
    format: (value) => <BudgetTotal total={totalOf(value)} />,
  }
);

/** The showcase's grouping extras, with React's subtotal. */
export const DEMO_GROUPING_EXTRAS = {
  groupAggregates: DEMO_GROUP_AGGREGATES,
  groupFooters: true,
  groupSort: largestGroupsFirst,
};
