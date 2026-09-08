import {
  buildFilterRuntime,
  type BulkAction,
  type ColumnLayoutState,
  type ConfirmHandler,
  type ConfirmRequest,
  defaultFilterRegistry,
  type FilterDef,
  type FilterTypeSpec,
  formatMultiDraft,
  resolveFilterDefs,
  resolveFilterRegistry,
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
import people from "./people.json";

export const DEMO_NOTICE_EVENT = "adapttable-demo-notice";
export const DEMO_CONFIRM_EVENT = "adapttable-demo-confirm";

export interface DemoNotice {
  message: string;
  tone?: "info" | "danger";
}

export interface Person {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  /** Arabic-localized fields — the `i18n` column mapping points here. */
  nameAr: string;
  roleAr: string;
  teamAr: string;
  /**
   * Tree-page org chart. `null` is a root. Omit to derive “first on the
   * team leads it” from {@link PEOPLE} — the live demo’s shape.
   */
  managerId?: string | null;
  /** Editable overrides — the demo derives these from `id` until a cell
   * edit materializes a real value on the row. */
  status?: DemoStatus;
  budget?: number;
  utilization?: number;
  /** `YYYY-MM-DD`, once a date edit materializes one. */
  start?: string;
  /** Demo-only websocket revision used to exercise live-edit conflicts. */
  revision?: number;
  /** Editable override for the boolean editor. */
  remote?: boolean;
  /** Editable override for the multi-select editor. */
  skills?: string[];
}

export const PEOPLE = people as Person[];

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

/**
 * The org chart already inside the seed: the first person on each team leads
 * it, everyone else on that team reports to them. Derived rather than stored,
 * so the tree demo and every other demo read the identical thirty rows.
 */
const TEAM_LEAD = new Map<string, string>();
for (const person of PEOPLE) {
  if (!TEAM_LEAD.has(person.team)) TEAM_LEAD.set(person.team, person.id);
}

/** One line item under a person — the nested table's rows. */
export interface DemoOrder {
  id: string;
  item: string;
  qty: number;
  amount: number;
}

const ORDER_ITEMS = [
  "Analytical engine time",
  "Punch cards",
  "Compiler licence",
  "Support retainer",
];

/**
 * The orders under one person, derived from their id so the nested-table demo
 * needs no second seed file and stays stable across reloads.
 */
export function demoOrders(person: Person): DemoOrder[] {
  const seed = Number(person.id);
  const count = (seed % 3) + 2;
  return Array.from({ length: count }, (_, i) => ({
    id: `${person.id}-${i + 1}`,
    item: ORDER_ITEMS[(seed + i) % ORDER_ITEMS.length],
    qty: ((seed + i) % 5) + 1,
    amount: 1200 + ((seed * 137 + i * 419) % 8800),
  }));
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

/** The id of a person's manager, or `undefined` for a team lead. */
export function reportsTo(person: Person): string | undefined {
  if (person.managerId !== undefined) {
    return person.managerId ?? undefined;
  }
  const lead = TEAM_LEAD.get(person.team);
  return lead === person.id ? undefined : lead;
}

export type Locale = "en" | "ar";

interface Strings {
  search: string;
  name: string;
  person: string;
  email: string;
  trend: string;
  remote: string;
  skills: string;
  role: string;
  team: string;
  status: string;
  startDate: string;
  dueDate: string;
  budget: string;
  utilization: string;
  allocations: string;
  timeline: string;
  load: string;
  allocationFilter: string;
  budgetFilter: string;
  coreFilter: string;
  edit: string;
  remove: string;
  /** Spanning header over Name + Role (arrow stub). */
  groupContact: string;
  /** Spanning header over Team + Status. */
  groupAssignment: string;
  /** Spanning header over Timeline + Budget. */
  groupDelivery: string;
  /** Collapsed Delivery cell: money and the timeline length in days. */
  deliveryBrief: (money: string, days: number) => string;
  confirmMessage: (name: string) => string;
  confirmTitle: string;
  /** Rejection message for the editing demo's validated name column. */
  nameRequired: string;
}

const STRINGS: Record<Locale, Strings> = {
  en: {
    search: "Search people…",
    nameRequired: "A name is required",
    name: "Name",
    person: "Person",
    email: "Email",
    trend: "Trend",
    remote: "Remote",
    skills: "Skills",
    role: "Role",
    team: "Team",
    status: "Status",
    startDate: "Start",
    dueDate: "Due",
    budget: "Budget",
    utilization: "Utilization",
    allocations: "Allocations",
    timeline: "Timeline",
    load: "Load",
    allocationFilter: "Allocation count",
    budgetFilter: "Budget",
    coreFilter: "Core team",
    edit: "Edit",
    remove: "Delete",
    groupContact: "Contact",
    groupAssignment: "Assignment",
    groupDelivery: "Delivery",
    deliveryBrief: (money, days) => `${money} for ${days} days`,
    confirmTitle: "Delete person?",
    confirmMessage: (name) => `Permanently delete "${name}"?`,
  },
  ar: {
    search: "ابحث عن الأشخاص…",
    nameRequired: "الاسم مطلوب",
    name: "الاسم",
    person: "الشخص",
    email: "البريد الإلكتروني",
    trend: "الاتجاه",
    remote: "عن بُعد",
    skills: "المهارات",
    role: "الدور",
    team: "الفريق",
    status: "الحالة",
    startDate: "البداية",
    dueDate: "الاستحقاق",
    budget: "الميزانية",
    utilization: "الاستخدام",
    allocations: "التخصيصات",
    timeline: "الجدول الزمني",
    load: "الحمل",
    allocationFilter: "عدد التخصيصات",
    budgetFilter: "الميزانية",
    coreFilter: "الفريق الأساسي",
    edit: "تعديل",
    remove: "حذف",
    groupContact: "التواصل",
    groupAssignment: "التعيين",
    groupDelivery: "التسليم",
    deliveryBrief: (money, days) => `${money} لمدة ${days} يومًا`,
    confirmTitle: "حذف الشخص؟",
    confirmMessage: (name) => `هل تريد حذف "${name}" نهائيًا؟`,
  },
};

export function strings(locale: Locale): Strings {
  return STRINGS[locale];
}

/** The row's display name in the demo's active language. */
export function personName(row: Person, locale: Locale): string {
  return locale === "ar" ? row.nameAr : row.name;
}

/** The row's display role in the demo's active language. */
export function personRole(row: Person, locale: Locale): string {
  return locale === "ar" ? row.roleAr : row.role;
}

/** Localized labels for the canonical status values (values stay stable). */
export const STATUS_LABELS: Record<Locale, Record<DemoStatus, string>> = {
  en: {
    Active: "Active",
    Planned: "Planned",
    Blocked: "Blocked",
    Archived: "Archived",
  },
  ar: { Active: "نشط", Planned: "مخطط", Blocked: "محظور", Archived: "مؤرشف" },
};

/** Localized labels for the canonical team values (values stay stable). */
export const TEAM_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    Core: "Core",
    Platform: "Platform",
    Data: "Data",
    Web: "Web",
    Mobile: "Mobile",
  },
  ar: {
    Core: "الأساسية",
    Platform: "المنصة",
    Data: "البيانات",
    Web: "الويب",
    Mobile: "الجوال",
  },
};

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
 * when you switch to MUI. Only the live demo writes views to the address
 * bar (`urlSync`); Feature Lab and kit pages do not.
 */
