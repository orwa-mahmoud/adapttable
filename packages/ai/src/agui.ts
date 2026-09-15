/**
 * The table as an AG-UI frontend tool host — `@adapttable/ai/ag-ui`.
 *
 * AG-UI is what a running agent and a user interface say to each other while
 * a run is in flight. Speaking it as a *frontend tool host* means three
 * things: the table offers its enabled contract as the run's tools, it
 * publishes its own sanitized view state, and every call the backend makes
 * comes back through `session.execute` — the same executor, the same
 * exclusion predicate, the same approval policy and the same receipts the
 * HTTP path uses. There is no second dispatcher here.
 *
 * No SDK is imported. The event types below are this package's own, and the
 * one seam a host fills is {@link AgUiConnection}: hand it a run input, get
 * events back. A CopilotKit, Mastra, LangGraph or Microsoft Agent Framework
 * backend is reached through that seam, and is described as supported only
 * once its recorded-event conformance fixture runs green against this
 * adapter.
 *
 * ## The mapping, field by field
 *
 * Nothing is assumed from the two protocols merely both having tool calls.
 *
 * **Outbound — what a run input carries**
 *
 * | AG-UI | Ours |
 * | --- | --- |
 * | `tools[].name` | `adapttable.<tableId>.<capability key>` |
 * | `tools[].description` | the capability's `summaryShort` |
 * | `tools[].parameters` | `session.describe(key).input` |
 * | `state` (`STATE_SNAPSHOT`) | `buildAgentContext(...).view` |
 * | `stateDelta` (`STATE_DELTA`) | RFC 6902 patch between two of those views |
 * | `messages` (`MESSAGES_SNAPSHOT`) | the conversation, plus this turn's text |
 * | `resume[]` | what the reader decided about the last interrupt |
 *
 * **Inbound — what an event does**
 *
 * | AG-UI | Ours |
 * | --- | --- |
 * | `TEXT_MESSAGE_CONTENT.delta` | appended, reported through `onPartialText` |
 * | `TOOL_CALL_START.toolCallName` | a capability key, when the name is ours |
 * | `TOOL_CALL_ARGS.delta` | accumulated JSON text for that `toolCallId` |
 * | `TOOL_CALL_END` | `session.execute`, answered with `TOOL_CALL_RESULT` |
 * | `TOOL_CALL_RESULT` | recorded as a tool message for the next run |
 * | `RUN_FINISHED.outcome.interrupt` `"confirmation"` | an {@link ApprovalSubject} |
 * | `RUN_FINISHED.outcome.interrupt` `"input_required"` | an `askUser` question |
 * | `RUN_ERROR` | the turn fails with that message |
 *
 * Two rules are worth stating rather than inferring:
 *
 * - **A tool call we do not own is not ours to answer.** Only names in our
 *   namespace execute; anything else is the host's own frontend tool, and the
 *   adapter leaves it for whoever registered it.
 * - **The replay identity is the run's `toolCallId`**, not a counter. A
 *   resumed run that re-emits a call it already made gets the first result
 *   back rather than writing a second time, which is exactly what an
 *   interrupt-and-resume protocol needs.
 *
 * @packageDocumentation
 */
import type { ApprovalPresentation } from "@adapttable/core";

import type {
  AssistantAnswer,
  AssistantQuestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
import type { AssistantReceiptSubject } from "./assistantReceipts";
import { subjectFor } from "./assistantSubjects";
import {
  type AgentContextInputs,
  type AgentContextOptions,
  buildAgentContext,
} from "./context";
import type { AgentContextView } from "./contextSnapshot";
import { errorMessage } from "./errorMessage";
import { createTurnRevision, type TurnRevision } from "./turnRevision";
import type {
  AgentSession,
  ApprovalResult,
  ApprovalSubject,
  ExecuteResult,
  WriteProposal,
} from "./types";

/** One operation of an RFC 6902 patch. @public */
export interface JsonPatchOperation {
  readonly op: "add" | "remove" | "replace";
  /** JSON Pointer into the state document. */
  readonly path: string;
  /** The new value, for `add` and `replace`. */
  readonly value?: unknown;
}

/** One tool offered to the run. @public */
export interface AgUiTool {
  readonly name: string;
  readonly description: string;
  /** JSON Schema for the call's arguments. */
  readonly parameters: unknown;
}

/** One message in the run's conversation. @public */
export interface AgUiMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "tool";
  readonly content: string;
  /** Set on a `tool` message: the call this answers. */
  readonly toolCallId?: string;
}

