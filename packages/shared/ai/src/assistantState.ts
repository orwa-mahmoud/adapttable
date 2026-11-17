/**
 * What one conversation controller holds, and the pure helpers its stages
 * share. Every stage module reads and writes this one state object, so the
 * rules that keep a conversation coherent have one set of facts to read.
 */

import {
  type AssistantAnswer,
  type AssistantAudio,
  type AssistantExchange,
  type AssistantQuestion,
  type AssistantResumeHandle,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurnInput,
} from "./assistantContracts";
import {
  type AssistantAllowance,
  type AssistantInterruption,
  type AssistantMessage,
  type AssistantStatus,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
} from "./assistantStoreTypes";
import { type AssistantUndo } from "./assistantUndo";

/**
 * The mutable state behind one {@link TableAssistantStore}.
 *
 * Package-internal: a binding reads the published snapshot, never this.
 */
export interface AssistantStoreState {
  /** The inputs the binding handed over last. */
  live: TableAssistantInputs;
  /**
   * The transcript as it stands here. A host that owns the conversation hands
   * one in and is told about every change; this still holds the current list,
   * because a turn reads it between the moment it changes and the moment that
   * host hands the next one back — and a streamed reply changes it per frame.
   */
  messages: readonly AssistantMessage[];
  /**
   * The last list a host supplied. A turn moves `messages` on from it, so the
   * host handing that same list back is it holding what it was given rather
   * than replacing the transcript with what preceded the turn.
   */
  adopted: readonly AssistantMessage[] | undefined;
  /**
   * The table this transcript belongs to. Kept as the id rather than read back
   * off the previous session, which a host may already have torn down.
   */
  tableId: string | undefined;
  draft: string;
  status: AssistantStatus;
  error: string | undefined;
  /**
   * Which message is asking, while it waits. The question itself lives on
   * that message; this is only how to find it again.
   */
  asking: string | undefined;
  errorCode: string | undefined;
  /** The last turn that actually moved the view, and which message it was. */
  undoPlan: { message: string; undo: AssistantUndo } | null;
  /**
   * One plan per action that can be put back on its own.
   *
   * Keyed by the action's replay identity, which is what a receipt carries —
   * so a card knows whether its own control does anything before it draws
   * one.
   */
  actionPlans: Map<string, AssistantUndo>;
  /** The transcript as the offers make it, kept while its inputs stand. */
  transcriptCache: {
    source: readonly AssistantMessage[];
    keys: string;
    value: readonly AssistantMessage[];
  } | null;
  /**
   * The provisional message of the turn in flight, named together with the
   * turn that put it there. An abandoned turn takes its own away rather than
   * waiting for a transport to settle, and a turn that returns late finds a
   * message it no longer owns and leaves it alone.
   */
  streamingMessage:
    | {
        readonly id: string;
        readonly generation: number;
        readonly turn: number;
      }
    | undefined;
  resumeQuestion: ((answer: AssistantAnswer | undefined) => void) | undefined;
  /**
   * Which of the three ended the turn in flight, when one of them did. Stop
   * cancels it and nothing is left running; a released connection leaves the
   * backend working and something to come back to.
   */
  interrupted: AssistantInterruption | undefined;
  /**
   * What a resume would rejoin. Named by the transport while the turn runs,
   * because a connection released afterwards is too late to ask.
   */
  resumable: AssistantResumeHandle | undefined;
  /**
   * Reserved synchronously, before the first await. A flag in published state
   * would not be: two sends in one tick would both read "not sending".
   */
  sending: boolean;
  abort: AbortController | undefined;
  /**
   * Identity for ONE send, so a late turn cannot clear a later turn's
   * reservation and a reply cannot land after its turn was abandoned.
   */
  turn: number;
  seq: number;
  /**
   * The conversation a reply belongs to. A reply that arrives after the table
   * changed carries the old generation and is discarded.
   */
  generation: number;
  disposed: boolean;
  connection: AbortController | undefined;
  readonly listeners: Set<() => void>;
  snapshot: TableAssistantSnapshot | undefined;
  /**
   * The last eligibility answer, and what it was computed from. Recomputing
   * unconditionally would hand back new arrays on every read, and a snapshot
   * never equal to the last one is a render loop in a binding that subscribes.
   */
  offeredCache:
    | {
        readonly authored: readonly AssistantSuggestion[] | undefined;
        readonly available: string;
        readonly value: readonly AssistantSuggestion[];
      }
    | undefined;
  /** Built once per list, so an unchanged snapshot stays identical. */
  namesCache: {
    keys: readonly string[];
    value: readonly AssistantAllowance[];
  } | null;
}

