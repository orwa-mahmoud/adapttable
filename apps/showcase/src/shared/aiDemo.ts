/**
 * The AI page, written once for React, Vue and Angular: the staff it shows,
 * their columns and filters, the host writes behind every approval, the one
 * custom capability and the one bulk action, the example cards, what a
 * scripted turn knows, and every word of the demo's options drawer. A
 * framework adds its table, its assistant panel, the drawer's markup and the
 * developer inspector's markup.
 */
import type {
  AgentCapabilityDefinition,
  AssistantSuggestion,
} from "@adapttable/ai";
import type {
  ApprovalPresentation,
  BatchRowEdit,
  BulkAction,
  ColumnMetadata,
  FilterDef,
} from "@adapttable/core";

import { siteAsset } from "../matrix/content";
import { DEMO_SCENARIOS, type DemoContext } from "./aiScenario";
import type { AggregateText } from "./peopleTable";

/** The two languages the demo reads in. */
export type AiLocale = "en" | "ar";

/** One person on the AI page. */
export interface StaffRow {
  readonly id: string;
  readonly person: string;
  readonly team: string;
  readonly status: string;
  readonly salary: number;
  readonly started: string;
}

/**
 * Fifteen people at five a page is three pages. The named examples stay on
 * page 1 so a scripted prompt still finds the row it talks about.
 */
export const STAFF: readonly StaffRow[] = [
  staff("p1", "Priya Nair", "Platform", "Active", 170, "2021-03-15"),
  staff("j1", "Jonah Okonkwo", "Platform", "Active", 155, "2020-11-02"),
  staff("c1", "Chioma Eze", "Core", "Active", 148, "2022-01-10"),
  staff("f1", "Fatima Bell", "Core", "On leave", 132, "2019-06-24"),
  staff("s1", "Sefa Demir", "Data", "Active", 160, "2023-04-03"),
  staff("m1", "Marta Kowalski", "Core", "Active", 141, "2022-09-19"),
  staff("t1", "Tobias Lind", "Data", "Active", 152, "2021-08-30"),
  staff("a1", "Amara Diallo", "Platform", "On leave", 165, "2020-02-17"),
  staff("k1", "Kenji Sato", "Platform", "Active", 158, "2023-07-11"),
  staff("l1", "Leila Haddad", "Core", "Active", 139, "2021-11-08"),
  staff("n1", "Noah Berg", "Data", "On leave", 147, "2020-05-21"),
  staff("y1", "Yara Mensah", "Platform", "Active", 163, "2022-03-04"),
  staff("i1", "Ivan Petrov", "Core", "Active", 144, "2019-12-16"),
  staff("r1", "Sofia Reyes", "Data", "Active", 151, "2024-01-22"),
  staff("h1", "Aisha Rahman", "Platform", "Active", 168, "2021-06-09"),
];

function staff(
  id: string,
  person: string,
  team: string,
  status: string,
  salary: number,
  started: string
): StaffRow {
  return { id, person, team, status, salary, started };
}

/** A staff row's key. */
export const staffKey = (row: StaffRow): string => row.id;

/** Five of fifteen: three pages, and 10 stays a real size the assistant can set. */
export const STAFF_PAGE_LIMIT = 5;

/** The people the bulk example selects: Jonah Okonkwo and Sefa Demir. */
const LEAVE_EXAMPLE_KEYS: ReadonlySet<string> = new Set(["j1", "s1"]);

/**
 * The column headings, in the demo's two languages. Switching to RTL
 * switches the language with it: a mirrored table still labelled in English
 * shows the layout but not what a reader in Arabic actually sees.
 */
export const STAFF_HEADERS: Readonly<
  Record<AiLocale, Readonly<Record<keyof Omit<StaffRow, "id">, string>>>
> = {
  en: {
    person: "Person",
    team: "Team",
    status: "Status",
    salary: "Salary",
    started: "Started",
  },
  ar: {
    person: "الشخص",
    team: "الفريق",
    status: "الحالة",
    salary: "الراتب",
    started: "تاريخ البدء",
  },
};

/** The action offered beside a reply the demo could not carry out. */
export const CONNECT_ACTION: Readonly<Record<AiLocale, string>> = {
  en: "Connect a backend",
  ar: "اربط خادمًا",
};

/** Salaries are stored in thousands; nothing on screen shows a bare number. */
export function salaryText(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `$${String(rounded)}k`;
}