/** What the reader decided about an interrupt the last run ended on. @public */
export interface AgUiResume {
  /** The interrupt's own id, echoed back unchanged. */
  readonly interruptId: string;
  /** `approved`, `partial`, `rejected`, or `answered`. */
  readonly status: AgUiResumeStatus;
  /** The decision's detail: approved positions, or the reader's answer. */
  readonly payload?: unknown;
}

/** How an interrupt was settled. @public */
export type AgUiResumeStatus = "approved" | "partial" | "rejected" | "answered";

/** One run's input. @public */
export interface AgUiRunInput {
  readonly threadId: string;
  readonly runId: string;
  /** The conversation, oldest first — the `MESSAGES_SNAPSHOT` payload. */
  readonly messages: readonly AgUiMessage[];
  /** The enabled contract as this run's frontend tools. */
  readonly tools: readonly AgUiTool[];
  /** The `STATE_SNAPSHOT` payload. Sent when there is no delta to send. */
  readonly state?: AgentContextView;
  /** The `STATE_DELTA` payload, when the view moved since the last run. */
  readonly stateDelta?: readonly JsonPatchOperation[];
  /** Answers to interrupts the previous run ended on. */
  readonly resume?: readonly AgUiResume[];
}

/** Why a run stopped and waited for the interface. @public */
export interface AgUiInterrupt {
  /** Correlation handle; `resume` echoes it back. */
  readonly interruptId: string;
  /**
   * Why the run stopped.
   *
   * `"confirmation"` and `"input_required"` are the two this table can
   * settle. Any other reason is reported as unresolved rather than guessed
   * at, which is why this is a string and not a closed set — a backend may
   * legitimately stop for something only it knows about.
   */
  readonly reason: string;
  /** What is being confirmed, or what is being asked. */
  readonly payload?: unknown;
}

/** How a run ended. @public */
export interface AgUiRunOutcome {
  readonly interrupt?: AgUiInterrupt;
}

/**
 * One event from a run.
 *
 * A deliberately flat shape: every field any event uses, all optional but
 * `type`. Hosts hand these straight through from their transport, and a union
 * of fifteen interfaces would make that a mapping exercise before the adapter
 * even sees the event.
 *
 * @public
 */
export interface AgUiEvent {
  readonly type: string;
  readonly messageId?: string;
  readonly delta?: unknown;
  readonly toolCallId?: string;
  readonly toolCallName?: string;
  readonly content?: string;
  readonly outcome?: AgUiRunOutcome;
  readonly message?: string;
  readonly code?: string;
  readonly [field: string]: unknown;
}

/** The one seam a host fills. @public */
export interface AgUiConnection {
  /**
   * Start a run and stream its events.
   *
   * Must honour `signal`. A run that ends on an interrupt is resumed by a
   * second call carrying `resume`, never by reopening this stream.
   */
  run(
    input: AgUiRunInput,
    signal?: AbortSignal
  ):
    | AsyncIterable<AgUiEvent>
    | Iterable<AgUiEvent>
    | Promise<AsyncIterable<AgUiEvent> | Iterable<AgUiEvent>>;
  /** Release whatever the connection holds. */
  close?(): void;
}