export function demoSavedViews(urlKey?: string): UseSavedViewsOptions {
  return {
    storageKey: `adapttable-demo-views-${urlKey ?? "live"}`,
    urlKey,
    urlSync: demoUrlSync(urlKey),
  };
}

/**
 * Table query/layout hits the address bar on pages whose subject is that
 * persistence: the live demo, grouping, filtering (including find), and
 * aggregation (totals follow the same filter URL). Other feature pages stay
 * off so interacting does not rewrite the address.
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
    header: STRINGS.en.person,
    renameable: true,
  },
  {
    key: "status",
    accessor: (r) => personStatus(r),
    sortValue: (r) => personStatus(r),
    sortable: true,
    header: STRINGS.en.status,
  },
  {
    key: "timeline",
    accessor: (r) => formatDate(startDate(r)),
    sortValue: (r) => startDate(r).getTime(),
    sortable: true,
    header: STRINGS.en.timeline,
  },
  {
    key: "budget",
    accessor: (r) => formatMoney(budget(r)),
    sortValue: (r) => budget(r),
    sortable: true,
    header: STRINGS.en.budget,
  },
  // Utilization is derived, not stored — so it is declared once with
  // `computed` rather than written into `accessor` and repeated in
  // `sortValue`. The cell shows a percentage; sorting and export see the
  // number behind it.
  computed<Person, number>({
    key: "load",
    header: STRINGS.en.load,
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
  const s = STRINGS[locale];
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
      sortValue: (r) => startDate(r).getTime(),
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
      width: 130,
      mobileLabel: s.budget,
    },
    {
      key: "load",
      header: s.load,
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
  const s = STRINGS[locale];
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
  /** Change something real about the row, visibly. */
  readonly onEdit: (row: Person) => void;
  /** Remove the row from the data. */
  readonly onDelete: (row: Person) => void;
}