/** A controller's state before anything has happened. */
export function createAssistantState(
  inputs: TableAssistantInputs
): AssistantStoreState {
  return {
    live: inputs,
    messages: inputs.messages ?? [],
    adopted: inputs.messages,
    tableId: inputs.session?.manifest().tableId,
    draft: "",
    status: "idle",
    error: undefined,
    asking: undefined,
    errorCode: undefined,
    undoPlan: null,
    actionPlans: new Map(),
    transcriptCache: null,
    streamingMessage: undefined,
    resumeQuestion: undefined,
    interrupted: undefined,
    resumable: undefined,
    sending: false,
    abort: undefined,
    turn: 0,
    seq: 0,
    generation: 0,
    disposed: false,
    connection: undefined,
    listeners: new Set(),
    snapshot: undefined,
    offeredCache: undefined,
    namesCache: null,
  };
}

/**
 * How a turn began.
 *
 * Sending and resuming are the same turn from here on — the same lane, the
 * same streaming message, the same delivery rules — so they run one path and
 * differ only where they must: what the transport is asked, and whether the
 * reader's message is new to the transcript.
 */
export type TurnStart =
  | {
      readonly kind: "send";
      readonly text: string;
      readonly keepDraft: boolean;
      readonly audio?: AssistantAudio;
    }
  | { readonly kind: "resume"; readonly handle: AssistantResumeHandle };

/**
 * Coalesce a burst of stream updates into one repaint.
 *
 * A frame where the host has one, a microtask where it does not — so a Node
 * consumer batches too rather than publishing per delta.
 */
export function scheduleFlush(run: () => void): void {
  const raf = (
    globalThis as { requestAnimationFrame?: (cb: () => void) => void }
  ).requestAnimationFrame;
  if (typeof raf === "function") {
    raf(run);
    return;
  }
  queueMicrotask(run);
}

/** Ids only have to be unique within one transcript. */
export function messageId(role: string, seq: number): string {
  return `${role}-${String(seq)}`;
}

/**
 * Ask a transport to rejoin work it started.
 *
 * Separated so the turn path reads as one shape: a transport without `resume`
 * never reaches here, and this says so rather than failing as a missing
 * function.
 */
export function resumeWith(
  transport: AssistantTransport,
  shared: AssistantTurnInput,
  handle: AssistantResumeHandle
): Promise<AssistantTransportReply> {
  if (!transport.resume) {
    throw new Error("this transport cannot rejoin work it started");
  }
  return transport.resume({ ...shared, handle });
}

export function exchanges(
  messages: readonly AssistantMessage[]
): readonly AssistantExchange[] {
  return messages.map((message) => ({
    role: message.role,
    text: message.text,
  }));
}

/**
 * What the reader answered, as they would say it.
 *
 * The option's own label, never its id: `d` is a correlation handle, and a
 * transcript line reading "d" says nothing to the person who chose it or to
 * the model reading the conversation back. A chosen option with no matching
 * label, and free text, both speak for themselves.
 */
export function answerText(
  question: AssistantQuestion,
  answer: AssistantAnswer
): string {
  const chosen = question.options?.find(
    (option) => option.id === answer.optionId
  );
  return (chosen?.label ?? answer.text ?? "").trim();
}

/** The question still waiting on the reader, if one is. */
export function openQuestion(
  messages: readonly AssistantMessage[]
): AssistantQuestion | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const asked = messages[i]?.question;
    if (asked) return asked;
  }
  return null;
}

/** The same message, no longer asking. */
export function stripQuestion(message: AssistantMessage): AssistantMessage {
  const rest: Record<string, unknown> = { ...message };
  delete rest.question;
  return rest as unknown as AssistantMessage;
}

/**
 * What the badge says, which is not always what the turn is doing.
 *
 * Two things park a conversation on the reader without the turn looking
 * stopped: a write waiting on approval, and a question the backend asked. The
 * second settles the turn that carried it, so the status underneath is
 * "ready" — and a badge reading "ready" beside an unanswered question tells
 * the reader nothing is waiting on them when something is.
 */
export function badgeStatus(
  status: AssistantStatus,
  asking: boolean,
  parked: boolean
): AssistantStatus {
  if (asking) return "awaiting-user";
  if (parked && status === "sending") return "awaiting-approval";
  return status;
}

/** What the reader is told when a turn came back with nothing in it. */
export const EMPTY_TURN =
  "the assistant answered with no text and nothing to apply — try again";

/**
 * Whether a reply carries anything at all.
 *
 * Empty text is legitimate on its own: a turn that filtered the table and
 * said nothing is fully reported by its receipts, and a turn that stopped
 * short is reported by `unresolved`. All three absent is the case nothing
 * downstream can render.
 */
export function silentTurn(
  reply: AssistantTransportReply,
  receipts: number
): boolean {
  // `text` is declared as a string, but a transport is host code across a
  // boundary and the declaration is a claim rather than a fact. A reply that
  // arrives without one said nothing, which is the case this already answers
  // — reading it as a string first would turn that into a thrown turn.
  const said = typeof reply.text === "string" ? reply.text.trim() : "";
  return said === "" && receipts === 0 && reply.unresolved === undefined;
}
