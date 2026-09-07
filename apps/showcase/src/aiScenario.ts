/**
 * The scripted demo transport — this page's, not the library's.
 *
 * There is no model here and nothing pretends there is. A fixed table maps
 * each example request to ONE capability call, which then runs through the
 * ordinary session executor against the live revision. So what the reader
 * sees happen to the table is the real operation, and a request the table
 * cannot serve fails the same way it would with a backend attached.
 *
 * Two rules keep it honest:
 *
 * - **Exact prompts only.** Loose keyword matching is how "delete the row I
 *   mentioned" becomes a destructive call nobody asked for. A request that is
 *   not one of the examples is answered by saying so, not by guessing.
 * - **No invented delay.** A scripted answer is instant because it is
 *   scripted; pausing to imitate thinking would be theatre.
 */
import type {
  AgentSession,
  AssistantReceiptSubject,
  AssistantTransport,
  AssistantTransportReply,
  ExecuteResult,
} from "@adapttable/ai";

/** One example the demo can actually carry out. @internal */
export interface DemoScenario {
  /** The exact text a suggestion sends, and the only text this matches. */
  readonly prompt: string;
  /** The card's own short name, above the prompt it will send. */
  readonly title: string;
  /** Which glyph the card carries. */
  readonly kind?: string;
  /** What the reader is told once it has run. */
  readonly reply: string;
  /** The capability to run, and the arguments to run it with. */
  readonly capabilityKey: string;
  /** Built at send time, so ids and revisions are the live ones. */
  readonly args: (context: DemoContext) => unknown;
  /** Capabilities the table must advertise for this to be offered. */
  readonly requires: readonly string[];
  /**
   * What the receipt card says this changed.
   *
   * Built from the same context the arguments are, so the card can never
   * describe something other than what ran.
   */
  readonly subject?: (context: DemoContext) => AssistantReceiptSubject;
}

/** What the page knows when a scenario runs. @internal */
export interface DemoContext {
  /** Row key of the person the edit examples name. */
  readonly namedRowKey: string;
  /** Column the pin examples name. */
  readonly pinnedColumnKey: string;
  /**
   * The Core team as it stands right now, for the bulk example.
   *
   * Read from the live rows rather than hardcoded, so the proposal always
   * describes the salaries actually on screen.
   */
  readonly coreTeam: readonly { rowKey: string; salary: number }[];
}

/** What the demo says when it does not know a request. @internal */
export const UNSUPPORTED_REPLY =
  "This demo understands the example requests. Connect a backend for free-form conversation.";

