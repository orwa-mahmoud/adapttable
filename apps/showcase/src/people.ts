/**
 * The demo's people and everything derived from them, free of any framework.
 *
 * Every showcase page — React or Angular — and the mock API read the same
 * thirty people through this module: the derived fields a cell shows, the
 * labels in both languages, the formatters, and the filter definitions with the
 * runtime built from them. Nothing here renders, so a page in any framework can
 * import it without bringing another framework's code along.
 */
import {
  buildFilterRuntime,
  defaultFilterRegistry,
  type FilterDef,
  type FilterTypeSpec,
  resolveFilterDefs,
  resolveFilterRegistry,
} from "@adapttable/core";

import people from "./people.json";

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

export type Locale = "en" | "ar";

export interface Strings {
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

/**
 * The value at `index`, wrapping around the list — how the derived fields
 * spread a seed across a fixed set.
 */
function cycle<T>(values: readonly T[], index: number): T {
  const value = values[index % values.length];
  if (value === undefined) {
    throw new Error(
      `no value at ${String(index)} in a list of ${String(values.length)}`
    );
  }
  return value;
}

export function personStatus(row: Person): DemoStatus {
  return row.status ?? cycle(STATUSES, Number(row.id));
}

/** Complete derived fields for a summary row whose id is not a person's numeric seed. */
export function summaryPerson(id: string, name: string, nameAr = name): Person {
  return {
    id,
    name,
    email: "",
    role: "",
    team: "All",
    nameAr,
    roleAr: "",
    teamAr: "الكل",
    status: "Active",
    budget: 0,
    utilization: 0,
    start: "2026-01-01",
  };
}

/**
 * One formatter per locale, built on first use.
 *
 * These run per cell per render — a grouped table asks for a few hundred at
 * a time — and building an `Intl` formatter is far more expensive than using
 * one.
 */
function formatter<TFormat>(build: (tag: string) => TFormat) {
  const made = new Map<string, TFormat>();
  return (locale: Locale): TFormat => {
    const tag = locale === "ar" ? "ar" : "en";
    const existing = made.get(tag);
    if (existing) return existing;
    const next = build(tag);
    made.set(tag, next);
    return next;
  };
}

const dateFormat = formatter(
  (tag) =>
    new Intl.DateTimeFormat(tag, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
);

const moneyFormat = formatter(
  (tag) =>
    new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    })
);

const percentFormat = formatter(
  (tag) =>
    new Intl.NumberFormat(tag, {
      style: "percent",
      maximumFractionDigits: 0,
    })
);

const monthFormat = formatter(
  (tag) => new Intl.DateTimeFormat(tag, { month: "long", year: "numeric" })
);

export function formatDate(date: Date, locale: Locale = "en"): string {
  return dateFormat(locale).format(date);
}

/** The month a date falls in — what grouping a timeline buckets by. */
export function formatMonth(date: Date, locale: Locale = "en"): string {
  return monthFormat(locale).format(date);
}

export function formatMoney(value: number, locale: Locale = "en"): string {
  return moneyFormat(locale).format(value);
}

export function formatPercent(value: number, locale: Locale = "en"): string {
  return percentFormat(locale).format(value / 100);
}

const countFormat = formatter((tag) => new Intl.NumberFormat(tag));

/** A count, as the locale writes whole numbers. */
export function formatCount(value: number, locale: Locale = "en"): string {
  return countFormat(locale).format(value);
}

/**
 * A Budget subtotal as text: money, except a count of rows, which counts.
 *
 * @param value - The computed aggregate.
 * @param aggregation - The operation that produced it.
 * @param locale - The active locale.
 * @returns The subtotal as the column reads it.
 */
export function budgetAggregateText(
  value: number,
  aggregation?: string,
  locale: Locale = "en"
): string {
  return aggregation === "count"
    ? formatCount(value, locale)
    : formatMoney(value, locale);
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

/**
 * One row of the large directory, addressed by its position — so a paged
 * server can answer any slice without building the rows before it.
 */
export function largePerson(index: number): Person {
  const area = index % LARGE_AREAS.length;
  const squad = Math.floor(index / LARGE_AREAS.length) % LARGE_SQUADS;
  const first = index % LARGE_FIRST.length;
  const last = (index * 7) % LARGE_LAST.length;
  const role = (index * 5) % LARGE_ROLES.length;
  const squadNumber = String(squad + 1).padStart(2, "0");
  const firstName = cycle(LARGE_FIRST, first);
  const lastName = cycle(LARGE_LAST, last);
  return {
    id: String(index + 1),
    name: `${firstName} ${lastName}`,
    // The id keeps the address unique where a name repeats.
    email: `${firstName.toLowerCase()}.${index + 1}@example.com`,
    role: cycle(LARGE_ROLES, role),
    team: `${cycle(LARGE_AREAS, area)} ${squadNumber}`,
    nameAr: `${cycle(LARGE_FIRST_AR, first)} ${lastName}`,
    roleAr: cycle(LARGE_ROLES_AR, role),
    teamAr: `${cycle(LARGE_AREAS_AR, area)} ${squadNumber}`,
  };
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

/** The id of a person's manager, or `undefined` for a team lead. */
export function reportsTo(person: Person): string | undefined {
  if (person.managerId !== undefined) {
    return person.managerId ?? undefined;
  }
  const lead = TEAM_LEAD.get(person.team);
  return lead === person.id ? undefined : lead;
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
    item: cycle(ORDER_ITEMS, seed + i),
    qty: ((seed + i) % 5) + 1,
    amount: 1200 + ((seed * 137 + i * 419) % 8800),
  }));
}
