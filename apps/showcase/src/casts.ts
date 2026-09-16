/**
 * Per-page demo rosters.
 *
 * The live root (`/`) and Feature Lab keep {@link PEOPLE} — Ada's directory,
 * the product's familiar thirty rows. Every other page gets a cast shaped
 * for what that page is teaching: one org tree, uneven squads, a filterable
 * roster, Arabic-first names on RTL. Same `Person` shape so columns, editors
 * and filters stay shared; different people so the same face is not the
 * picture of every feature.
 */
import type { ColumnLayoutState } from "@adapttable/core";

import {
  budget,
  LIVE_DEFAULT_LAYOUT,
  PEOPLE,
  type Person,
  personStatus,
  SPAN_DEFAULT_LAYOUT,
  utilization,
} from "./data";

export type DemoScenario =
  | "live"
  | "landing"
  | "tree"
  | "grouping"
  | "editing"
  | "filtering"
  | "columns"
  | "selection"
  | "mobile"
  | "formulas"
  | "pivot"
  | "saved-views"
  | "rtl"
  | "realtime"
  | "export"
  | "column-groups"
  | "rows"
  | "row-reordering"
  | "aggregation"
  | "nested-tables"
  | "accessibility";

const AR_TEAM: Record<string, string> = {
  Core: "الأساسية",
  Platform: "المنصة",
  Data: "البيانات",
  Web: "الويب",
  Mobile: "الجوال",
};

const AR_ROLE: Record<string, string> = {
  Engineer: "مهندس",
  "Staff Engineer": "مهندس أول",
  Lead: "قائد",
  Designer: "مصمم",
  CTO: "المدير التقني",
  Analyst: "محلل",
  Manager: "مدير",
  Founder: "مؤسس",
  "QA Engineer": "مهندس جودة",
  "Product Designer": "مصمم منتج",
};

function emailOf(name: string): string {
  let local = name.toLowerCase().replaceAll(/[^a-z]+/g, ".");
  while (local.startsWith(".")) local = local.slice(1);
  while (local.endsWith(".")) local = local.slice(0, -1);
  return `${local}@example.com`;
}

function p(
  id: string,
  name: string,
  role: string,
  team: string,
  nameAr: string,
  extra?: Partial<Person>
): Person {
  return {
    id,
    name,
    email: emailOf(name),
    role,
    team,
    nameAr,
    roleAr: AR_ROLE[role] ?? "مهندس",
    teamAr: AR_TEAM[team] ?? team,
    ...extra,
  };
}

/** Kit landing — a working directory, not Ada's. Compact like the live demo. */
const CAST_LANDING: Person[] = [
  p("101", "Priya Nair", "Staff Engineer", "Platform", "بريا نير"),
  p("102", "Jonah Okonkwo", "Engineer", "Platform", "جوناه أوكونكو"),
  p("103", "Mira Haddad", "Designer", "Web", "ميرا حداد"),
  p("104", "Sefa Demir", "Lead", "Data", "سيفا دمير"),
  p("105", "Lena Hoffmann", "Engineer", "Core", "لينا هوفمان"),
  p("106", "Omar Reyes", "Analyst", "Data", "عمر رييس"),
  p("107", "Yuki Tanaka", "Engineer", "Mobile", "يوكي تاناكا"),
  p("108", "Chioma Eze", "Manager", "Core", "تشيوما إيزي"),
  p("109", "Tomas Novak", "QA Engineer", "Web", "توماس نوفاك"),
  p("110", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد"),
  p("111", "Henrik Larsson", "Lead", "Platform", "هنريك لارسن"),
  p("112", "Sofia Marchetti", "Designer", "Core", "صوفيا ماركيتي"),
];

/**
 * One company, one root. Maya is CTO; four leads report to her; ICs report
 * to a lead. `managerId` is set on every row so first-of-team is not the tree.
 */
const CAST_ORG: Person[] = [
  p("201", "Maya Chen", "CTO", "Core", "مايا تشن", { managerId: null }),
  p("202", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو", {
    managerId: "201",
  }),
  p("203", "Mira Haddad", "Lead", "Web", "ميرا حداد", { managerId: "201" }),
  p("204", "Sefa Demir", "Lead", "Data", "سيفا دمير", { managerId: "201" }),
  p("205", "Yuki Tanaka", "Lead", "Mobile", "يوكي تاناكا", {
    managerId: "201",
  }),
  p("206", "Priya Nair", "Staff Engineer", "Platform", "بريا نير", {
    managerId: "202",
  }),
  p("207", "Lena Hoffmann", "Engineer", "Platform", "لينا هوفمان", {
    managerId: "202",
  }),
  p("208", "Henrik Larsson", "Engineer", "Platform", "هنريك لارسن", {
    managerId: "202",
  }),
  p("209", "Tomas Novak", "Designer", "Web", "توماس نوفاك", {
    managerId: "203",
  }),
  p("210", "Sofia Marchetti", "Engineer", "Web", "صوفيا ماركيتي", {
    managerId: "203",
  }),
  p("211", "Omar Reyes", "Analyst", "Data", "عمر رييس", { managerId: "204" }),
  p("212", "Chioma Eze", "Engineer", "Data", "تشيوما إيزي", {
    managerId: "204",
  }),
  p("213", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد", {
    managerId: "205",
  }),
  p("214", "Diego Okafor", "Engineer", "Mobile", "دييغو أوكفور", {
    managerId: "205",
  }),
  p("215", "Fatima Bell", "QA Engineer", "Core", "فاطمة بل", {
    managerId: "201",
  }),
];