/** How the adapter is configured. @public */
export interface AgUiOptions {
  /** Where runs go. */
  readonly connection: AgUiConnection;
  /** Conversation identity. Generated per transport when omitted. */
  readonly threadId?: string;
  /**
   * Confirm a write the backend stopped to ask about.
   *
   * The same seam `session.execute` uses, taking the same
   * {@link ApprovalSubject} the approval transaction consumes — so a reader
   * decides a backend's confirmation exactly as they decide the table's own,
   * in one place rather than two. Without it a confirmation interrupt stops
   * the turn with `unresolved` rather than approving itself.
   */
  readonly onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /**
   * Put a question to the reader.
   *
   * Without it an `input_required` interrupt stops the turn with
   * `unresolved`, which is the honest outcome: nobody answered.
   */
  readonly askUser?: (
    question: AssistantQuestion,
    signal?: AbortSignal
  ) => Promise<AssistantAnswer | undefined>;
  /** Where a confirmation is reviewed, when the table has not said. */
  readonly presentation?: ApprovalPresentation;
  /** Context profile and budget for the state snapshot. */
  readonly context?: AgentContextOptions;
  /**
   * Live view and filter data the manifest does not carry.
   *
   * A function, read once per run, because the whole point of a state delta
   * is that the view moved. A fixed object would publish the state the table
   * was in when the transport was built, forever.
   */
  readonly contextInputs?: () => AgentContextInputs;
  /** Every event the adapter sends or receives, for a host with a live bus. */
  readonly onEvent?: (event: AgUiEvent) => void;
  /** How many resumes one turn may take before it is a loop. */
  readonly maxRuns?: number;
}