export function makeActions(
  locale: Locale,
  handlers?: DemoRowHandlers
): RowAction<Person>[] {
  const s = STRINGS[locale];
  return [
    {
      key: "edit",
      label: s.edit,
      icon: <EditIcon />,
      onClick: (row) => {
        if (!handlers) {
          notifyDemo({ message: `${s.edit}: ${row.name}` });
          return;
        }
        handlers.onEdit(row);
      },
      // Agent invocation is a different question from a person clicking it:
      // this one changes a cell, so it asks first.
      ai: { approval: { policy: "required" } },
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

/** The next status in the cycle — what the demo's Edit action changes. */
export function nextStatus(row: Person): DemoStatus {
  const current = personStatus(row);
  const at = STATUSES.indexOf(current);
  return STATUSES[(at + 1) % STATUSES.length];
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

/* ── Demo filters (used by every adapter demo + the mock API) ───────── */

export const TEAMS = ["Core", "Platform", "Data", "Web", "Mobile"];
export const STATUSES = ["Active", "Planned", "Blocked", "Archived"] as const;
export type DemoStatus = (typeof STATUSES)[number];

export function allocationCount(row: Person): number {
  return ((Number(row.id) * 3) % 9) + 1;
}

export function budget(row: Person): number {
  return row.budget ?? 18_000 + ((Number(row.id) * 7300) % 95_000);
}

export function utilization(row: Person): number {
  return row.utilization ?? 45 + ((Number(row.id) * 11) % 55);
}

/** Derived until a cell edit materializes one — the boolean editor's column. */
export function isRemote(row: Person): boolean {
  return row.remote ?? Number(row.id) % 3 === 0;
}

/** The values the multi-select editor offers, and what each row starts with. */
export const SKILLS = ["react", "typescript", "design", "infra"] as const;

export function personSkills(row: Person): string[] {
  if (row.skills) return row.skills;
  const seed = Number(row.id) || 1;
  return SKILLS.filter((_, index) => (seed >> index) % 2 === 1);
}

/** Eight weeks of load, derived so the sparkline needs no second seed. */
export function loadHistory(row: Person): number[] {
  const base = utilization(row);
  const seed = Number(row.id) || 1;
  return Array.from({ length: 8 }, (_, week) => {
    const wobble = ((seed * (week + 3)) % 17) - 8;
    return Math.max(0, Math.min(100, base + wobble));
  });
}

export function startDate(row: Person): Date {
  if (row.start !== undefined) {
    const [year, month, day] = row.start.split("-").map(Number);
    return new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1));
  }
  const day = 1 + ((Number(row.id) * 7) % 26);
  const month = (Number(row.id) * 2) % 12;
  return new Date(Date.UTC(2026, month, day));
}

export function dueDate(row: Person): Date {
  const date = startDate(row);
  return new Date(date.getTime() + 1000 * 60 * 60 * 24 * 35);
}

/** Inclusive timeline length in whole days (due minus start). */
export function timelineDays(row: Person): number {
  const ms = dueDate(row).getTime() - startDate(row).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function personStatus(row: Person): DemoStatus {
  return row.status ?? STATUSES[Number(row.id) % STATUSES.length];
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

/* ── The large directory (Feature Lab, "Large data") ────────────────── */

/** How many rows the Feature Lab's large-data mode holds. */
export const LARGE_ROW_COUNT = 40_000;

/**
 * The areas the large directory's squads belong to.
 *
 * Twelve areas × ten squads is {@link LARGE_TEAM_COUNT} distinct values in
 * the `team` column — well past the forty-value line where the checklist
 * filter stops rendering every option and starts windowing them. That
 * threshold is the reason this dataset exists: five teams can never show it.
 */
const LARGE_AREAS = [
  "Core",
  "Platform",
  "Data",
  "Web",
  "Mobile",
  "Infra",
  "Payments",
  "Identity",
  "Search",
  "Growth",
  "Billing",
  "Support",
] as const;

const LARGE_AREAS_AR = [
  "الأساس",
  "المنصة",
  "البيانات",
  "الويب",
  "الجوال",
  "البنية",
  "المدفوعات",
  "الهوية",
  "البحث",
  "النمو",
  "الفواتير",
  "الدعم",
] as const;

/** Squads per area. */
const LARGE_SQUADS = 10;

/** Distinct values the large directory's `team` column carries. */
export const LARGE_TEAM_COUNT = LARGE_AREAS.length * LARGE_SQUADS;

const LARGE_FIRST = [
  "Amara",
  "Diego",
  "Priya",
  "Sefa",
  "Lena",
  "Marcus",
  "Yuki",
  "Fatima",
  "Tomas",
  "Chioma",
  "Henrik",
  "Sofia",
  "Omar",
  "Grace",
  "Noah",
  "Aisha",
] as const;

const LARGE_FIRST_AR = [
  "أمارا",
  "دييغو",
  "بريا",
  "سيفا",
  "لينا",
  "ماركوس",
  "يوكي",
  "فاطمة",
  "توماس",
  "تشيوما",
  "هنريك",
  "صوفيا",
  "عمر",
  "غريس",
  "نوح",
  "عائشة",
] as const;

const LARGE_LAST = [
  "Okafor",
  "Marchetti",
  "Nair",
  "Demir",
  "Hoffmann",
  "Bell",
  "Tanaka",
  "Al-Sayed",
  "Novak",
  "Eze",
  "Larsson",
  "Reyes",
  "Haddad",
  "Liu",
  "Schmidt",
  "Chen",
] as const;

const LARGE_ROLES = [
  "Engineer",
  "Designer",
  "Researcher",
  "Manager",
  "Analyst",
  "Architect",
  "Writer",
  "Producer",
] as const;

const LARGE_ROLES_AR = [
  "مهندس",
  "مصمم",
  "باحث",
  "مدير",
  "محلل",
  "معماري",
  "كاتب",
  "منتج",
] as const;

/**
 * Build a directory of `count` people.
 *
 * Ids are the sequence `1…count` as strings, which is what every derived
 * accessor in this file reads — `budget`, `utilization`, `personStatus`,
 * `startDate`, `loadHistory` and the sparkline all key off `Number(row.id)`.
 * So a generated row answers every column the small seed answers, and the
 * two datasets differ in size and in team spread, nothing else.
 *
 * Nothing calls this at module scope: forty thousand rows built on import
 * would be paid for by every page that reads this file. The Feature Lab
 * builds them when the reader asks for them.
 */
export function makeLargeDirectory(count = LARGE_ROW_COUNT): Person[] {
  return Array.from({ length: count }, (_, index) => largePerson(index));
}

/** One row of the large directory, addressed by its position. */
function largePerson(index: number): Person {
  const area = index % LARGE_AREAS.length;
  const squad = Math.floor(index / LARGE_AREAS.length) % LARGE_SQUADS;
  const first = index % LARGE_FIRST.length;
  const last = (index * 7) % LARGE_LAST.length;
  const role = (index * 5) % LARGE_ROLES.length;
  const team = `${LARGE_AREAS[area]} ${String(squad + 1).padStart(2, "0")}`;
  const teamAr = `${LARGE_AREAS_AR[area]} ${String(squad + 1).padStart(2, "0")}`;
  return {
    id: String(index + 1),
    name: `${LARGE_FIRST[first]} ${LARGE_LAST[last]}`,
    // The id keeps the address unique where a name repeats.
    email: `${LARGE_FIRST[first].toLowerCase()}.${index + 1}@example.com`,
    role: LARGE_ROLES[role],
    team,
    nameAr: `${LARGE_FIRST_AR[first]} ${LARGE_LAST[last]}`,
    roleAr: LARGE_ROLES_AR[role],
    teamAr,
  };
}

export function formatDate(date: Date, locale: Locale = "en"): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatMoney(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar" : "en", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

/**
 * The showcase's entire filter wiring, as data. Each adapter auto-builds a
 * kit-native form from these definitions, and the chips, the URL params
 * (array/number keys self-register) and the client-side predicate are all
 * derived — no hand-built panels, label maps, chip builders or clear
 * handlers anywhere in the showcase.
 */
export function demoFilterDefs(locale: Locale): FilterDef<Person>[] {
  const s = STRINGS[locale];
  return [
    {
      key: "name",
      column: "person",
      type: "personText",
      label: s.person,
      getValue: (row) => row.name,
    },
    {
      key: "team",
      type: "multiSelect",
      label: s.team,
      options: TEAMS.map((team) => ({
        value: team,
        label: TEAM_LABELS[locale][team] ?? team,
      })),
      // Filtering matches the CANONICAL value whatever language is shown.
      getValue: (row) => row.team,
    },
    {
      key: "status",
      type: "multiSelect",
      label: s.status,
      options: STATUSES.map((status) => ({
        value: status,
        label: STATUS_LABELS[locale][status],
      })),
      getValue: personStatus,
    },
    {
      key: "budget",
      type: "numberRange",
      label: s.budgetFilter,
      getValue: budget,
    },
    {
      key: "start",
      column: "timeline",
      type: "dateRange",
      label: s.startDate,
      getValue: (row) => startDate(row).toISOString(),
    },
    {
      key: "allocations",
      column: "load",
      type: "numberRange",
      label: s.allocationFilter,
      getValue: allocationCount,
    },
    {
      key: "core",
      type: "boolean",
      label: s.coreFilter,
      getValue: (row) => row.team === "Core",
    },
  ];
}

/**
 * Feature Lab only — Team as the Excel checklist so that mode has a
 * home. The live demo stays on `multiSelect`; the type is configuration,
 * not a control on the page.
 */
export function kitchenFilterDefs(locale: Locale): FilterDef<Person>[] {
  return demoFilterDefs(locale).map((def) =>
    def.key === "team" ? { ...def, type: "checklist" } : def
  );
}

/**
 * Alias of the built-in text type. The live demos point the name filter
 * at `personText` so a missing registry would blank the header widget —
 * the seam is real, not a special case for `"text"`.
 */
export function demoFilterTypes(): FilterTypeSpec[] {
  const text = defaultFilterRegistry.get("text");
  if (!text) return [];
  return [{ ...text, type: "personText" }];
}

/**
 * The derived filter runtime — predicate, array/number URL keys — shared by
 * BOTH data modes (the frontend hook filters rows with `filterFn`; the mock
 * backend applies the very same predicate server-side). Locale only changes
 * labels, never keys or matching, so one runtime serves every demo.
 */
export const DEMO_FILTER_RUNTIME = buildFilterRuntime(
  resolveFilterDefs<Person>([], demoFilterDefs("en")),
  resolveFilterRegistry(demoFilterTypes())
);

/** Client-side predicate; the mock API applies the same logic server-side. */
export const matchesDemoFilters = DEMO_FILTER_RUNTIME.filterFn;

/**
 * Per-group budget subtotal for the opt-in grouping demo (frontend path
 * only), built with the `aggregate` helper rather than a hand-rolled reduce.
 * Shares the `summaryRow` mapper shape — one function type for footer totals
 * and group headers.
 */
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