/**
 * Clustered by team, uneven sizes — grouping subtotals are visibly different
 * (Platform is a crowd, Web is a pair).
 */
const CAST_SQUADS: Person[] = [
  p("301", "Priya Nair", "Staff Engineer", "Platform", "بريا نير"),
  p("302", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو"),
  p("303", "Lena Hoffmann", "Engineer", "Platform", "لينا هوفمان"),
  p("304", "Henrik Larsson", "Engineer", "Platform", "هنريك لارسن"),
  p("305", "Diego Okafor", "Engineer", "Platform", "دييغو أوكفور"),
  p("306", "Amara Liu", "QA Engineer", "Platform", "أمارا ليو"),
  p("307", "Marcus Bell", "Engineer", "Platform", "ماركوس بل"),
  p("308", "Noah Schmidt", "Engineer", "Platform", "نوح شميدت"),
  p("309", "Chioma Eze", "Manager", "Core", "تشيوما إيزي"),
  p("310", "Fatima Bell", "Engineer", "Core", "فاطمة بل"),
  p("311", "Elena Reyes", "Designer", "Core", "إيلينا رييس"),
  p("312", "Sefa Demir", "Lead", "Data", "سيفا دمير"),
  p("313", "Omar Reyes", "Analyst", "Data", "عمر رييس"),
  p("314", "Kwame Nair", "Engineer", "Data", "كوامي نير"),
  p("315", "Bella Hoffmann", "Analyst", "Data", "بيلا هوفمان"),
  p("316", "Rohan Haddad", "Engineer", "Data", "روهان حداد"),
  p("317", "Mira Haddad", "Lead", "Web", "ميرا حداد"),
  p("318", "Tomas Novak", "Designer", "Web", "توماس نوفاك"),
  p("319", "Yuki Tanaka", "Lead", "Mobile", "يوكي تاناكا"),
  p("320", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد"),
  p("321", "Sofia Marchetti", "Engineer", "Mobile", "صوفيا ماركيتي"),
  p("322", "Grace Liu", "QA Engineer", "Mobile", "غريس ليو"),
  p("323", "Lucas Demir", "Engineer", "Mobile", "لوكاس دمير"),
  p("324", "Hannah Eze", "Designer", "Mobile", "هانا إيزي"),
];

/** Editing roster — mixed status so selects and conflicts have somewhere to go. */
const CAST_ROSTER: Person[] = [
  p("401", "Priya Nair", "Staff Engineer", "Platform", "بريا نير", {
    status: "Active",
  }),
  p("402", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو", {
    status: "Planned",
  }),
  p("403", "Mira Haddad", "Designer", "Web", "ميرا حداد", {
    status: "Blocked",
  }),
  p("404", "Sefa Demir", "Lead", "Data", "سيفا دمير", { status: "Active" }),
  p("405", "Lena Hoffmann", "Engineer", "Core", "لينا هوفمان", {
    status: "Archived",
  }),
  p("406", "Omar Reyes", "Analyst", "Data", "عمر رييس", { status: "Active" }),
  p("407", "Yuki Tanaka", "Engineer", "Mobile", "يوكي تاناكا", {
    status: "Planned",
  }),
  p("408", "Chioma Eze", "Manager", "Core", "تشيوما إيزي", {
    status: "Active",
  }),
  p("409", "Tomas Novak", "QA Engineer", "Web", "توماس نوفاك", {
    status: "Blocked",
  }),
  p("410", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد", {
    status: "Active",
  }),
  p("411", "Henrik Larsson", "Lead", "Platform", "هنريك لارسن", {
    status: "Planned",
  }),
  p("412", "Sofia Marchetti", "Designer", "Core", "صوفيا ماركيتي", {
    status: "Active",
  }),
];

/**
 * Filtering / saved-views / selection — distinct teams and statuses so a
 * filter finds a handful, not everyone or no one.
 */
