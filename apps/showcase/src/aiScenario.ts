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
  /**
   * The same example in Arabic.
   *
   * A deliberate mapping, not a guess: the Arabic chip sends Arabic text and
   * this is what makes that text run the SAME structured scenario. Without
   * it a translated chip would send a prompt nothing recognises, which is
   * worse than an untranslated one — and fuzzy intent matching would be
   * worse than both.
   */
  readonly ar?: {
    readonly prompt: string;
    readonly title: string;
    readonly reply: string;
  };
}

/** What the page knows when a scenario runs. @internal */
export interface DemoContext {
  /** The language this demo is being read in. */
  readonly locale?: string;
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
  /**
   * The row the delete example removes, and the name it goes by.
   *
   * Read from the live rows: once it is gone the example has nothing to
   * remove, and an example that names a row the table no longer has would
   * propose a deletion nobody could approve.
   */
  readonly removableRow?: { readonly rowKey: string; readonly person: string };
}

/** What the demo says when it does not know a request. @internal */
export const UNSUPPORTED_REPLY =
  "This demo understands the example requests. Connect a backend for free-form conversation.";

/** The same, per locale, because a reader reads it. @internal */
export const UNSUPPORTED_REPLIES: Record<string, string> = {
  en: UNSUPPORTED_REPLY,
  ar: "يفهم هذا العرض الأمثلة المذكورة. اربط خادمًا لمحادثة حرة.",
};