/** A run that did not behave like AG-UI. @public */
export class AgUiProtocolError extends Error {
  /** Stable machine code. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AgUiProtocolError";
    this.code = code;
  }
}

/** Resumes one turn may take before the adapter calls it a loop. */
const DEFAULT_MAX_RUNS = 8;

/** JSON Pointer escaping, per RFC 6901. */
function pointerSegment(key: string): string {
  return key.replaceAll("~", "~0").replaceAll("/", "~1");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An RFC 6902 patch between two state documents.
 *
 * Objects recurse so a single changed filter is one `replace` rather than a
 * whole new filter map; arrays and scalars are replaced whole, because a
 * positional array diff is a guess about intent that nothing here can check.
 */
export function statePatch(
  previous: unknown,
  next: unknown,
  base = ""
): readonly JsonPatchOperation[] {
  if (!isPlainObject(previous) || !isPlainObject(next)) {
    if (sameValue(previous, next)) return [];
    return [{ op: "replace", path: base, value: next }];
  }
  const operations: JsonPatchOperation[] = [];
  for (const key of Object.keys(previous)) {
    const path = `${base}/${pointerSegment(key)}`;
    if (!(key in next) || next[key] === undefined) {
      operations.push({ op: "remove", path });
      continue;
    }
    operations.push(...statePatch(previous[key], next[key], path));
  }
  for (const key of Object.keys(next)) {
    if (key in previous && previous[key] !== undefined) continue;
    if (next[key] === undefined) continue;
    operations.push({
      op: "add",
      path: `${base}/${pointerSegment(key)}`,
      value: next[key],
    });
  }
  return operations;
}

/** Structural equality, good enough for a state document made of JSON. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== "object") return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The tool name this table publishes for a capability. @public */
export function aguiToolName(tableId: string, key: string): string {
  return `adapttable.${tableId}.${key}`;
}

/** The capability a tool name refers to, or nothing when it is not ours. */
function capabilityOf(tableId: string, name: string): string | undefined {
  const prefix = `adapttable.${tableId}.`;
  if (!name.startsWith(prefix)) return undefined;
  const key = name.slice(prefix.length);
  // The bare prefix names no capability. Executing "" would be a refusal
  // reported as though this table had tried to do something.
  return key === "" ? undefined : key;
}

/**
 * The enabled contract as this run's frontend tools.
 *
 * @param session - The live session. Only permitted keys reach the list.
 * @returns One tool per enabled capability, in catalog order.
 *
 * @public
 */
export function aguiTools(session: AgentSession): readonly AgUiTool[] {
  const tableId = session.manifest().tableId;
  return session.catalog().map((entry) => ({
    name: aguiToolName(tableId, entry.key),
    description: entry.summaryShort ?? entry.summary,
    parameters: session.describe(entry.key).input,
  }));
}

/** The replay identity for one AG-UI tool call. */
function callKey(threadId: string, runId: string, toolCallId: string): string {
  return `agui:${JSON.stringify({ threadId, runId, toolCallId })}`;
}

/**
 * One field an event must carry, or the event is not the event it claims.
 *
 * Written once because every case needs it and each was spelling out the same
 * three lines — which is how a check ends up missing from one of them.
 */
/**
 * The refusal a RUN_ERROR stands for.
 *
 * Both fields are optional on the wire, and a run that fails without saying
 * why is still a run that failed: the turn gets a code it can act on either
 * way rather than an empty message.
 */
function runFailure(event: AgUiEvent): AgUiProtocolError {
  return new AgUiProtocolError(
    typeof event.code === "string" ? event.code : "run-error",
    typeof event.message === "string"
      ? event.message
      : "the run failed without saying why"
  );
}

/** The name a call was started with, or a refusal naming the call. */
function assertStarted(
  names: ReadonlyMap<string, string>,
  id: string,
  event: string
): string {
  const name = names.get(id);
  if (name === undefined) {
    throw new AgUiProtocolError(
      "unknown-tool-call",
      `${event} arrived for "${id}" before its TOOL_CALL_START`
    );
  }
  return name;
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new AgUiProtocolError("malformed-event", message);
  }
  return value;
}

/** Arguments as the backend sent them, or a refusal the session can name. */
function parseArgs(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return {};
  try {
    return JSON.parse(trimmed);
  } catch (cause) {
    throw new AgUiProtocolError(
      "malformed-tool-args",
      `tool call arguments were not JSON: ${errorMessage(cause)}`
    );
  }
}

/**
 * The rows an interrupt enumerated, kept only where they are addressable.
 *
 * A proposal without a `rowKey` is not a row anyone can decide about, and
 * passing it on as one would put a control in front of the reader that
 * settles nothing.
 */
function proposalsOf(payload: unknown): readonly WriteProposal[] | undefined {
  if (!isPlainObject(payload)) return undefined;
  const proposals = payload.proposals;
  if (!Array.isArray(proposals)) return undefined;
  const rows = proposals.flatMap((entry): WriteProposal[] => {
    if (!isPlainObject(entry) || typeof entry.rowKey !== "string") return [];
    return [
      {
        rowKey: entry.rowKey,
        ...(typeof entry.column === "string" ? { column: entry.column } : {}),
        ...("before" in entry ? { before: entry.before } : {}),
        ...("after" in entry ? { after: entry.after } : {}),
      },
    ];
  });
  return rows.length > 0 ? rows : undefined;
}

/**
 * What the reader is being asked to confirm.
 *
 * The two shapes are the session's own: a write that enumerates rows is
 * `rows`, and one the backend performs whole is `operation`. Deciding which
 * from the payload rather than from the reason means an approver never has to
 * guess from a runtime type what it was handed.
 */
function approvalSubject(
  interrupt: AgUiInterrupt,
  presentation: ApprovalPresentation
): ApprovalSubject {
  const payload = isPlainObject(interrupt.payload) ? interrupt.payload : {};
  const proposals = proposalsOf(payload);
  if (proposals) {
    return {
      kind: "rows",
      proposals,
      perItem: payload.perItem === true,
      presentation,
    };
  }
  const capability =
    typeof payload.capability === "string" ? payload.capability : "";
  if (capability === "") {
    throw new AgUiProtocolError(
      "malformed-interrupt",
      "a confirmation interrupt needs proposals or a capability to confirm"
    );
  }
  return {
    kind: "operation",
    capability,
    ...(typeof payload.title === "string" ? { title: payload.title } : {}),
    arguments: payload.arguments,
    presentation,
  };
}

/** The question an `input_required` interrupt is asking. */
function questionOf(interrupt: AgUiInterrupt): AssistantQuestion {
  const payload = isPlainObject(interrupt.payload) ? interrupt.payload : {};
  const question =
    typeof payload.question === "string" ? payload.question : undefined;
  if (!question) {
    throw new AgUiProtocolError(
      "malformed-interrupt",
      "an input_required interrupt needs a question"
    );
  }
  const options = Array.isArray(payload.options)
    ? payload.options.filter(isPlainObject).flatMap((option) => {
        const id = option.id;
        const label = option.label;
        if (typeof id !== "string" || typeof label !== "string") return [];
        return [{ id, label }];
      })
    : undefined;
  return {
    id: interrupt.interruptId,
    question,
    ...(options && options.length > 0 ? { options } : {}),
    // Free text unless the backend offered a closed set and said otherwise.
    allowFreeText:
      payload.allowFreeText === undefined
        ? !options || options.length === 0
        : payload.allowFreeText === true,
  };
}

/** What the reader decided, in the shape `resume` carries. */
function resumeFromApproval(
  interruptId: string,
  result: ApprovalResult,
  total: number
): AgUiResume {
  if (result === true) return { interruptId, status: "approved" };
  if (result === false) return { interruptId, status: "rejected" };
  const approved = result.approved;
  const reason = result.reason;
  const payload = {
    approved,
    ...(reason === undefined ? {} : { reason }),
  };
  if (approved.length === 0) {
    return { interruptId, status: "rejected", payload };
  }
  // Everything the reader was shown, approved: the backend is told the whole
  // write stands rather than being handed a position list it must re-derive.
  if (total > 0 && approved.length >= total) {
    return { interruptId, status: "approved", payload };
  }
  return { interruptId, status: "partial", payload };
}

function unresolvedTurn(
  code: string,
  message: string,
  pending: readonly string[]
): AssistantUnresolved {
  return { code, message, pending: [...pending] };
}

/**
 * The capability an interrupt was about, when it named one.
 *
 * What `unresolved.pending` is for: a turn that stopped at a confirmation
 * should be able to say which write never ran, rather than reporting an empty
 * list beside a message about work nobody can identify.
 */
function interruptCapability(interrupt: AgUiInterrupt): readonly string[] {
  if (!isPlainObject(interrupt.payload)) return [];
  const capability = interrupt.payload.capability;
  return typeof capability === "string" && capability !== ""
    ? [capability]
    : [];
}

/** What one run of the loop produced. */
interface RunOutcome {
  readonly text: string;
  readonly interrupt?: AgUiInterrupt;
}

/** Per-turn state the run loop accumulates across resumes. */
interface TurnState {
  readonly messages: AgUiMessage[];
  readonly results: ExecuteResult[];
  readonly keys: string[];
  readonly subjects: (AssistantReceiptSubject | undefined)[];
  /** What this turn's own calls have proven the table reached. */
  readonly bound: TurnRevision;
  /** The revision of the state the current run was started with. */
  text: string;
  sequence: number;
}

let threadCounter = 0;

/**
 * The AG-UI backend as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to AG-UI. A host
 * writing its own transport implements the neutral interface from
 * `@adapttable/ai` and never pulls this — or any agent framework — into its
 * graph.
 *
 * @param options - The run seam, plus the approval and question sinks.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function aguiTransport(options: AgUiOptions): AssistantTransport {
  threadCounter += 1;
  const threadId = options.threadId ?? `adapttable-${threadCounter}`;
  const maxRuns = Math.max(1, options.maxRuns ?? DEFAULT_MAX_RUNS);
  const presentation: ApprovalPresentation = options.presentation ?? "widget";
  // The state the backend has already been told about, and whether a run input
  // has actually carried it. Both matter: a bus sees the snapshot at connect,
  // and the first run input still carries it, because a run input has to be
  // readable on its own.
  let sent: AgentContextView | undefined;
  let carried = false;
  let runCounter = 0;

  const emit = (event: AgUiEvent): void => {
    options.onEvent?.(event);
  };

  const viewOf = (session: AgentSession): AgentContextView =>
    buildAgentContext(session, options.context, options.contextInputs?.()).view;

  /** The state fields of a run input, and what the backend now knows. */
  const stateFor = (
    view: AgentContextView
  ): Pick<AgUiRunInput, "state" | "stateDelta"> => {
    if (!carried || !sent) {
      // Announced only if connect did not already do it, so a host with a
      // live bus never sees the same snapshot twice.
      if (!sent) emit({ type: "STATE_SNAPSHOT", snapshot: view });
      sent = view;
      carried = true;
      return { state: view };
    }
    const delta = statePatch(sent, view);
    sent = view;
    if (delta.length === 0) return {};
    emit({ type: "STATE_DELTA", delta });
    return { stateDelta: delta };
  };