/**
 * A group's salary aggregate, in the same money the cells use. A count is
 * people rather than an amount, so it stays a plain number.
 */
const salaryAggregateText: AggregateText = (value, context) => {
  if (typeof value !== "number") return undefined;
  return context.aggregation === "count" ? String(value) : salaryText(value);
};

/** A staff column, in the shape every binding's column type accepts. */
export type StaffColumn = Omit<
  ColumnMetadata<StaffRow>,
  "header" | "filter" | "accessor" | "editor" | "formatAggregate"
> & {
  readonly key: string;
  readonly header: string;
  readonly accessor: (row: StaffRow) => string | number;
  readonly editor?: "number";
  readonly formatAggregate?: AggregateText;
};

/**
 * The staff columns in the reader's language. Salary's cell is each
 * framework's own (the money text); its `accessor` stays the number, so
 * sorting, grouping and the average work on the value.
 *
 * @param locale - The language the table reads in.
 * @returns The columns.
 */
export function staffColumns(locale: AiLocale): StaffColumn[] {
  const header = STAFF_HEADERS[locale];
  return [
    {
      key: "person",
      sortable: true,
      header: header.person,
      accessor: (row) => row.person,
      editable: true,
    },
    {
      key: "team",
      sortable: true,
      header: header.team,
      accessor: (row) => row.team,
      editable: true,
    },
    {
      key: "status",
      sortable: true,
      header: header.status,
      accessor: (row) => row.status,
      editable: true,
    },
    {
      key: "salary",
      sortable: true,
      header: header.salary,
      accessor: (row) => row.salary,
      editable: true,
      editor: "number",
      aggregatable: true,
      editValue: (row) => String(row.salary),
      // The same money text for every surface that cannot draw the cell:
      // exports, mobile cards, the announcer.
      formatValue: (row) => salaryText(row.salary),
      formatAggregate: salaryAggregateText,
      // A bare 170 is not a salary until something says what it counts.
      ai: {
        description:
          "Annual salary in thousands of US dollars. 170 means $170,000.",
      },
    },
    {
      key: "started",
      sortable: true,
      header: header.started,
      accessor: (row) => row.started,
      editable: true,
      ai: { description: "The date this person joined, as YYYY-MM-DD." },
    },
  ];
}

/** The page's filters: team, status and start date. */
export const STAFF_FILTERS: readonly FilterDef<StaffRow>[] = [
  {
    key: "team",
    type: "multiSelect",
    label: "Team",
    options: ["Core", "Platform", "Data"].map((team) => ({
      value: team,
      label: team,
    })),
    getValue: (row) => row.team,
  },
  {
    key: "status",
    type: "multiSelect",
    label: "Status",
    options: ["Active", "On leave"].map((status) => ({
      value: status,
      label: status,
    })),
    getValue: (row) => row.status,
  },
  {
    key: "started",
    type: "dateRange",
    label: "Started",
    getValue: (row) => row.started,
  },
];

/**
 * What the agent may write, per column, with labels in the reader's
 * language: a column id is a developer key, and the approval review shows
 * this name.
 *
 * @param locale - The language the table reads in.
 * @param writable - Whether editing is on.
 * @returns The agent's column declarations.
 */
export function staffAgentColumns(locale: AiLocale, writable: boolean) {
  const header = STAFF_HEADERS[locale];
  const column = (label: string, type: "string" | "number") => ({
    type,
    writable,
    label,
  });
  return {
    person: column(header.person, "string"),
    team: column(header.team, "string"),
    status: column(header.status, "string"),
    salary: column(header.salary, "number"),
    started: column(header.started, "string"),
  };
}

function applyField(row: StaffRow, key: string, value: unknown): StaffRow {
  if (key === "salary") {
    // The host decides what it will hold: a row carrying NaN is worse than
    // a write that did not land.
    const next = Number(value);
    return Number.isFinite(next) ? { ...row, salary: next } : row;
  }
  if (
    key === "person" ||
    key === "team" ||
    key === "status" ||
    key === "started"
  ) {
    return { ...row, [key]: String(value) };
  }
  return row;
}

function applyPatch(
  row: StaffRow,
  patch: Readonly<Record<string, unknown>>
): StaffRow {
  return Object.entries(patch).reduce(
    (current, [key, value]) => applyField(current, key, value),
    row
  );
}

