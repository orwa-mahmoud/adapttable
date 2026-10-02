import {
  type BulkAction,
  type ColumnLayoutState,
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
  allocationCount,
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
  type Strings,
  strings,
  TEAMS,
  timelineDays,
  utilization,
} from "./people";

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

export const DEMO_NOTICE_EVENT = "adapttable-demo-notice";
export const DEMO_CONFIRM_EVENT = "adapttable-demo-confirm";

export interface DemoNotice {
  message: string;
  tone?: "info" | "danger";
}

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

/** `YYYY-MM-DD` in local time — what a date editor holds. */
function localDay(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(value.getFullYear())}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** Columns for the nested orders table — a different shape from the parent's. */
export const DEMO_ORDER_COLUMNS: ColumnDef<DemoOrder>[] = [
  { key: "item", header: "Item", accessor: (row) => row.item },
  { key: "qty", header: "Qty", accessor: (row) => row.qty, align: "end" },
  {
    key: "amount",
    header: "Amount",
    accessor: (row) => `$${row.amount.toLocaleString("en-US")}`,
    align: "end",
  },
];

export function notifyDemo(notice: DemoNotice): void {
  window.dispatchEvent(
    new CustomEvent<DemoNotice>(DEMO_NOTICE_EVENT, { detail: notice })
  );
}

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

/** First-letters of (up to) the first two name words, e.g. "Ada Lovelace" → "AL". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

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

/**
 * The live-demo's default column layout: `email` and `team` ship as real
 * columns but start hidden, so the table fits its container with no
 * horizontal cell scroll by default. Revealing them (or pinning — see the
 * showcase) widens the table past its container so a pinned column
 * visibly sticks while scrolling.
 */
export const LIVE_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "team"],
};

/**
 * Span demo: Team is the merge column — one label down consecutive
 * teammates who share it. Email stays hidden (same as Baseline) so the
 * table does not grow a 250px column just to cover it. Load hides so
 * showing Team does not add a column: same count, no sideways scroll.
 */
export const SPAN_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load"],
};

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
 * Pass visual body order (`sectionRows`), so pinning a teammate keeps
 * one merge instead of splitting Core into two cells.
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
 * Column-groups demo: Team stays visible so Assignment is Team + Status.
 * Groups start open. Actions stays pinned at the end.
 */
export const GROUPS_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: [],
  pinned: { actions: "end" },
};

/**
 * The editing page's default layout: every editable field stays visible.
 * Timeline is the only display-only column, so hiding it keeps the table
 * compact without making the page borrow the Columns menu from its showcase.
 */
export const EDITING_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["timeline"],
};

function takeColumnKeys(
  byKey: Map<string, ColumnDef<Person>>,
  keys: readonly string[]
): ColumnDef<Person>[] {
  const taken: ColumnDef<Person>[] = [];
  for (const key of keys) {
    const column = byKey.get(key);
    if (!column) continue;
    byKey.delete(key);
    taken.push(column);
  }
  return taken;
}

/**
 * Compact leaves for the column-groups table: Name + Role, then the four
 * grouped children. Person, Email and Load stay off this page so the three
 * groups plus Actions fit without sideways scroll. Sparkline / editors /
 * formulas from the Feature Lab still pass through.
 */
function columnGroupsDemoLeaves(
  leaves: ColumnDef<Person>[],
  locale: Locale,
  s: Strings
): ColumnDef<Person>[] {
  const byKey = new Map(leaves.map((column) => [column.key, column]));
  const name: ColumnDef<Person> = {
    key: "name",
    header: s.name,
    i18n: { ar: "nameAr" },
    sortable: true,
    sortValue: (row) => personName(row, locale),
    width: 140,
    mobileLabel: s.name,
  };
  const role: ColumnDef<Person> = {
    key: "role",
    header: s.role,
    i18n: { ar: "roleAr" },
    width: 110,
    mobileLabel: s.role,
  };
  const core = takeColumnKeys(byKey, ["team", "status", "timeline", "budget"]);
  byKey.delete("person");
  byKey.delete("email");
  byKey.delete("load");
  return [name, role, ...core, ...byKey.values()];
}

/**
 * Tree groups for the column-groups demo. Actions stays ungrouped at the
 * end (full header height). Three parents, two children each, one collapse
 * result apiece: Contact is the arrow stub, Assignment keeps Team,
 * Delivery draws a money-for-days brief.
 */