/**
 * Every request this demo can carry out.
 *
 * The prompt text is the contract: a suggestion sends exactly this string,
 * and typing it by hand works identically.
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    prompt: "Show only the Core team.",
    ar: {
      prompt: "أظهر فريق Core فقط.",
      title: "تصفية الصفوف",
      reply: "تمت التصفية على فريق Core.",
    },
    subject: () => ({ kind: "filter", detail: "Team is Core" }),
    title: "Filter rows",
    kind: "filter",
    reply: "Filtered to the Core team.",
    capabilityKey: "view.setFilters",
    args: () => ({ filters: { team: ["Core"] } }),
    requires: ["view.setFilters"],
  },
  {
    prompt: "Show only Active.",
    ar: {
      prompt: "أظهر الحالة Active فقط.",
      title: "تصفية الحالة",
      reply: "تمت التصفية على الحالة Active.",
    },
    subject: () => ({ kind: "filter", detail: "Status is Active" }),
    title: "Filter status",
    kind: "filter",
    reply: "Filtered to Active.",
    capabilityKey: "view.setFilters",
    args: () => ({ filters: { status: ["Active"] } }),
    requires: ["view.setFilters"],
  },
  {
    prompt: "Sort by salary, highest first.",
    ar: {
      prompt: "رتّب حسب الراتب تنازليًا.",
      title: "ترتيب الرواتب",
      reply: "تم الترتيب حسب الراتب تنازليًا.",
    },
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
    ar: {
      prompt: "جمّع الصفوف حسب الفريق.",
      title: "التجميع حسب الفريق",
      reply: "تم التجميع حسب الفريق.",
    },
    subject: () => ({ kind: "group", detail: "Team" }),
    title: "Group by team",
    kind: "group",
    reply: "Grouped by team.",
    capabilityKey: "view.setGroupBy",
    args: () => ({ key: "team" }),
    requires: ["view.setGroupBy"],
  },
  {
    prompt: "Show average salary by team.",
    ar: {
      prompt: "اعرض متوسط الراتب حسب الفريق.",
      title: "متوسط الراتب",
      reply: "تم تجميع متوسط الراتب حسب الفريق.",
    },
    subject: () => ({ kind: "group", detail: "Average salary" }),
    title: "Average salary by team",
    kind: "group",
    reply: "Showing average salary by team.",
    capabilityKey: "view.setAggregations",
    args: () => ({ set: { salary: "avg" } }),
    requires: ["view.setGroupBy", "view.setAggregations"],
  },
  {
    prompt: "Raise Priya Nair's salary to 185.",
    ar: {
      prompt: "ارفع راتب Priya Nair إلى 185.",
      title: "اقتراح تعديل",
      reply: "تم اقتراح التغيير — وافق عليه لتطبيقه.",
    },
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
    ar: {
      prompt: "امنح فريق Core زيادة 5%.",
      title: "اقتراح عدة تعديلات",
      reply: "تم اقتراح ثلاث زيادات — وافق على ما تريد.",
    },
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
    prompt: "Remove Tobias Lind from the table.",
    ar: {
      prompt: "احذف Tobias Lind من الجدول.",
      title: "حذف صف",
      reply: "تم اقتراح الحذف — وافق عليه لتطبيقه.",
    },
    subject: (context) => ({
      kind: "delete",
      row: context.removableRow?.person ?? "Tobias Lind",
    }),
    title: "Delete a row",
    kind: "delete",
    reply:
      "Proposed the deletion — approve it to apply it. Reset brings it back.",
    capabilityKey: "rows.delete",
    args: (context) => ({
      rows: [{ rowKey: context.removableRow?.rowKey ?? "t1" }],
    }),
    requires: ["rows.delete"],
  },
  {
    prompt: "Pin the person column to the start.",
    ar: {
      prompt: "ثبّت عمود الشخص في البداية.",
      title: "تثبيت عمود",
      reply: "تم تثبيت عمود الشخص في البداية.",
    },
    subject: () => ({ kind: "pin", detail: "Person, start" }),
    title: "Pin a column",
    reply: "Pinned the person column.",
    capabilityKey: "view.pinColumn",
    args: (context) => ({ key: context.pinnedColumnKey, side: "start" }),
    requires: ["view.pinColumn"],
  },
  {
    prompt: "Unpin the person column.",
    ar: {
      prompt: "ألغِ تثبيت عمود الشخص.",
      title: "إلغاء تثبيت العمود",
      reply: "تم إلغاء تثبيت عمود الشخص.",
    },
    subject: () => ({ kind: "pin", detail: "Person, unpinned" }),
    title: "Unpin the column",
    reply: "Unpinned the person column.",
    capabilityKey: "view.pinColumn",
    args: (context) => ({ key: context.pinnedColumnKey, side: null }),
    requires: ["view.pinColumn"],
  },
  {
    prompt: "Pin Priya Nair to the top.",
    ar: {
      prompt: "ثبّت Priya Nair في الأعلى.",
      title: "تثبيت صف",
      reply: "تم تثبيت Priya Nair في الأعلى.",
    },
    title: "Pin a row",
    reply: "Pinned that row to the top.",
    capabilityKey: "view.pinRow",
    args: (context) => ({ rowKey: context.namedRowKey, side: "top" }),
    requires: ["view.pinRow"],
  },
  {
    prompt: "Unpin Priya Nair.",
    ar: {
      prompt: "ألغِ تثبيت Priya Nair.",
      title: "إلغاء تثبيت الصف",
      reply: "تم إلغاء تثبيت Priya Nair.",
    },
    title: "Unpin the row",
    reply: "Unpinned that row.",
    capabilityKey: "view.pinRow",
    args: (context) => ({ rowKey: context.namedRowKey, side: null }),
    requires: ["view.pinRow"],
  },
  {
    prompt: "Clear the grouping.",
    ar: {
      prompt: "أزل التجميع.",
      title: "إزالة التجميع",
      reply: "تمت إزالة التجميع.",
    },
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
    ar: {
      prompt: "أزل التصفية.",
      title: "إزالة التصفية",
      reply: "تمت إزالة التصفية.",
    },
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
    ar: {
      prompt: "انتقل إلى الصفحة التالية.",
      title: "الصفحة التالية",
      reply: "تم الانتقال إلى الصفحة التالية.",
    },
    title: "Next page",
    reply: "Moved to page 2.",
    capabilityKey: "view.setPage",
    args: () => ({ page: 2 }),
    requires: ["view.setPage"],
  },
  {
    prompt: "What can you do with this table?",
    ar: {
      prompt: "ما الذي يمكنك فعله بهذا الجدول؟",
      title: "ما المتاح",
      reply: "إليك ما يتيحه هذا الجدول الآن.",
    },
    title: "What can you do?",
    reply: "",
    capabilityKey: "",
    args: () => ({}),
    requires: [],
  },
];

/** Find the scenario for an exact request, ignoring only surrounding space. */
export function scenarioFor(
  text: string
): { scenario: DemoScenario; arabic: boolean } | undefined {
  const asked = text.trim().toLocaleLowerCase();
  for (const scenario of DEMO_SCENARIOS) {
    if (scenario.prompt.toLocaleLowerCase() === asked) {
      return { scenario, arabic: false };
    }
    // The Arabic chip sends Arabic, and runs the same structured scenario.
    // Exact text either way: nothing here guesses at intent.
    if (scenario.ar?.prompt.toLocaleLowerCase() === asked) {
      return { scenario, arabic: true };
    }
  }
  return undefined;
}

/** What the reader is told, in the language they asked in. */
function replyFor(
  scenario: DemoScenario,
  arabic: boolean,
  ok: boolean
): string {
  if (!ok) return arabic ? "لم ينجح ذلك." : "That did not work.";
  if (arabic && scenario.ar) return scenario.ar.reply;
  return scenario.reply;
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
      const found = scenarioFor(text);
      if (!found) {
        return {
          text:
            UNSUPPORTED_REPLIES[context().locale ?? "en"] ?? UNSUPPORTED_REPLY,
        };
      }
      const { scenario, arabic } = found;
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
        text: replyFor(scenario, arabic, result.ok),
        results: [result],
        keys: [scenario.capabilityKey],
        // Described from the arguments this scenario ran, never from the
        // reply text above it.
        subjects: [scenario.subject?.(context())],
      };
    },
  };
}