/** The rows after one cell edit. */
export function staffWithCell(
  rows: readonly StaffRow[],
  row: StaffRow,
  key: string,
  value: unknown
): StaffRow[] {
  return rows.map((current) =>
    current.id === row.id ? applyField(current, key, value) : current
  );
}

/** The rows after a row form saves. */
export function staffWithRow(
  rows: readonly StaffRow[],
  row: StaffRow,
  patch: Readonly<Record<string, unknown>>
): StaffRow[] {
  return rows.map((current) =>
    current.id === row.id ? applyPatch(current, patch) : current
  );
}

/** The rows after a batch saves. */
export function staffWithBatch(
  rows: readonly StaffRow[],
  edits: readonly BatchRowEdit<StaffRow>[]
): StaffRow[] {
  return rows.map((current) => {
    const hit = edits.find((edit) => edit.rowId === current.id);
    return hit ? applyPatch(current, hit.patch) : current;
  });
}

/** Every row on one team, raised by a percentage. */
export function staffRaised(
  rows: readonly StaffRow[],
  team: string,
  percent: number
): StaffRow[] {
  return rows.map((row) =>
    row.team === team
      ? { ...row, salary: Math.round(row.salary * (1 + percent / 100)) }
      : row
  );
}

/** The named rows, marked on leave. */
export function staffOnLeave(
  rows: readonly StaffRow[],
  keys: readonly string[]
): StaffRow[] {
  const chosen = new Set(keys);
  return rows.map((row) =>
    chosen.has(row.id) ? { ...row, status: "On leave" } : row
  );
}

/** The rows without the named ones. Reset and a refresh bring them back. */
export function staffWithout(
  rows: readonly StaffRow[],
  keys: readonly string[]
): StaffRow[] {
  const gone = new Set(keys);
  return rows.filter((row) => !gone.has(row.id));
}

/** What the raise capability takes, once the session has validated it. */
interface RaiseArgs {
  readonly team: string;
  readonly percent: number;
}

/**
 * A write the host performs whole: a team and a percentage rather than a
 * list of rows, so the approval shows what was asked, and it is the shape a
 * reader may agree to once and stop being asked about.
 *
 * @param apply - Raises the team; returns how many people it changed.
 * @returns The capability.
 */
export function raiseTeamCapability(
  apply: (args: RaiseArgs) => number
): AgentCapabilityDefinition {
  return {
    key: "staff.raiseTeam",
    summary: "Raise every salary on one team by a percentage.",
    kind: "write",
    presentation: {
      title: "Raise a team",
      description: "Raises every salary on one team by a percentage.",
      suggestions: [
        {
          id: "raise-platform",
          title: "Give the Platform team a raise",
          prompt: "Give everyone on the Platform team a 5% raise.",
          requires: ["staff.raiseTeam"],
        },
      ],
    },
    guide: {
      guide:
        "Raise every salary on one team by a percentage. The host applies it " +
        "to the whole team at once, so this names no rows: send the team " +
        "exactly as the Team column spells it, and a percentage between 1 " +
        "and 20.",
      input: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        additionalProperties: false,
        properties: {
          team: { type: "string", minLength: 1 },
          percent: { type: "number", minimum: 1, maximum: 20 },
        },
        required: ["team", "percent"],
      },
      output: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean" },
          changed: { type: "integer", minimum: 0 },
        },
      },
    },
    isEnabled: (observation) => observation.writePolicy === "allow",
    // No proposals: the reader is asked about the operation, not about rows.
    plan: () => ({ proposals: [] }),
    execute: (_context, args) => ({
      ok: true,
      changed: apply(args as RaiseArgs),
    }),
  };
}

/** The bulk action's words, in the demo's two languages. */
const ON_LEAVE_TEXT: Readonly<
  Record<
    AiLocale,
    {
      readonly label: string;
      readonly title: string;
      readonly message: (count: number) => string;
    }
  >
> = {
  en: {
    label: "Mark on leave",
    title: "Mark on leave",
    message: (count) =>
      `Mark ${String(count)} ${count === 1 ? "person" : "people"} as on leave?`,
  },
  ar: {
    label: "تسجيل إجازة",
    title: "تسجيل إجازة",
    message: (count) => `تسجيل ${String(count)} في إجازة؟`,
  },
};

/**
 * One bulk action over the selection, with a confirmation: what a person
 * clicking the bar is asked, and what makes the assistant ask before it runs
 * the action. A host handler cannot be staged, so on a staged table the
 * action stays the reader's alone (`ai: false`).
 *
 * @param locale - The language the table reads in.
 * @param agentMayRun - Whether approved changes save at once.
 * @param apply - Marks the selected rows on leave.
 * @returns The bulk action.
 */