function nestDemoColumnGroups(
  leaves: ColumnDef<Person>[],
  locale: Locale,
  s: Strings
): ColumnInput<Person>[] {
  const byKey = new Map(leaves.map((column) => [column.key, column]));
  const out: ColumnInput<Person>[] = [];
  for (const leaf of leaves) {
    if (!byKey.has(leaf.key)) continue;
    if (leaf.key === "name" || leaf.key === "role") {
      out.push({
        header: s.groupContact,
        children: takeColumnKeys(byKey, ["name", "role"]),
      });
      continue;
    }
    if (leaf.key === "team" || leaf.key === "status") {
      out.push({
        header: s.groupAssignment,
        collapsedKey: "team",
        children: takeColumnKeys(byKey, ["team", "status"]),
      });
      continue;
    }
    if (leaf.key === "timeline" || leaf.key === "budget") {
      out.push({
        header: s.groupDelivery,
        align: "start",
        collapsedRender: (row) =>
          s.deliveryBrief(formatMoney(budget(row), locale), timelineDays(row)),
        children: takeColumnKeys(byKey, ["timeline", "budget"]),
      });
      continue;
    }
    byKey.delete(leaf.key);
    out.push(leaf);
  }
  return out;
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
  // Fixed pixel widths (not %) so revealing the hidden team column
  // pushes the total past the container and the table scrolls horizontally —
  // the only way a pinned column can be seen to stick.
  const leaves: ColumnDef<Person>[] = [
    {
      key: "person",
      header: s.person,
      headerTooltip: s.person,
      renameable: true,
      sortable: true,
      sortValue: (r) => r.name,
      editable: canEdit,
      editor: "text",
      editValue: (r) => r.name,
      // A name adds up to nothing; counting the people in a group does.
      aggregatable: { operations: ["count"] },
      // A rule the reader can trip on purpose: clear the name and commit.
      validate: (value) =>
        String(value).trim() === "" ? s.nameRequired : undefined,
      width: 230,
      accessor: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
          <Avatar name={personName(row, locale)} />
          <span style={cellStack}>
            <strong style={{ fontWeight: 600 }}>
              {personName(row, locale)}
            </strong>
            <small style={{ opacity: 0.55, fontSize: "0.8em" }}>
              {personRole(row, locale)}
            </small>
          </span>
        </span>
      ),
      // The first mobile field is the card identity block; its Avatar + name
      // already explain themselves, so repeating "Person" adds visual noise.
      mobileLabel: "",
    },
    ...trend,
    ...editors,
    {
      key: "email",
      header: s.email,
      headerTooltip: s.email,
      aggregatable: false,
      // Opt-in cell editing — only when this page also passes `onCellEdit`.
      editable: canEdit,
      editor: "text",
      accessor: (r) => (
        <span style={{ opacity: 0.7, fontSize: "0.9em" }}>{r.email}</span>
      ),
      width: 250,
      mobileLabel: s.email,
    },
    {
      // The library's own column i18n: under `locale="ar"` the cell, sort
      // and filter all follow the `teamAr` path — no accessor needed.
      key: "team",
      header: s.team,
      i18n: { ar: "teamAr" },
      editable: canEdit,
      editor: {
        type: "select",
        options: TEAMS.map((v) => ({ value: v, label: v })),
      },
      editValue: (r) => r.team,
      width: 130,
      mobileLabel: s.team,
    },
    {
      key: "status",
      header: s.status,
      aggregatable: { operations: ["count"] },
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
      width: 130,
      mobileLabel: s.status,
    },
    {
      key: "timeline",
      header: s.timeline,
      // Dates compare but do not add up, and a millisecond count is not a
      // date: min and max read back as the day they name.
      aggregatable: { operations: ["min", "max", "count"] },
      formatAggregate: (value, context) =>
        formatTimelineAggregate(value, context, locale),
      sortValue: (r) => startDate(r).getTime(),
      // Grouping by the instant a project starts gives every row a group of
      // its own, captioned with the epoch. The month is the bucket a reader
      // means when they group a timeline.
      groupValue: (r) => formatMonth(startDate(r), locale),
      // A localized "Mar 8, 2026 → Apr 22, 2026" is unusable in a spreadsheet;
      // the file gets the sortable ISO start date.
      exportValue: (r) => startDate(r).toISOString().slice(0, 10),
      sortable: true,
      // The cell shows a localized range; the editor edits the start date it
      // sorts by, in the browser's own date control.
      editable: canEdit,
      editor: "date",
      editValue: (r) => localDay(startDate(r)),
      width: 185,
      accessor: (row) => (
        <span style={cellStack}>
          <strong style={{ fontWeight: 550 }}>
            {formatDate(startDate(row), locale)}
          </strong>
          <small style={{ opacity: 0.6, fontSize: "0.82em" }}>
            → {formatDate(dueDate(row), locale)}
          </small>
        </span>
      ),
      mobileLabel: s.timeline,
    },
    {
      key: "budget",
      header: s.budget,
      // The developer's own choice, visible in the panel before anyone
      // touches it: Budget opens summed, and offers the rest.
      aggregatable: {
        default: "sum",
        operations: ["sum", "avg", "min", "max", "count"],
      },
      accessor: (r) => (
        <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
          {formatMoney(budget(r), locale)}
        </span>
      ),
      sortValue: (r) => budget(r),
      // A subtotal of this column is money too — whether the table computed it
      // or the reader chose the operation from the grouping strip.
      formatAggregate: (value, context) =>
        formatBudgetAggregate(value, context, locale),
      // The screen shows "$25,300"; a spreadsheet cannot sum that, so the file
      // carries the number underneath.
      exportValue: (r) => budget(r),
      sortable: true,
      editable: canEdit,
      editor: "number",
      editValue: (r) => String(budget(r)),
      width: 130,
      mobileLabel: s.budget,
    },
    {
      key: "load",
      header: s.load,
      // Available, and off until a reader asks for it.
      aggregatable: { operations: ["avg", "min", "max", "count"] },
      formatAggregate: (value, context) =>
        formatLoadAggregate(value, context, locale),
      sortValue: (r) => utilization(r),
      sortable: true,
      editable: canEdit,
      editor: "number",
      editValue: (r) => String(utilization(r)),
      width: 175,
      accessor: (row) => (
        <Load
          value={utilization(row)}
          meta={`${formatPercent(utilization(row), locale)} · ${allocationCount(row)}`}
        />
      ),
      mobileLabel: s.load,
    },
    // Last, so a column somebody just typed appears at the end of the table
    // rather than in the middle of the set they already know.
    ...(options?.formulas ?? []),
  ];
  return grouped
    ? nestDemoColumnGroups(columnGroupsDemoLeaves(leaves, locale, s), locale, s)
    : leaves;
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
      editValue: (r) => r.name,
      width: 240,
      accessor: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }}>
          <Avatar name={personName(row, locale)} />
          <span style={cellStack}>
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
        <span style={cellStack}>
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
          value={utilization(row)}
          meta={`${formatPercent(utilization(row), locale)} · ${allocationCount(row)}`}
        />
      ),
    },
  ];
  return leaves;
}