const CAST_CONSULTANTS: Person[] = [
  p("501", "Priya Nair", "Staff Engineer", "Platform", "بريا نير", {
    status: "Active",
  }),
  p("502", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو", {
    status: "Active",
  }),
  p("503", "Lena Hoffmann", "Engineer", "Platform", "لينا هوفمان", {
    status: "Blocked",
  }),
  p("504", "Mira Haddad", "Designer", "Web", "ميرا حداد", {
    status: "Planned",
  }),
  p("505", "Tomas Novak", "QA Engineer", "Web", "توماس نوفاك", {
    status: "Planned",
  }),
  p("506", "Sefa Demir", "Lead", "Data", "سيفا دمير", { status: "Active" }),
  p("507", "Omar Reyes", "Analyst", "Data", "عمر رييس", { status: "Archived" }),
  p("508", "Kwame Nair", "Engineer", "Data", "كوامي نير", { status: "Active" }),
  p("509", "Chioma Eze", "Manager", "Core", "تشيوما إيزي", {
    status: "Active",
  }),
  p("510", "Fatima Bell", "Engineer", "Core", "فاطمة بل", {
    status: "Blocked",
  }),
  p("511", "Yuki Tanaka", "Lead", "Mobile", "يوكي تاناكا", {
    status: "Planned",
  }),
  p("512", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد", {
    status: "Active",
  }),
  p("513", "Diego Okafor", "Engineer", "Mobile", "دييغو أوكفور", {
    status: "Archived",
  }),
  p("514", "Sofia Marchetti", "Designer", "Core", "صوفيا ماركيتي", {
    status: "Planned",
  }),
  p("515", "Henrik Larsson", "Engineer", "Platform", "هنريك لارسن", {
    status: "Active",
  }),
  p("516", "Elena Reyes", "Analyst", "Data", "إيلينا رييس", {
    status: "Blocked",
  }),
];

