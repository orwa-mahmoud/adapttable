import type {
  BulkAction,
  ColumnDef,
  ColumnLayoutState,
  ConfirmHandler,
  ConfirmRequest,
  FilterDef,
  RowAction,
} from "@adapttable/core";
import { buildFilterRuntime, resolveFilterDefs } from "@adapttable/core";
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
}

export const PEOPLE = people as Person[];

export type Locale = "en" | "ar";

interface Strings {
  search: string;
  name: string;
  person: string;
  email: string;
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
  edit: string;
  remove: string;
  confirmMessage: (name: string) => string;
  confirmTitle: string;
}

const STRINGS: Record<Locale, Strings> = {
  en: {
    search: "Search people…",
    name: "Name",
    person: "Person",
    email: "Email",
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
    edit: "Edit",
    remove: "Delete",
    confirmTitle: "Delete person?",
    confirmMessage: (name) => `Permanently delete "${name}"?`,
  },
  ar: {
    search: "ابحث عن الأشخاص…",
    name: "الاسم",
    person: "الشخص",
    email: "البريد الإلكتروني",
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
    edit: "تعديل",
    remove: "حذف",
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
 * Stable columns (keys + accessors) for the data hooks — locale-independent,
 * so sorting/keys never change with the language. The display columns
 * ({@link makeColumns}) add localized headers on top.
 */
export const BASE_COLUMNS: ColumnDef<Person>[] = [
  {
    key: "person",
    accessor: (r) => r.name,
    sortValue: (r) => r.name,
    sortable: true,
    header: "",
  },
  {
    key: "status",
    accessor: (r) => personStatus(r),
    sortValue: (r) => personStatus(r),
    sortable: true,
    header: "",
  },
  {
    key: "timeline",
    accessor: (r) => formatDate(startDate(r)),
    sortValue: (r) => startDate(r).getTime(),
    sortable: true,
    header: "",
  },
  {
    key: "budget",
    accessor: (r) => formatMoney(budget(r)),
    sortValue: (r) => budget(r),
    sortable: true,
    header: "",
  },
  {
    key: "load",
    accessor: (r) => formatPercent(utilization(r)),
    sortValue: (r) => utilization(r),
    sortable: true,
    header: "",
  },
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
 * columns but start hidden, so the table is clean by default yet has columns
 * to reveal. Revealing them (or pinning — see the showcase) widens the table
 * past its container so a pinned column visibly sticks while scrolling.
 */
export const LIVE_DEFAULT_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "team"],
};

export function makeColumns(
  locale: Locale,
  cells: DemoCells
): ColumnDef<Person>[] {
  const s = STRINGS[locale];
  const { Avatar, Status, Load } = cells;
  // Fixed pixel widths (not %) so revealing the hidden email/team columns
  // pushes the total past the container and the table scrolls horizontally —
  // the only way a pinned column can be seen to stick.
  return [
    {
      key: "person",
      header: s.person,
      sortable: true,
      sortValue: (r) => r.name,
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
      mobileLabel: s.person,
    },
    {
      key: "email",
      header: s.email,
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
      width: 130,
      mobileLabel: s.status,
    },
    {
      key: "timeline",
      header: s.timeline,
      sortValue: (r) => startDate(r).getTime(),
      sortable: true,
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
      sortable: true,
      align: "end",
      width: 130,
      mobileLabel: s.budget,
    },
    {
      key: "load",
      header: s.load,
      sortValue: (r) => utilization(r),
      sortable: true,
      width: 175,
      accessor: (row) => (
        <Load
          value={utilization(row)}
          meta={`${formatPercent(utilization(row), locale)} · ${allocationCount(row)}`}
        />
      ),
      mobileLabel: s.load,
    },
  ];
}

/**
 * A deliberately WIDE column set (8 fixed-px columns, ~1440px total) for the
 * column-management showcase — wide enough to scroll sideways so a pinned
 * column visibly sticks. `person` is the natural pin target; pair it with
 * `defaultColumnLayout={{ pinned: { person: "start" } }}`.
 */
export function makeWideColumns(
  locale: Locale,
  cells: DemoCells
): ColumnDef<Person>[] {
  const s = STRINGS[locale];
  const { Avatar, Status, Load } = cells;
  return [
    {
      key: "person",
      header: s.person,
      sortable: true,
      sortValue: (r) => r.name,
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
      width: 150,
    },
    {
      key: "team",
      header: s.team,
      i18n: { ar: "teamAr" },
      sortable: true,
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
      width: 140,
    },
    { key: "email", header: s.email, accessor: (r) => r.email, width: 240 },
    {
      key: "timeline",
      header: s.timeline,
      sortValue: (r) => startDate(r).getTime(),
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
      sortable: true,
      align: "end",
      width: 150,
    },
    {
      key: "load",
      header: s.load,
      sortValue: (r) => utilization(r),
      sortable: true,
      width: 190,
      accessor: (row) => (
        <Load
          value={utilization(row)}
          meta={`${formatPercent(utilization(row), locale)} · ${allocationCount(row)}`}
        />
      ),
    },
  ];
}

export function makeActions(locale: Locale): RowAction<Person>[] {
  const s = STRINGS[locale];
  return [
    {
      key: "edit",
      label: s.edit,
      icon: <EditIcon />,
      onClick: (row) => notifyDemo({ message: `${s.edit}: ${row.name}` }),
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
      onClick: (row) =>
        notifyDemo({ message: `${s.remove}: ${row.name}`, tone: "danger" }),
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

/* ── Demo filters (used by every adapter demo + the mock API) ───────── */

export const TEAMS = ["Core", "Platform", "Data", "Web", "Mobile"];
export const STATUSES = ["Active", "Planned", "Blocked", "Archived"] as const;
export type DemoStatus = (typeof STATUSES)[number];

export function allocationCount(row: Person): number {
  return ((Number(row.id) * 3) % 9) + 1;
}

export function budget(row: Person): number {
  return 18_000 + ((Number(row.id) * 7300) % 95_000);
}

export function utilization(row: Person): number {
  return 45 + ((Number(row.id) * 11) % 55);
}

export function startDate(row: Person): Date {
  const day = 1 + ((Number(row.id) * 7) % 26);
  const month = (Number(row.id) * 2) % 12;
  return new Date(Date.UTC(2026, month, day));
}

export function dueDate(row: Person): Date {
  const date = startDate(row);
  return new Date(date.getTime() + 1000 * 60 * 60 * 24 * 45);
}

export function personStatus(row: Person): DemoStatus {
  return STATUSES[Number(row.id) % STATUSES.length];
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
      type: "dateRange",
      label: s.startDate,
      getValue: (row) => startDate(row).toISOString(),
    },
    {
      key: "allocations",
      type: "numberRange",
      label: s.allocationFilter,
      getValue: allocationCount,
    },
  ];
}

/**
 * The derived filter runtime — predicate, array/number URL keys — shared by
 * BOTH data modes (the frontend hook filters rows with `filterFn`; the mock
 * backend applies the very same predicate server-side). Locale only changes
 * labels, never keys or matching, so one runtime serves every demo.
 */
export const DEMO_FILTER_RUNTIME = buildFilterRuntime(
  resolveFilterDefs<Person>([], demoFilterDefs("en"))
);

/** Client-side predicate; the mock API applies the same logic server-side. */
export const matchesDemoFilters = DEMO_FILTER_RUNTIME.filterFn;
