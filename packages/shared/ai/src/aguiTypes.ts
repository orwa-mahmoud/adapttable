/**
 * AG-UI wire shapes: tools, messages, run input, events and the transport's
 * options.
 */
import type { ApprovalPresentation } from "@adapttable/core";

import type { AssistantAnswer, AssistantQuestion } from "./assistantContracts";
import { type AgentContextInputs, type AgentContextOptions } from "./context";
import type { AgentContextView } from "./contextSnapshot";
import type { ApprovalResult, ApprovalSubject } from "./types";

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