  const executeCall = async (
    session: AgentSession,
    turn: TurnState,
    runId: string,
    toolCallId: string,
    key: string,
    args: unknown,
    signal?: AbortSignal
  ): Promise<void> => {
    const manifest = session.manifest();
    // The state this run was started with is checked as the run opens. A call
    // arriving after one of this run's own calls has landed meets the table
    // that call moved, rather than being refused for it.
    const result = await session.execute(
      key,
      args,
      turn.bound.expected(manifest.viewRevision),
      callKey(threadId, runId, toolCallId),
      signal
    );
    turn.bound.settled(result);
    turn.results.push(result);
    turn.keys.push(key);
    turn.subjects.push(subjectFor(key, args, result, manifest.columns));
    const content = JSON.stringify(
      result.ok
        ? { ok: true, revision: result.revision, result: result.result }
        : { ok: false, revision: result.revision, error: result.error }
    );
    turn.sequence += 1;
    const message: AgUiMessage = {
      id: `${runId}-tool-${turn.sequence}`,
      role: "tool",
      content,
      toolCallId,
    };
    turn.messages.push(message);
    emit({
      type: "TOOL_CALL_RESULT",
      messageId: message.id,
      toolCallId,
      content,
    });
  };

  /** Consume one run's events, executing our calls as they complete. */
  const consume = async (
    session: AgentSession,
    turn: TurnState,
    runId: string,
    events: AsyncIterable<AgUiEvent> | Iterable<AgUiEvent>,
    onPartialText?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<RunOutcome> => {
    const tableId = session.manifest().tableId;
    const names = new Map<string, string>();
    const args = new Map<string, string>();
    let text = turn.text;
    let finished = false;
    let interrupt: AgUiInterrupt | undefined;

    for await (const event of events) {
      if (signal?.aborted) {
        throw new AgUiProtocolError("cancelled", "the run was cancelled");
      }
      emit(event);
      switch (event.type) {
        case "RUN_STARTED":
          break;
        case "TEXT_MESSAGE_START":
          break;
        case "TEXT_MESSAGE_CONTENT": {
          text += requiredString(
            event.delta,
            "TEXT_MESSAGE_CONTENT needs a string delta"
          );
          onPartialText?.(text);
          break;
        }
        case "TEXT_MESSAGE_END":
          break;
        case "TOOL_CALL_START": {
          const started = requiredString(
            event.toolCallId,
            "TOOL_CALL_START needs a toolCallId and a toolCallName"
          );
          names.set(
            started,
            requiredString(
              event.toolCallName,
              "TOOL_CALL_START needs a toolCallId and a toolCallName"
            )
          );
          args.set(started, "");
          break;
        }
        case "TOOL_CALL_ARGS": {
          const id = requiredString(
            event.toolCallId,
            "TOOL_CALL_ARGS needs a toolCallId and a string delta"
          );
          const delta = requiredString(
            event.delta,
            "TOOL_CALL_ARGS needs a toolCallId and a string delta"
          );
          assertStarted(names, id, "TOOL_CALL_ARGS");
          args.set(id, (args.get(id) ?? "") + delta);
          break;
        }
        case "TOOL_CALL_END": {
          const id = requiredString(
            event.toolCallId,
            "TOOL_CALL_END needs a toolCallId"
          );
          const name = assertStarted(names, id, "TOOL_CALL_END");
          const key = capabilityOf(tableId, name);
          // Somebody else's frontend tool. Answering it would be claiming a
          // result for work this table never did.
          if (key === undefined) break;
          await executeCall(
            session,
            turn,
            runId,
            id,
            key,
            parseArgs(args.get(id) ?? ""),
            signal
          );
          break;
        }
        case "TOOL_CALL_RESULT":
          // A result the backend produced for its own tool. Recorded by the
          // host through `onEvent`; the table claims nothing about it.
          break;
        case "RUN_ERROR":
          throw runFailure(event);
        case "RUN_FINISHED": {
          finished = true;
          interrupt = event.outcome?.interrupt;
          break;
        }
        default:
          // STEP_*, CUSTOM, RAW and anything a newer backend adds: forwarded
          // to the host through `onEvent` and otherwise left alone. An
          // unknown event is not a malformed one.
          break;
      }
    }

    if (!finished) {
      throw new AgUiProtocolError(
        "run-incomplete",
        "the run ended without RUN_FINISHED"
      );
    }
    turn.text = text;
    return { text, ...(interrupt ? { interrupt } : {}) };
  };

  /** Settle one interrupt, or say why the turn stops here. */
  const settle = async (
    interrupt: AgUiInterrupt,
    ask: AgUiOptions["askUser"],
    signal?: AbortSignal
  ): Promise<AgUiResume | AssistantUnresolved> => {
    if (interrupt.reason === "confirmation") {
      if (!options.onApprove) {
        return unresolvedTurn(
          "approval-unavailable",
          "the backend asked for confirmation and nothing here can ask the reader",
          interruptCapability(interrupt)
        );
      }
      const subject = approvalSubject(interrupt, presentation);
      const total = subject.kind === "rows" ? subject.proposals.length : 1;
      const decided = await options.onApprove(subject, signal);
      return resumeFromApproval(interrupt.interruptId, decided, total);
    }
    if (interrupt.reason === "input_required") {
      if (!ask) {
        return unresolvedTurn(
          "question-unanswered",
          "the backend asked a question and nothing here can put it to the reader",
          interruptCapability(interrupt)
        );
      }
      const answered = await ask(questionOf(interrupt), signal);
      if (!answered) {
        return unresolvedTurn(
          "question-unanswered",
          "the reader did not answer",
          interruptCapability(interrupt)
        );
      }
      return {
        interruptId: interrupt.interruptId,
        status: "answered",
        payload: answered,
      };
    }
    return unresolvedTurn(
      "interrupt-unsupported",
      `the backend stopped for "${interrupt.reason}", which this table cannot settle`,
      interruptCapability(interrupt)
    );
  };

  return {
    connect: ({ session }) => {
      // The state a run will be judged against, published before the first
      // one starts. A host with a live event bus renders from this.
      const view = viewOf(session);
      sent = view;
      carried = false;
      emit({ type: "STATE_SNAPSHOT", snapshot: view });
    },
    disconnect: () => {
      // The next connection is told the whole state: what this one published
      // was published to a session that has gone.
      sent = undefined;
      carried = false;
      options.connection.close?.();
    },
    send: async ({
      session,
      text,
      conversation,
      signal,
      onPartialText,
      askUser,
    }): Promise<AssistantTransportReply> => {
      // A host that supplied its own channel keeps it; otherwise the turn's
      // own surface is where an `input_required` interrupt is drawn.
      const ask =
        options.askUser ??
        (askUser
          ? (question: AssistantQuestion) => askUser(question)
          : undefined);
      const opening = session.manifest().viewRevision;
      const turn: TurnState = {
        messages: [
          ...conversation.map((entry, index) => ({
            id: `history-${index}`,
            role: entry.role,
            content: entry.text,
          })),
        ],
        results: [],
        keys: [],
        subjects: [],
        bound: createTurnRevision(opening),
        text: "",
        sequence: 0,
      };
      turn.messages.push({
        id: `${threadId}-user-${turn.messages.length}`,
        role: "user",
        content: text,
      });

      let resume: readonly AgUiResume[] | undefined;
      let unresolved: AssistantUnresolved | undefined;

      for (let attempt = 0; attempt < maxRuns; attempt += 1) {
        runCounter += 1;
        const runId = `${threadId}-run-${runCounter}`;
        // The state this run is actually started with. Its revision is what a
        // call arriving during the run was planned against.
        const view = viewOf(session);
        turn.bound.opens(view.revision);
        const input: AgUiRunInput = {
          threadId,
          runId,
          messages: [...turn.messages],
          tools: aguiTools(session),
          ...stateFor(view),
          ...(resume ? { resume } : {}),
        };
        emit({ type: "MESSAGES_SNAPSHOT", messages: input.messages });
        const events = await options.connection.run(input, signal);
        const outcome = await consume(
          session,
          turn,
          runId,
          events,
          onPartialText,
          signal
        );
        if (!outcome.interrupt) {
          return {
            text: outcome.text,
            results: turn.results,
            keys: turn.keys,
            subjects: turn.subjects,
          };
        }
        const settled = await settle(outcome.interrupt, ask, signal);
        if ("code" in settled) {
          unresolved = settled;
          break;
        }
        resume = [settled];
      }

      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        subjects: turn.subjects,
        unresolved:
          unresolved ??
          unresolvedTurn(
            "resume-limit",
            `the run asked to be resumed more than ${maxRuns} times`,
            []
          ),
      };
    },
  };
}