/**
 * Every request this demo can carry out.
 *
 * The prompt text is the contract: a suggestion sends exactly this string,
 * and typing it by hand works identically.
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    prompt: "Show only the Core team.",
    subject: () => ({ kind: "filter", detail: "Team is Core" }),
    title: "Filter rows",
    kind: "filter",
    reply: "Filtered to the Core team.",
    capabilityKey: "view.setFilters",
    args: () => ({ filters: { team: ["Core"] } }),
    requires: ["view.setFilters"],
  },
  {
    prompt: "Sort by salary, highest first.",
    subject: () => ({ kind: "sort", detail: "Salary, highest first" }),
    title: "Sort salaries",
    kind: "sort",
    reply: "Sorted by salary, descending.",
    capabilityKey: "view.setSort",
    args: () => ({ key: "salary", dir: "desc" }),
    requires: ["view.setSort"],
  },
  {
    prompt: "Group the rows by team.",
    subject: () => ({ kind: "group", detail: "Team" }),
    title: "Group by team",
    kind: "group",
    reply: "Grouped by team.",
    capabilityKey: "view.setGroupBy",
    args: () => ({ key: "team" }),
    requires: ["view.setGroupBy"],
  },
  {
    prompt: "Raise Priya Nair's salary to 185.",
    subject: () => ({
      kind: "edit",
      row: "Priya Nair",
      column: "Salary",
      before: "170",
      after: "185",
    }),
    title: "Propose an edit",
    kind: "edit",
    reply: "Proposed the change — approve it to apply it.",
    capabilityKey: "edit.cells",
    args: (context) => ({
      edits: [{ rowKey: context.namedRowKey, column: "salary", value: 185 }],
    }),
    requires: ["edit.cells"],
  },
  {
    prompt: "Give the Core team a 5% raise.",
    subject: () => ({
      kind: "edit",
      row: "Core team",
      column: "Salary",
      before: "3 people",
      after: "+5%",
    }),
    title: "Propose several edits",
    kind: "edit",
    // Several rows in one write, so a reader can approve some and refuse the
    // rest — the case a single-row example never reaches.
    reply: "Proposed three raises — approve the ones you want.",
    capabilityKey: "edit.cells",
    args: (context) => ({
      edits: context.coreTeam.map((row) => ({
        rowKey: row.rowKey,
        column: "salary",
        value: Math.round(row.salary * 1.05),
      })),
    }),
    requires: ["edit.cells"],
  },
  {
    prompt: "Pin the person column to the start.",
    subject: () => ({ kind: "pin", detail: "Person, start" }),
    title: "Pin a column",
    reply: "Pinned the person column.",
    capabilityKey: "view.pinColumn",
    args: (context) => ({ key: context.pinnedColumnKey, side: "start" }),
    requires: ["view.pinColumn"],
  },
  {
    prompt: "Unpin the person column.",
    subject: () => ({ kind: "pin", detail: "Person, unpinned" }),
    title: "Unpin the column",
    reply: "Unpinned the person column.",
    capabilityKey: "view.pinColumn",
    args: (context) => ({ key: context.pinnedColumnKey, side: null }),
    requires: ["view.pinColumn"],
  },
  {
    prompt: "Pin Priya Nair to the top.",
    title: "Pin a row",
    reply: "Pinned that row to the top.",
    capabilityKey: "view.pinRow",
    args: (context) => ({ rowKey: context.namedRowKey, side: "top" }),
    requires: ["view.pinRow"],
  },
  {
    prompt: "Unpin Priya Nair.",
    title: "Unpin the row",
    reply: "Unpinned that row.",
    capabilityKey: "view.pinRow",
    args: (context) => ({ rowKey: context.namedRowKey, side: null }),
    requires: ["view.pinRow"],
  },
  {
    prompt: "Clear the grouping.",
    subject: () => ({ kind: "group", detail: "Grouping cleared" }),
    title: "Clear grouping",
    kind: "group",
    reply: "Grouping cleared.",
    capabilityKey: "view.setGroupBy",
    args: () => ({ key: null }),
    requires: ["view.setGroupBy"],
  },
  {
    prompt: "Clear the filter.",
    subject: () => ({ kind: "filter", detail: "Filters cleared" }),
    title: "Clear filters",
    kind: "filter",
    reply: "Filter cleared.",
    capabilityKey: "view.setFilters",
    args: () => ({ filters: {} }),
    requires: ["view.setFilters"],
  },
  {
    prompt: "Go to the next page.",
    title: "Next page",
    reply: "Moved to page 2.",
    capabilityKey: "view.setPage",
    args: () => ({ page: 2 }),
    requires: ["view.setPage"],
  },
  {
    prompt: "What can you do with this table?",
    title: "What can you do?",
    reply: "",
    capabilityKey: "",
    args: () => ({}),
    requires: [],
  },
];

/** Find the scenario for an exact request, ignoring only surrounding space. */
export function scenarioFor(text: string): DemoScenario | undefined {
  const asked = text.trim().toLocaleLowerCase();
  return DEMO_SCENARIOS.find(
    (scenario) => scenario.prompt.toLocaleLowerCase() === asked
  );
}

/** The catalog, in a sentence, for the "what can you do" example. */
function describeCatalog(session: AgentSession): string {
  const keys = session.catalog().map((entry) => entry.key);
  if (keys.length === 0) return "This table currently offers no operations.";
  return `This table currently offers: ${keys.join(", ")}.`;
}

/**
 * A transport that runs the examples and admits it knows nothing else.
 *
 * @param context - Live row and column identity, read at send time.
 * @returns A transport the assistant controller can take as-is.
 *
 * @internal
 */
export function demoTransport(context: () => DemoContext): AssistantTransport {
  return {
    send: async ({ session, text }): Promise<AssistantTransportReply> => {
      const scenario = scenarioFor(text);
      if (!scenario) return { text: UNSUPPORTED_REPLY };
      if (scenario.capabilityKey === "") {
        return { text: describeCatalog(session) };
      }

      const offered = new Set(session.catalog().map((entry) => entry.key));
      if (!offered.has(scenario.capabilityKey)) {
        return {
          text: `This table does not currently offer ${scenario.capabilityKey}.`,
        };
      }

      const result: ExecuteResult = await session.execute(
        scenario.capabilityKey,
        scenario.args(context()),
        // The live revision, so a request planned against a view the table
        // has left fails here exactly as it would with a backend.
        session.manifest().viewRevision,
        `demo-${scenario.capabilityKey}-${String(Date.now())}`
      );

      return {
        text: result.ok ? scenario.reply : "That did not work.",
        results: [result],
        keys: [scenario.capabilityKey],
        // Described from the arguments this scenario ran, never from the
        // reply text above it.
        subjects: [scenario.subject?.(context())],
      };
    },
  };
}