export function markOnLeaveAction(
  locale: AiLocale,
  agentMayRun: boolean,
  apply: (keys: readonly string[]) => void
): BulkAction {
  const text = ON_LEAVE_TEXT[locale];
  return {
    key: "markOnLeave",
    label: text.label,
    onClick: (ids) => {
      apply(ids);
    },
    confirm: {
      title: text.title,
      message: text.message,
      confirmLabel: text.label,
    },
    ...(agentMayRun ? {} : { ai: false as const }),
  };
}

/**
 * The example cards, in the reader's language, built from the scenarios so
 * a card can never offer a prompt the script does not know. The id stays the
 * English prompt so a card keeps its identity across a language change.
 *
 * @param locale - The language the table reads in.
 * @returns The suggestions.
 */
export function staffSuggestions(locale: AiLocale): AssistantSuggestion[] {
  return DEMO_SCENARIOS.map((scenario) => {
    const text =
      locale === "ar" && scenario.ar
        ? { title: scenario.ar.title, prompt: scenario.ar.prompt }
        : { title: scenario.title, prompt: scenario.prompt };
    return {
      id: scenario.prompt,
      title: text.title,
      description: text.prompt,
      ...(scenario.kind === undefined ? {} : { kind: scenario.kind }),
      prompt: text.prompt,
      requires: scenario.requires,
    };
  });
}

/**
 * What a scripted turn knows, read from the live rows so the bulk example
 * proposes the salaries on screen and the delete example stops once its row
 * is gone.
 *
 * @param rows - The rows as they stand.
 * @param locale - The language the table reads in.
 * @returns The scenario context.
 */
export function staffContext(
  rows: readonly StaffRow[],
  locale: AiLocale
): DemoContext {
  const removable = rows.find((row) => row.id === "t1");
  return {
    locale,
    namedRowKey: "p1",
    pinnedColumnKey: "person",
    coreTeam: rows
      .filter((row) => row.team === "Core")
      .map((row) => ({ rowKey: row.id, salary: row.salary })),
    leaveRows: rows
      .filter((row) => LEAVE_EXAMPLE_KEYS.has(row.id))
      .map((row) => ({ rowKey: row.id, person: row.person })),
    // The first three on page 1, so the one chosen is one a reader sees.
    askRows: rows.slice(0, 3).map((row) => ({
      rowKey: row.id,
      person: row.person,
    })),
    ...(removable
      ? { removableRow: { rowKey: removable.id, person: removable.person } }
      : {}),
  };
}

/** Whether the table starts reading right to left: `?dir=rtl` or `?locale=ar`. */
export function staffStartsRtl(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("dir")
    ? params.get("dir") === "rtl"
    : params.get("locale") === "ar";
}

/** How the table edits, as the drawer offers it. */
export type DemoEditingMode = "off" | "cell" | "row" | "batch";

/** How much of the contract a turn carries. */
export type DemoContextProfile = "compact" | "full";

/** Which optional capabilities the reader has turned on. */
export interface DemoToggles {
  readonly editingMode: DemoEditingMode;
  readonly grouping: boolean;
  readonly rowPinning: boolean;
  readonly columnPinning: boolean;
  readonly paging: boolean;
}

/** The switches' starting state, and what Reset returns to. */
export const INITIAL_TOGGLES: DemoToggles = {
  editingMode: "cell",
  grouping: false,
  rowPinning: true,
  columnPinning: true,
  paging: true,
};

/** A feature switch the drawer lists. */
export type DemoFeatureKey =
  "grouping" | "rowPinning" | "columnPinning" | "paging";

/** The feature switches, in order, with what each one changes. */
export const DEMO_FEATURES: readonly {
  readonly key: DemoFeatureKey;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    key: "grouping",
    label: "Grouping",
    help: "Offers grouping and aggregates to the assistant. The table stays flat until something actually groups it — that is the capability the model is meant to show.",
  },
  {
    key: "rowPinning",
    label: "Row pinning",
    help: "Lets the assistant pin a row above the scrolled body.",
  },
  {
    key: "columnPinning",
    label: "Column pinning",
    help: "Lets the assistant pin a column to either edge.",
  },
  {
    key: "paging",
    label: "Pages of five",
    help: "Fifteen people at five a page — three pages, so the assistant has somewhere to page to and a size of 10 is a real change.",
  },
];