// A transport is handed a session and answers from its catalog, so the entry
// names the session, the context it sends, the approval it raises and the
// conversation shapes it speaks. A host writing its own connection needs
// every one of them to type its side.
export type {
  AssistantAnswer,
  AssistantExchange,
  AssistantQuestion,
  AssistantQuestionOption,
  AssistantResumeHandle,
  AssistantResumeInput,
  AssistantSendInput,
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnInput,
  AssistantUnresolved,
  CapabilityPresentation,
} from "./assistantContracts";
export type {
  AssistantReceiptSubject,
  AssistantReceiptTerm,
} from "./assistantReceipts";
export type {
  AgentContextInputs,
  AgentContextOptions,
  AgentContextView,
} from "./context";
export type { AgentContextProfile } from "./contextSelection";
export type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
export type {
  AgentAggregateOperation,
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCapabilityKind,
  AgentCellEdit,
  AgentColumn,
  AgentColumnAuthoring,
  AgentFilter,
  AgentFilterOption,
  AgentLimits,
  AgentManifest,
  AgentManifestAggregation,
  AgentObservation,
  AgentPagination,
  AgentPolicy,
  AgentRowAddressing,
  AgentSession,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  CapabilityFamily,
  CapabilityGuide,
  CapabilityPartial,
  CapabilityPlan,
  CapabilityProgress,
  CapabilityStaging,
  CatalogEntry,
  ExecuteError,
  ExecuteResult,
  JsonSchema,
  ResolvedRow,
  RowKeyRef,
  RowPositionRef,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowRef,
  RowWindow,
  RowWindowRow,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";