/**
 * What the demo's row actions actually do.
 *
 * Supplied by whoever owns the rows. Without them the actions can only say
 * they were clicked, which is what they used to do — and a Delete that
 * announces a deletion without performing one teaches the wrong thing about
 * the table.
 */
export interface DemoRowHandlers {
  /** Remove the row from the data. */
  readonly onDelete: (row: Person) => void;
}

export function makeActions(
  locale: Locale,
  handlers?: DemoRowHandlers
): RowAction<Person>[] {
  const s = strings(locale);
  return [
    {
      key: "edit",
      label: s.edit,
      icon: <EditIcon />,
      // The pencil opens the row's own fields rather than writing anything of
      // its own, so the table's built-in "Edit row" control stands down and
      // save and cancel come from the open row. Where a table has no row form
      // the action does not render at all.
      editsRow: true,
    },
    {
      key: "delete",
      label: s.remove,
      icon: <TrashIcon />,
      color: "red",
      confirm: {
        title: s.confirmTitle,
        message: (row) => s.confirmMessage(row.name),
        confirmLabel: s.remove,
        danger: true,
      },
      onClick: (row) => {
        if (!handlers) {
          notifyDemo({ message: `${s.remove}: ${row.name}`, tone: "danger" });
          return;
        }
        handlers.onDelete(row);
        notifyDemo({ message: `${s.remove}: ${row.name}`, tone: "danger" });
      },
      ai: { approval: { policy: "required" } },
    },
  ];
}

/** Bulk actions — passing these turns on row selection + the bulk bar. */
export function makeBulkActions(locale: Locale): BulkAction[] {
  const t =
    locale === "ar"
      ? { export: "تصدير", archive: "أرشفة", done: "تم" }
      : { export: "Export", archive: "Archive", done: "Done" };
  return [
    {
      key: "export",
      label: t.export,
      onClick: (ids) => notifyDemo({ message: `${t.export}: ${ids.length}` }),
    },
    {
      key: "archive",
      label: t.archive,
      onClick: (ids) =>
        notifyDemo({ message: `${t.archive}: ${ids.length}`, tone: "danger" }),
    },
  ];
}

/** The fields this dataset offers a pivot, in the order the panel lists them. */
export const PIVOT_FIELDS = [
  { key: "team", label: "Team" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "budget", label: "Budget" },
  { key: "utilization", label: "Utilization" },
];

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

export const DEMO_GROUP_AGGREGATES: SummaryRowFn<Person> = aggregate<Person>(
  { budget: "sum" },
  {
    // The same columns the table sorts by, so the subtotal reads the number
    // behind the formatted cell rather than parsing "$1,240".
    columns: BASE_COLUMNS,
    format: (value) => (
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
        {formatMoney(typeof value === "number" ? value : 0, "en")}
      </span>
    ),
  }
);