/** The editing modes, as the drawer's segmented control offers them. */
export const EDITING_MODES: readonly {
  readonly value: DemoEditingMode;
  readonly label: string;
}[] = [
  { value: "off", label: "Off" },
  { value: "cell", label: "Cell" },
  { value: "row", label: "Row" },
  { value: "batch", label: "Batch" },
];

/** The capabilities the reader can take away from the agent. */
export const DEMO_EXCLUSIONS: readonly {
  readonly key: string;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    key: "view.setFilters",
    label: "Filter the table",
    help: "Off: the filter suggestions go, and you can still filter it yourself.",
  },
  {
    key: "rows.read",
    label: "Read rows",
    help: "Off: it can change the view but can no longer answer questions about what is in it.",
  },
  {
    key: "edit.cells",
    label: "Edit cells",
    help: "Off: no write ever reaches the approval, because none is ever proposed.",
  },
  {
    key: "rows.delete",
    label: "Delete rows",
    help: "Off: the assistant cannot remove a row. On, it always asks first — deleting is never waved through, and Reset brings the data back.",
  },
];

/** The capabilities that write, and therefore have an approval to set. */
const WRITE_CAPABILITIES: ReadonlySet<string> = new Set([
  "edit.cells",
  "rows.add",
  "rows.delete",
  "rows.reorder",
]);

/** Reader-facing names for the built-in writes. */
const CAPABILITY_LABELS: Readonly<Record<string, string>> = {
  "edit.cells": "Edit a cell",
  "rows.add": "Add rows",
  "rows.delete": "Delete rows",
  "rows.reorder": "Move a row",
};

/** An action's approval as the reader set it, or inherited. */
export type ApprovalOverride = "required" | "automatic";

/** One write whose approval the reader can override. */
export interface DemoActionApproval {
  /** Capability key — stable, and never shown as the label. */
  readonly key: string;
  /** Reader-facing name. */
  readonly label: string;
  /** What it resolves to right now. */
  readonly policy: ApprovalOverride;
  /** True when the table's shared default is what produced that. */
  readonly inherited: boolean;
  /** What the drawer says about it. */
  readonly description: string;
}

/**
 * The writes the table wires right now, with their approval: turning a
 * feature off removes its row rather than leaving a dead switch behind.
 *
 * @param capabilities - The keys the table's manifest lists.
 * @param overrides - The reader's per-action answers.
 * @returns The rows of the drawer's approval section.
 */
export function actionApprovals(
  capabilities: readonly string[],
  overrides: Readonly<Record<string, ApprovalOverride>>
): DemoActionApproval[] {
  return capabilities
    .filter((key) => WRITE_CAPABILITIES.has(key))
    .map((key) => {
      const override = Object.hasOwn(overrides, key)
        ? overrides[key]
        : undefined;
      const policy = override ?? "required";
      return {
        key,
        label: CAPABILITY_LABELS[key] ?? key,
        policy,
        inherited: override === undefined,
        description: describeApproval(policy, override === undefined),
      };
    });
}

function describeApproval(
  policy: ApprovalOverride,
  inherited: boolean
): string {
  if (!inherited) return "Overridden for this action";
  return policy === "required"
    ? "Inherited: asks first"
    : "Inherited: runs without asking";
}

/**
 * The overrides after one answer: "Use the default" removes the key, so
 * the table's shared policy decides.
 *
 * @param current - The overrides as they stand.
 * @param key - The capability answered.
 * @param next - The answer.
 * @returns The overrides after it.
 */
export function withApprovalOverride(
  current: Readonly<Record<string, ApprovalOverride>>,
  key: string,
  next: ApprovalOverride | "inherit"
): Readonly<Record<string, ApprovalOverride>> {
  if (next !== "inherit") return { ...current, [key]: next };
  return Object.fromEntries(
    Object.entries(current).filter(([entry]) => entry !== key)
  );
}

/**
 * The overrides in the shape the table's agent takes them: one entry per
 * key the reader actually decided.
 *
 * @param overrides - The reader's per-action answers.
 * @returns The agent's per-capability approval.
 */
export function capabilityApproval(
  overrides: Readonly<Record<string, ApprovalOverride>>
): Readonly<
  Record<string, { readonly approval: { readonly policy: ApprovalOverride } }>
> {
  return Object.fromEntries(
    Object.entries(overrides).map(([key, policy]) => [
      key,
      { approval: { policy } },
    ])
  );
}