/** Short names, few rows — what a phone card should hold. */
const CAST_CONTACTS: Person[] = [
  p("801", "Priya Nair", "Staff Engineer", "Platform", "بريا نير"),
  p("802", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو"),
  p("803", "Mira Haddad", "Designer", "Web", "ميرا حداد"),
  p("804", "Sefa Demir", "Lead", "Data", "سيفا دمير"),
  p("805", "Yuki Tanaka", "Lead", "Mobile", "يوكي تاناكا"),
  p("806", "Chioma Eze", "Manager", "Core", "تشيوما إيزي"),
  p("807", "Omar Reyes", "Analyst", "Data", "عمر رييس"),
  p("808", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد"),
];

/**
 * Formulas page. Id `"1"` keeps `budget * 0.15` at 3795 so the arithmetic
 * e2e still reads a known cell; the name is not Ada.
 */
const CAST_FORMULAS: Person[] = [
  p("1", "Priya Nair", "Engineer", "Core", "بريا نير"),
  p("2", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو"),
  p("3", "Mira Haddad", "Designer", "Web", "ميرا حداد"),
  p("4", "Sefa Demir", "Analyst", "Data", "سيفا دمير"),
  p("5", "Yuki Tanaka", "Engineer", "Mobile", "يوكي تاناكا"),
  p("6", "Chioma Eze", "Manager", "Core", "تشيوما إيزي"),
  p("7", "Omar Reyes", "Analyst", "Data", "عمر رييس"),
  p("8", "Lena Hoffmann", "Engineer", "Platform", "لينا هوفمان"),
];

/** Arabic-first identities — RTL is the native reading of this roster. */
const CAST_RTL: Person[] = [
  p("1101", "Layla Hassan", "Staff Engineer", "Platform", "ليلى حسن"),
  p("1102", "Yusuf Karim", "Lead", "Platform", "يوسف كريم"),
  p("1103", "Fatima Al-Najjar", "Designer", "Web", "فاطمة النجار"),
  p("1104", "Omar Haddad", "Analyst", "Data", "عمر حداد"),
  p("1105", "Nour Saleh", "Engineer", "Core", "نور صالح"),
  p("1106", "Hana Ibrahim", "Lead", "Data", "هناء إبراهيم"),
  p("1107", "Karim Mansour", "Engineer", "Mobile", "كريم منصور"),
  p("1108", "Amina Farouk", "Manager", "Core", "أمينة فاروق"),
  p("1109", "Ziad Osman", "QA Engineer", "Web", "زياد عثمان"),
  p("1110", "Salma Rashid", "Engineer", "Mobile", "سلمى راشد"),
  p("1111", "Tariq Nasser", "Lead", "Platform", "طارق ناصر"),
  p("1112", "Rania Khoury", "Designer", "Core", "رانيا خوري"),
];

const CAST_WIDE: Person[] = [
  p("601", "Priya Nair", "Staff Engineer", "Platform", "بريا نير"),
  p("602", "Jonah Okonkwo", "Lead", "Platform", "جوناه أوكونكو"),
  p("603", "Mira Haddad", "Product Designer", "Web", "ميرا حداد"),
  p("604", "Sefa Demir", "Lead", "Data", "سيفا دمير"),
  p("605", "Lena Hoffmann", "Engineer", "Core", "لينا هوفمان"),
  p("606", "Omar Reyes", "Analyst", "Data", "عمر رييس"),
  p("607", "Yuki Tanaka", "Engineer", "Mobile", "يوكي تاناكا"),
  p("608", "Chioma Eze", "Manager", "Core", "تشيوما إيزي"),
  p("609", "Tomas Novak", "QA Engineer", "Web", "توماس نوفاك"),
  p("610", "Aisha Al-Sayed", "Engineer", "Mobile", "عائشة السيد"),
  p("611", "Henrik Larsson", "Lead", "Platform", "هنريك لارسن"),
  p("612", "Sofia Marchetti", "Designer", "Core", "صوفيا ماركيتي"),
];

function clone(rows: readonly Person[]): Person[] {
  return rows.map((row) => ({ ...row }));
}

function withFields(rows: readonly Person[]): Person[] {
  return rows.map((person) => ({
    ...person,
    status: person.status ?? personStatus(person),
    budget: person.budget ?? budget(person),
    utilization: person.utilization ?? utilization(person),
  }));
}

/** Rows the table mounts for this page. Live / Lab omit a scenario → PEOPLE. */
export function rosterFor(scenario: DemoScenario): readonly Person[] {
  switch (scenario) {
    case "live":
      return PEOPLE;
    case "landing":
      return CAST_LANDING;
    case "tree":
      return CAST_ORG;
    case "grouping":
    case "aggregation":
    case "pivot":
    case "export":
      return CAST_SQUADS;
    case "editing":
    case "realtime":
      return CAST_ROSTER;
    case "filtering":
    case "saved-views":
    case "selection":
      return CAST_CONSULTANTS;
    case "mobile":
      return CAST_CONTACTS;
    case "formulas":
      return CAST_FORMULAS;
    case "rtl":
      return CAST_RTL;
    case "columns":
    case "column-groups":
      return CAST_WIDE;
    case "rows":
      return CAST_SQUADS;
    case "row-reordering":
      return PEOPLE;
    case "nested-tables":
    case "accessibility":
      return CAST_LANDING;
  }
}

const TREE_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load", "timeline"],
};
const GROUPING_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load", "team"],
};
const FILTER_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load"],
};
const MOBILE_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load", "timeline", "budget"],
};
const FORMULAS_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load", "timeline"],
};
const REALTIME_LAYOUT: Partial<ColumnLayoutState> = {
  hidden: ["email", "load", "timeline"],
};

/**
 * Compact layouts that keep the feature on screen. `undefined` means the
 * page already passes its own layout (or the live default).
 */
export function layoutFor(
  scenario: DemoScenario
): Partial<ColumnLayoutState> | undefined {
  switch (scenario) {
    case "live":
      return undefined;
    case "landing":
      return LIVE_DEFAULT_LAYOUT;
    case "tree":
      return TREE_LAYOUT;
    case "grouping":
    case "aggregation":
    case "export":
      return GROUPING_LAYOUT;
    case "filtering":
    case "saved-views":
    case "selection":
      return FILTER_LAYOUT;
    case "mobile":
      return MOBILE_LAYOUT;
    case "formulas":
      return FORMULAS_LAYOUT;
    case "realtime":
      return REALTIME_LAYOUT;
    case "rows":
      return SPAN_DEFAULT_LAYOUT;
    case "nested-tables":
    case "accessibility":
      return FILTER_LAYOUT;
    default:
      return undefined;
  }
}

/** Whole-set pages: a 5-row page would hide the groups / the tree. */
export function pageLimitFor(scenario: DemoScenario): number | undefined {
  if (
    scenario === "tree" ||
    scenario === "grouping" ||
    scenario === "aggregation" ||
    scenario === "row-reordering" ||
    scenario === "export" ||
    scenario === "pivot"
  ) {
    return 30;
  }
  if (scenario === "mobile") return 8;
  return undefined;
}

export function seedRoster(
  scenario: DemoScenario,
  derivedFields: boolean
): Person[] {
  const rows = clone(rosterFor(scenario));
  return derivedFields ? withFields(rows) : rows;
}

/** Pivot page — fields materialized, squads not Ada's thirty. */
export function pivotRoster(): Person[] {
  return withFields(CAST_SQUADS);
}