/** The approval answers, as the drawer's select offers them. */
export const APPROVAL_CHOICES: readonly {
  readonly value: ApprovalOverride | "inherit";
  readonly label: string;
}[] = [
  { value: "inherit", label: "Use the default" },
  { value: "required", label: "Always ask" },
  { value: "automatic", label: "Never ask" },
];

/** Where a waiting change is reviewed. */
export const PRESENTATIONS: readonly {
  readonly value: ApprovalPresentation;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "widget",
    label: "In the assistant",
    help: "Reviewed in the conversation where the change was asked for.",
  },
  {
    value: "table",
    label: "Above the table",
    help: "Reviewed in a strip over the rows it changes.",
  },
  {
    value: "modal",
    label: "In a dialog",
    help: "Reviewed in a dialog over the page. Nothing else is reachable until you answer.",
  },
];

/** How much of the contract a turn carries. */
export const PROFILES: readonly {
  readonly value: DemoContextProfile;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "compact",
    label: "Compact",
    help: "Every capability by name, with the full instructions only for the ones this turn is likely to need. The rest are asked for when they are.",
  },
  {
    value: "full",
    label: "Full",
    help: "Every capability with its whole guide, up front. Larger, and nothing is deferred.",
  },
];

/** What saving means for an approved change. */
export const SAVING: readonly {
  readonly value: "stage" | "immediate";
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "stage",
    label: "Stage changes",
    help: "An approved change becomes an unsaved edit. You still press Save.",
  },
  {
    value: "immediate",
    label: "Save immediately",
    help: "An approved change goes straight to the save path and reports what came back.",
  },
];

/** The drawer's section headings and the lines under them. */
export const OPTIONS_TEXT = {
  title: "Demo options",
  features: "Table features",
  featuresHelp:
    "Turn one off and the assistant offers less: it only ever suggests what this table currently wires.",
  editingMode: "Editing mode",
  editingModeHelp:
    "Cell and row stay ordinary fields until you open them. Batch keeps every editable cell as an input.",
  approvals: "Action approvals",
  approvalsHelp:
    "Whether the assistant has to ask before it runs an action. This is not where the question appears — that is below.",
  noApprovals: "This table wires no actions the assistant may run.",
  approvalFor: (label: string) => `Approval for ${label}`,
  location: "Approval location",
  locationHelp:
    "Where a waiting change is reviewed. One place at a time — the others say a change is waiting, and never repeat the buttons.",
  saving: "Saving",
  told: "What the agent is told",
  toldHelp:
    "The contract each turn carries. Compact names everything and explains what this turn needs; the rest is asked for on demand.",
  may: "What the agent may do",
  mayHelp:
    "Taking one away removes it from the contract and from the suggestions — and leaves the table's own control exactly where it was, for the person using it.",
  browser: "Browser tools",
  webmcp: "Offer this table to a browser agent",
  webmcpHelp:
    "Registers the permitted contract as WebMCP tools. The same executor, the same approvals — a browser agent gets no more than this page's assistant does.",
  webmcpMissing:
    "This browser has no model-context API, so there is nothing to register. The page works exactly the same without it.",
  direction: "Language and direction",
  rtl: "Right-to-left table",
  rtlHelp:
    "Mirrors the table and its overlays, and reads it in Arabic. The page around it stays as it is.",
  reset: "Reset demo",
  done: "Done",
  close: "Close",
} as const;

/** Where the recorded walkthrough lives. */
export const AI_DEMO_MEDIA = import.meta.env.DEV
  ? "/media/ai"
  : siteAsset("/media/ai");

/** The recorded walkthrough's caption and note. */
export const WATCH_TEXT = {
  caption: "Watch demo",
  note: "Recorded on the Mantine page. The same assistant runs on every kit.",
} as const;

/** The page's lede and toolbar words. */
export const AI_PAGE_TEXT = {
  lede: "The application decides what the assistant may do and what it may save — the table asks, your code answers.",
  otherKits: "Same demo in another adapter",
  source: "Conversation source",
  simulated: "Simulated demo",
  tryReal: "Try it for real",
  connected: "Connected",
  options: "Demo options",
} as const;

/** Whether this browser offers the model-context API WebMCP registers with. */
export function webmcpAvailable(): boolean {
  return (
    typeof document !== "undefined" &&
    "modelContext" in (document as { modelContext?: unknown })
  );
}
