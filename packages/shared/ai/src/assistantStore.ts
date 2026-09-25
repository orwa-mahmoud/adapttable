/**
 * The conversation lifecycle, without a framework.
 *
 * This was a React hook, and almost none of it was about React. One send at a
 * time, a draft that survives a failure, a late reply that is dropped rather
 * than appended, a turn that belonged to a table the reader has left — those
 * are the same rules wherever the panel is drawn, and a second binding
 * re-deriving them would be a second set of answers with only one of them
 * getting fixed.
 *
 * The rules that shape it, unchanged from the hook they came from:
 *
 * - **One send at a time**, reserved before any await. Two sends racing would
 *   interleave two turns' actions against one table.
 * - **A draft survives failure.** Losing what someone typed because a backend
 *   was down is worse than the outage.
 * - **A cancelled send is not a cancelled action.** Aborting before the
 *   transport answers is clean; aborting after actions began is reported for
 *   what it is, and nothing is retried — a mutation whose outcome is unknown
 *   is never sent twice.
 * - **A late reply is dropped.** A turn that was stopped, or that belonged to
 *   a previous table, never writes into the transcript.
 *
 * Construction is inert: no timer, no listener, no network call happens until
 * `connect`. Nothing here renders, and nothing here holds an element — what a
 * panel looks like, whether it is open, and where focus sits are the binding's.
 */
import type { AgentProgress } from "@adapttable/core";

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
  eligibleSuggestions,
} from "./assistantContracts";
import {
  type AssistantReceipt,
  type AssistantTurnStatus,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
import {
  type AssistantUndo,
  planUndo,
  runUndo,
  UNDO_FIELDS_FOR,
  type UndoBlock,
  undoBlocked,
} from "./assistantUndo";
import type { AgentContextInputs } from "./context";
import { type AgentContextView, buildView } from "./contextSnapshot";
import type { AgentSession, ExecuteResult } from "./types";

/** What a reader is offered about the last turn that moved the table. @public */
export interface AssistantUndoOffer {
  /** The assistant message this belongs to. */
  readonly messageId: string;
  /** Whether the control is live right now. */
  readonly available: boolean;
  /** Why it is not, when it is not. */
  readonly blocked?: UndoBlock;
}

/**
 * One capability the reader waved through, and what it is called.
 *
 * @public
 */
export interface AssistantAllowance {
  /** The capability key — a developer's identifier. */
  readonly capability: string;
  /** What the table knows it as, when it knows anything. */
  readonly name?: string;
}

/** One shared empty list, so an unchanged snapshot stays identical. */
const EMPTY_ALLOWED: readonly string[] = [];

/** The same, for the allowances built from them. */
const EMPTY_ALLOWANCES: readonly AssistantAllowance[] = [];

/** Where the conversation is. @public */
export type AssistantStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "sending"
  | "awaiting-approval"
  | "awaiting-user"
  | "error"
  | "disconnected";

/**
 * One record in the transcript.
 *
 * @public
 */
export interface AssistantMessage {
  /** Stable id. Never an array index — messages are keyed by it. */
  readonly id: string;
  readonly role: "user" | "assistant";
  /** Untrusted text. Render as text, or as safely restricted markup. */
  readonly text: string;
  /** Milliseconds since the epoch. */
  readonly at: number;
  /**
   * Whether this is what has arrived so far rather than the settled reply.
   *
   * `text` holds what to show either way — a reader never has to know which
   * of two fields carries the words. A panel marks this one as provisional;
   * nothing acts on it, and no call is ever made from a partial reply.
   */
  readonly streaming?: boolean;
  /**
   * The question this message is asking, while it is still unanswered.
   *
   * A question is a thing the assistant said, so it lives on the message that
   * said it. Held in a second slot beside the transcript it had to be kept in
   * step with it, and answering cleared the slot while the message stayed —
   * or, before that, cleared both and left the reader's reply answering
   * nothing. Gone once it is answered; the reply follows it in the list.
   */
  readonly question?: AssistantQuestion;
  /**
   * A voice message whose transcript has not come back yet.
   *
   * `text` is empty until the backend says what it heard; a panel shows a
   * placeholder for the recording in the meantime.
   */
  readonly transcribing?: boolean;
  /** What the actions in this turn actually did. */
  readonly receipts?: readonly AssistantReceipt[];
  /** The turn's overall outcome, when it ran actions. */
  readonly outcome?: AssistantTurnStatus;
}

/** Live inputs a host keeps up to date. @public */
export interface TableAssistantInputs {
  /** The live session. Changing it starts a new conversation. */
  readonly session?: AgentSession;
  /** Where a turn goes. Omit and the assistant stays disconnected. */
  readonly transport?: AssistantTransport;
  /**
   * Changes when the transport should be re-established.
   *
   * Swapping one transport for another — a backend for a scripted one — is not
   * visible in object identity, so a host that does it names the change here.
   * A backend transport must never quietly become a simulated one under the
   * same key.
   */
  readonly transportKey?: string;
  /** Everything authored, filtered live against what the table offers. */
  readonly suggestions?: readonly AssistantSuggestion[];
  /**
   * Whether a write from this conversation is waiting on a human.
   *
   * `execute` does not return while an approval is open, so the turn looks
   * like thinking from in here. The turn is still in flight and still
   * stoppable.
   */
  readonly awaitingApproval?: boolean;
  /**
   * The pending approval itself, passed straight through.
   *
   * Opaque here on purpose: what it is shaped like is a presentation contract,
   * and the store's job is to carry it beside the transcript, not to read it.
   */
  readonly approval?: unknown;
  /**
   * How far a running capability has got, or nothing.
   *
   * Carried, never derived: it happens inside a call this store is waiting on,
   * and only the session that made it can see it. It is not a result — the
   * turn's receipts still come from what its actions returned, and a call that
   * reported progress and then failed has failed.
   */
  readonly progress?: AgentProgress | null;
  /**
   * Live view and filter data the manifest does not carry.
   *
   * A function, not a value: undo compares the view before a turn against the
   * view after it, and a fixed object would report that nothing moved. The
   * filter catalog belongs here too — without it the sanitized view carries no
   * filter state, and a turn that filtered would look like a turn that did
   * nothing.
   */
  readonly contextInputs?: () => AgentContextInputs;
  /**
   * The transcript, when the host owns it.
   *
   * Omit it and the conversation lives here, which is what a demo or a single
   * page wants. Supply it and this store renders what you hand over: load the
   * last conversation from your own API when the panel opens, append a message
   * that arrived on a socket, keep it where it survives a reload. A list that
   * is not the one last supplied replaces the transcript, so a new array is
   * how a host says something arrived.
   *
   * Pair it with {@link TableAssistantInputs.onMessagesChange}: without that,
   * a turn's own messages are drawn and then lost the next time the host hands
   * back the list it still believes in.
   */
  readonly messages?: readonly AssistantMessage[];
  /**
   * Told whenever the transcript changes, with the whole of it.
   *
   * Every change: the reader's message, the reply, a streamed update, an
   * answered question, a clear. A host that keeps the conversation writes it
   * down from here and hands it back through
   * {@link TableAssistantInputs.messages}.
   */
  readonly onMessagesChange?: (messages: readonly AssistantMessage[]) => void;
  /**
   * How much of the conversation travels with each turn.
   *
   * `"full"` — the default — sends every earlier message, which is what a
   * backend that remembers nothing needs. A number sends that many of the most
   * recent, for a conversation long enough that resending all of it costs more
   * than it is worth. `0` sends none: the reader's own message still travels as
   * the turn's text, and a backend holding its own session supplies the rest.
   *
   * It never changes what a reader sees. The transcript on screen is whole
   * whatever this says.
   */
  readonly conversation?: "full" | number;
  /** Capability keys the reader has waved through, for this contract. */
  readonly alwaysAllowed?: readonly string[];
  /** Ask about one of them again from now on. */
  readonly onRevokeAlwaysAllow?: (capability: string) => void;
  /**
   * Work that outlived its connection, handed over the moment it does.
   *
   * This is where durable recovery starts and where this package stops: a
   * host that writes the handle somewhere it survives a reload can offer a
   * resume when the reader comes back. A host that does nothing loses the
   * work when the page goes, which is the honest default.
   */
  readonly onDetach?: (handle: AssistantResumeHandle) => void;
  /**
   * A handle from a previous page, to resume into this one.
   *
   * The store has no memory across a reload; a host that kept one hands it
   * back here and `resume` has something to rejoin.
   */
  readonly resumeHandle?: AssistantResumeHandle;
}

/** What a binding renders from. @public */
export interface TableAssistantSnapshot {
  readonly status: AssistantStatus;
  /**
   * Whether a turn is in flight and can still be stopped.
   *
   * Separate from {@link TableAssistantSnapshot.status}: a write parked on a
   * human approval reports `awaiting-approval` but is still running.
   */
  readonly busy: boolean;
  readonly messages: readonly AssistantMessage[];
  readonly draft: string;
  /** The last failure, cleared by the next successful turn. */
  readonly error: string | undefined;
  /**
   * The machine code behind {@link error}, when a turn ended with work
   * pending.
   *
   * The message beside it is written for whoever is debugging the turn; a
   * surface with labels turns this into a sentence for the reader instead.
   */
  readonly errorCode: string | undefined;
  /** The suggestions this table can run right now. */
  readonly suggestions: readonly AssistantSuggestion[];
  /** The pending approval a host supplied, or nothing. */
  readonly approval: unknown;
  /**
   * How far the capability now running has got, or nothing.
   *
   * What a surface says while a long write works through its rows. It never
   * becomes the receipt: when the turn settles this goes and the receipts say
   * what happened.
   */
  readonly progress: AgentProgress | null;
  /**
   * A question the backend put to the reader, or nothing.
   *
   * The turn is parked, not finished: answering it resumes the same turn.
   */
  readonly pendingQuestion: AssistantQuestion | null;
  /**
   * Whether the last turn that moved the table can still be put back.
   *
   * Null when no turn moved it. Re-read on every publish, because the offer
   * expires the moment anything else changes the view — and a control still
   * drawn after that would do the wrong thing.
   */
  readonly undo: AssistantUndoOffer | null;
  /**
   * What the reader said not to ask about again, each with its own name.
   *
   * One entry per capability rather than a list of keys beside a map of
   * names: two collections keyed by the same thing are two collections to
   * keep in step. `name` is whatever the table knows it as — a host's own
   * capability has only what its definition said, and that beats showing an
   * identifier. Readable with nothing pending, because that is when somebody
   * goes looking for what they agreed to.
   */
  readonly alwaysAllowed: readonly AssistantAllowance[];
  /**
   * What became of the last turn, when something other than a reply ended it.
   *
   * `"stopped"` is the reader's own decision and nothing is still running.
   * `"detached"` is a released connection: the backend may still be working,
   * and {@link TableAssistantSnapshot.resumable} says whether there is a way
   * back to it. A surface that tells a reader "cancelled" for both is telling
   * one of them something untrue.
   */
  readonly interrupted: AssistantInterruption | undefined;
  /**
   * The work a resume would rejoin, or nothing.
   *
   * Present only while a transport has named work that outlives its
   * connection. It is also what a host persists to offer a resume after a
   * reload — that part is the host's, because a page that has been away has
   * no session, no transcript and no memory of what ran.
   */
  readonly resumable: AssistantResumeHandle | undefined;
}

/**
 * What ended a turn that no reply ended.
 *
 * @public
 */
export type AssistantInterruption = "stopped" | "detached";

/**
 * The conversation, as a store.
 *
 * @public
 */
export interface TableAssistantStore {
  /** The current snapshot. Stable until something actually changes. */
  readonly getState: () => TableAssistantSnapshot;
  /** Listen for changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  readonly setDraft: (draft: string) => void;
  /** Send the draft, or the given text. Resolves when the turn settles. */
  readonly send: (text?: string) => Promise<void>;
  /**
   * Send a recording as the reader's turn, for a transport whose backend
   * transcribes it — the `onClip` of backend-mode dictation. The transcript
   * the backend returns becomes the reader's message.
   */
  readonly sendClip: (clip: AssistantAudio) => Promise<void>;
  /**
   * End the turn in flight and the work behind it.
   *
   * The reader's own decision, so nothing is left running and nothing is left
   * to rejoin. Safe to call when nothing is in flight.
   */
  readonly stop: () => void;
  /**
   * Rejoin work a released connection left running.
   *
   * Does nothing without a handle to rejoin, and reports a transport that
   * cannot. The turn comes back on a fresh baseline: the table is read again
   * before anything else is applied, because it is not the table the turn
   * started against.
   */
  readonly resume: () => Promise<void>;
  /** Drop the transcript. Cancels an active turn first. */
  readonly clear: () => void;
  /** Send a suggestion's prompt as if the reader had typed it. */
  readonly runSuggestion: (id: string) => Promise<void>;
  /**
   * Put the last turn back.
   *
   * Does nothing when there is no offer or the table has moved: the snapshot
   * already says so, and a control that acted anyway would move the table
   * somewhere nobody asked for.
   */
  readonly undoTurn: () => Promise<void>;
  /**
   * Put one action back, named by the replay identity its receipt carries.
   *
   * Offered only where a turn did more than one thing a reader might want to
   * separate: with one action the turn's own control already is that action's
   * undo, and two controls for one change is a question rather than an
   * affordance. Putting part of a turn back retires the whole-turn offer,
   * which no longer describes anything that happened.
   */
  readonly undoAction: (idempotencyKey: string) => Promise<void>;
  /** Ask about this capability again from now on. */
  readonly revokeAlwaysAllow: (capability: string) => void;
  /** Answer the pending question and resume the turn. */
  readonly answer: (answer: AssistantAnswer) => void;
  /**
   * Take new live inputs.
   *
   * A new session resets the conversation; a new `transportKey` reconnects.
   * Everything else — an updated catalog, a new suggestion list, an approval
   * arriving — changes what is published without touching the transcript.
   */
  readonly update: (inputs: TableAssistantInputs) => void;
  /** Establish the connection. Normally called from a binding's mount. */
  readonly connect: () => void;
  /**
   * Release the connection without discarding the transcript.
   *
   * Not a stop: a turn in flight whose transport named work that outlives the
   * connection is left running, its handle is offered to `onDetach`, and
   * {@link TableAssistantStore.resume} can rejoin it. A turn with nothing to
   * rejoin ends here, because pretending otherwise leaves a reader waiting on
   * a reply that can no longer arrive.
   */
  readonly disconnect: () => void;
  /** Idempotent. After this, nothing is delivered and nothing is notified. */
  readonly dispose: () => void;
}

/**
 * Coalesce a burst of stream updates into one repaint.
 *
 * A frame where the host has one, a microtask where it does not — so a Node
 * consumer batches too rather than publishing per delta.
 */
function scheduleFlush(run: () => void): void {
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
function messageId(role: string, seq: number): string {
  return `${role}-${String(seq)}`;
}

/**
 * Ask a transport to rejoin work it started.
 *
 * Separated so the turn path reads as one shape: a transport without `resume`
 * never reaches here, and this says so rather than failing as a missing
 * function.
 */
function resumeWith(
  transport: AssistantTransport,
  shared: AssistantTurnInput,
  handle: AssistantResumeHandle
): Promise<AssistantTransportReply> {
  if (!transport.resume) {
    throw new Error("this transport cannot rejoin work it started");
  }
  return transport.resume({ ...shared, handle });
}

function exchanges(
  messages: readonly AssistantMessage[]
): readonly AssistantExchange[] {
  return messages.map((message) => ({
    role: message.role,
    text: message.text,
  }));
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
/**
 * What the reader answered, as they would say it.
 *
 * The option's own label, never its id: `d` is a correlation handle, and a
 * transcript line reading "d" says nothing to the person who chose it or to
 * the model reading the conversation back. A chosen option with no matching
 * label, and free text, both speak for themselves.
 */
function answerText(
  question: AssistantQuestion,
  answer: AssistantAnswer
): string {
  const chosen = question.options?.find(
    (option) => option.id === answer.optionId
  );
  return (chosen?.label ?? answer.text ?? "").trim();
}

/** The question still waiting on the reader, if one is. */
function openQuestion(
  messages: readonly AssistantMessage[]
): AssistantQuestion | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const asked = messages[i]?.question;
    if (asked) return asked;
  }
  return null;
}

/** The same message, no longer asking. */
function stripQuestion(message: AssistantMessage): AssistantMessage {
  const rest: Record<string, unknown> = { ...message };
  delete rest.question;
  return rest as unknown as AssistantMessage;
}

function badgeStatus(
  status: AssistantStatus,
  asking: boolean,
  parked: boolean
): AssistantStatus {
  if (asking) return "awaiting-user";
  if (parked && status === "sending") return "awaiting-approval";
  return status;
}

/** What the reader is told when a turn came back with nothing in it. */
const EMPTY_TURN =
  "the assistant answered with no text and nothing to apply — try again";

/**
 * Whether a reply carries anything at all.
 *
 * Empty text is legitimate on its own: a turn that filtered the table and
 * said nothing is fully reported by its receipts, and a turn that stopped
 * short is reported by `unresolved`. All three absent is the case nothing
 * downstream can render.
 */
function silentTurn(reply: AssistantTransportReply, receipts: number): boolean {
  // `text` is declared as a string, but a transport is host code across a
  // boundary and the declaration is a claim rather than a fact. A reply that
  // arrives without one said nothing, which is the case this already answers
  // — reading it as a string first would turn that into a thrown turn.
  const said = typeof reply.text === "string" ? reply.text.trim() : "";
  return said === "" && receipts === 0 && reply.unresolved === undefined;
}

/**
 * Create a conversation controller for one table.
 *
 * @param inputs - Session, transport and the authored suggestions.
 * @returns A store a binding subscribes to.
 *
 * @public
 */
export function createTableAssistant(
  inputs: TableAssistantInputs = {}
): TableAssistantStore {
  let live: TableAssistantInputs = inputs;
  // The transcript as it stands here. A host that owns the conversation hands
  // one in and is told about every change; this still holds the current list,
  // because a turn reads it between the moment it changes and the moment that
  // host hands the next one back — and a streamed reply changes it per frame.
  let messages: readonly AssistantMessage[] = inputs.messages ?? [];
  // The last list a host supplied. A turn moves `messages` on from it, so the
  // host handing that same list back is it holding what it was given rather
  // than replacing the transcript with what preceded the turn.
  let adopted: readonly AssistantMessage[] | undefined = inputs.messages;
  // The table this transcript belongs to. Kept as the id rather than read back
  // off the previous session, which a host may already have torn down.
  let tableId: string | undefined = inputs.session?.manifest().tableId;
  let draft = "";
  let status: AssistantStatus = "idle";
  let error: string | undefined;
  // Which message is asking, while it waits. The question itself lives on
  // that message; this is only how to find it again.
  let asking: string | undefined;
  // The last turn that actually moved the view, and which message it was.
  let errorCode: string | undefined;
  let undoPlan: { message: string; undo: AssistantUndo } | null = null;
  /**
   * One plan per action that can be put back on its own.
   *
   * Keyed by the action's replay identity, which is what a receipt carries —
   * so a card knows whether its own control does anything before it draws
   * one.
   */
  let actionPlans = new Map<string, AssistantUndo>();
  /** The transcript as the offers make it, kept while its inputs stand. */
  let transcriptCache: {
    source: readonly AssistantMessage[];
    keys: string;
    value: readonly AssistantMessage[];
  } | null = null;
  // The provisional message of the turn in flight, named together with the
  // turn that put it there. An abandoned turn takes its own away rather than
  // waiting for a transport to settle, and a turn that returns late finds a
  // message it no longer owns and leaves it alone.
  let streamingMessage:
    | {
        readonly id: string;
        readonly generation: number;
        readonly turn: number;
      }
    | undefined;
  let resumeQuestion:
    ((answer: AssistantAnswer | undefined) => void) | undefined;

  // Which of the three ended the turn in flight, when one of them did. Stop
  // cancels it and nothing is left running; a released connection leaves the
  // backend working and something to come back to.
  let interrupted: AssistantInterruption | undefined;
  // What a resume would rejoin. Named by the transport while the turn runs,
  // because a connection released afterwards is too late to ask.
  let resumable: AssistantResumeHandle | undefined;

  // Reserved synchronously, before the first await. A flag in published state
  // would not be: two sends in one tick would both read "not sending".
  let sending = false;
  let abort: AbortController | undefined;
  // Identity for ONE send, so a late turn cannot clear a later turn's
  // reservation and a reply cannot land after its turn was abandoned.
  let turn = 0;
  let seq = 0;
  // The conversation a reply belongs to. A reply that arrives after the table
  // changed carries the old generation and is discarded.
  let generation = 0;
  let disposed = false;
  let connection: AbortController | undefined;

  const listeners = new Set<() => void>();
  let snapshot: TableAssistantSnapshot | undefined;

  // The last eligibility answer, and what it was computed from. Recomputing
  // unconditionally would hand back new arrays on every read, and a snapshot
  // never equal to the last one is a render loop in a binding that subscribes.
  let offeredCache:
    | {
        readonly authored: readonly AssistantSuggestion[] | undefined;
        readonly available: string;
        readonly value: readonly AssistantSuggestion[];
      }
    | undefined;

  const eligible = (): readonly AssistantSuggestion[] => {
    // Read at call time, never memoized on the session object: a table keeps
    // one session and changes its capabilities in place, so a chip for a
    // feature just turned off would otherwise sit there until something
    // unrelated happened to republish.
    const keys = live.session?.catalog().map((entry) => entry.key) ?? [];
    const available = keys.join("\u0000");
    if (
      offeredCache &&
      offeredCache.authored === live.suggestions &&
      offeredCache.available === available
    ) {
      return offeredCache.value;
    }
    const value = eligibleSuggestions(live.suggestions ?? [], keys);
    offeredCache = { authored: live.suggestions, available, value };
    return value;
  };

  /** Whether two remembered sets say the same thing. */
  const sameKeys = (a: readonly string[], b: readonly string[]): boolean =>
    a === b || (a.length === b.length && a.every((key, i) => key === b[i]));

  /** Whether two undo offers say the same thing. */
  const sameOffer = (
    a: AssistantUndoOffer | null,
    b: AssistantUndoOffer | null
  ): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
      a.messageId === b.messageId &&
      a.available === b.available &&
      a.blocked?.code === b.blocked?.code
    );
  };

  /**
   * The sanitized view right now, as undo compares it.
   *
   * The view alone, not the whole context: a turn's undo needs what the table
   * is showing, and building the contract and its prompt rendering to get
   * there would pull all of that into a conversation bundle.
   */
  const viewNow = (): AgentContextView | null => {
    const session = live.session;
    if (!session) return null;
    const inputs = live.contextInputs?.() ?? {};
    return buildView(
      { revision: session.manifest().viewRevision, ...inputs.view },
      inputs.filters ?? []
    );
  };

  /**
   * The transcript, with each receipt's offer read fresh.
   *
   * `undoable` is a live question, not something a turn settles once: undoing
   * one action retires that action's plan, and a card still drawing a control
   * for it would be a control that does nothing. Kept identical when nothing
   * is on offer, so an unchanged snapshot stays unchanged.
   */
  const offeredMessages = (): readonly AssistantMessage[] => {
    if (actionPlans.size === 0) return messages;
    // Cached on what it is derived from, because a subscriber compares the
    // transcript by identity: a fresh array on every read is a render loop,
    // not a re-render.
    const keys = [...actionPlans.keys()].join("\u0000");
    if (transcriptCache?.source === messages && transcriptCache.keys === keys) {
      return transcriptCache.value;
    }
    const value = messages.map((message) => {
      if (!message.receipts) return message;
      return {
        ...message,
        receipts: message.receipts.map((receipt) => ({
          ...receipt,
          undoable: actionPlans.has(receipt.idempotencyKey),
        })),
      };
    });
    transcriptCache = { source: messages, keys, value };
    return value;
  };

  /**
   * What a capability is called, in the words whoever wrote it chose.
   *
   * The built-in keys have translations; a host's own does not, and printing
   * `staff.raiseTeam` at a reader tells them the developer's identifier
   * rather than what the table did. The catalog carries the definition's own
   * one-line summary, which is the closest thing to a name it has.
   */
  const capabilityName = (key: string): string | undefined => {
    const entry = live.session
      ?.catalog()
      .find((candidate) => candidate.key === key);
    return entry?.summaryShort ?? entry?.summary;
  };

  /** Built once per list, so an unchanged snapshot stays identical. */
  let namesCache: {
    keys: readonly string[];
    value: readonly AssistantAllowance[];
  } | null = null;

  const allowances = (
    keys: readonly string[] | undefined
  ): readonly AssistantAllowance[] => {
    const list = keys ?? EMPTY_ALLOWED;
    if (list.length === 0) return EMPTY_ALLOWANCES;
    // Built once per list, so an unchanged table hands back the same array
    // rather than an equal one — a snapshot never equal to the last is a
    // render loop in a binding that subscribes.
    if (namesCache && sameKeys(namesCache.keys, list)) return namesCache.value;
    const value = list.map((capability) => {
      const name = capabilityName(capability);
      return name === undefined ? { capability } : { capability, name };
    });
    namesCache = { keys: list, value };
    return value;
  };

  /** What the reader is offered about the last turn, read fresh. */
  const undoOffer = (): AssistantUndoOffer | null => {
    const session = live.session;
    if (!undoPlan || !session) return null;
    // The live view, so a revision the turn's own approved write moved does
    // not retire an offer that still stands.
    const blocked = undoBlocked(session, undoPlan.undo, viewNow() ?? undefined);
    return {
      messageId: undoPlan.message,
      available: !blocked,
      ...(blocked ? { blocked } : {}),
    };
  };

  /** Whether two snapshots say the same thing. */
  const same = (
    a: TableAssistantSnapshot,
    b: TableAssistantSnapshot
  ): boolean =>
    a.status === b.status &&
    a.busy === b.busy &&
    a.messages === b.messages &&
    a.draft === b.draft &&
    a.error === b.error &&
    a.errorCode === b.errorCode &&
    a.approval === b.approval &&
    a.progress === b.progress &&
    a.interrupted === b.interrupted &&
    a.resumable === b.resumable &&
    a.pendingQuestion === b.pendingQuestion &&
    sameOffer(a.undo, b.undo) &&
    a.alwaysAllowed === b.alwaysAllowed &&
    a.suggestions === b.suggestions;

  /**
   * Rebuild, and notify only when something an observer can see has moved.
   *
   * A binding is allowed to hand the store its live inputs on every render;
   * this is what makes that safe. The previous snapshot is kept when nothing
   * changed, so a subscriber's identity check holds and no render loops.
   */
  const publish = (): void => {
    if (disposed) {
      snapshot = undefined;
      return;
    }
    const previous = snapshot;
    snapshot = undefined;
    const next = getState();
    if (previous && same(previous, next)) {
      snapshot = previous;
      return;
    }
    // Copied first: a listener that unsubscribes while it is being notified
    // must not change the set this loop is walking.
    const notifying = [...listeners];
    for (const listener of notifying) listener();
  };

  const getState = (): TableAssistantSnapshot => {
    if (snapshot) return snapshot;
    const offered = eligible();
    const parked = sending && live.awaitingApproval === true;
    snapshot = {
      // What the badge says. A parked write is not "working", and a reader
      // watching a spinner that will never resolve on its own is the reason
      // this is separate from `busy`. A question the backend asked parks the
      // conversation the same way: the turn that carried it has settled, so
      // the status underneath is "ready", and a badge saying so next to an
      // unanswered question tells the reader nothing is waiting on them when
      // something is.
      status: badgeStatus(status, asking !== undefined, parked),
      busy: sending,
      messages: offeredMessages(),
      draft,
      error,
      errorCode,
      suggestions: offered,
      approval: live.approval ?? null,
      // Only while a turn is running: a report that outlived its turn would be
      // a count standing beside a finished conversation.
      progress: sending ? (live.progress ?? null) : null,
      pendingQuestion: openQuestion(messages),
      undo: undoOffer(),
      alwaysAllowed: allowances(live.alwaysAllowed),
      interrupted,
      // A handle the host kept across a reload counts: the store has no turn
      // of its own to come back to, and the reader still does.
      resumable: resumable ?? live.resumeHandle,
    };
    return snapshot;
  };

  const setStatus = (next: AssistantStatus): void => {
    if (status === next) return;
    status = next;
    publish();
  };

  /**
   * Change the transcript, and tell whoever owns it.
   *
   * One write path, so a host that keeps the conversation of its own — in a
   * database, on another device, on a socket — hears about every change
   * without this store deciding which changes are worth reporting.
   */
  const setMessages = (next: readonly AssistantMessage[]): void => {
    messages = next;
    live.onMessagesChange?.(next);
  };

  /**
   * The conversation as it travels.
   *
   * What a reader sees is never trimmed; this is only what a backend is told.
   * A backend that keeps its own session is sent none of it and answers from
   * what it remembers.
   */
  const carried = (): readonly AssistantMessage[] => {
    const limit = live.conversation;
    if (limit === undefined || limit === "full") return messages;
    const kept = Math.max(0, Math.trunc(limit));
    return kept === 0 ? [] : messages.slice(-kept);
  };

  const push = (message: AssistantMessage): void => {
    setMessages([...messages, message]);
    publish();
  };

  /** Whether a reply still belongs to this conversation. */
  const current = (mine: number): boolean => !disposed && generation === mine;

  /**
   * Whether a reply may still be shown.
   *
   * Three ways it may not: the store is disposed, the table changed, or this
   * turn was stopped. The last is why `stop` can be trusted with a transport
   * that ignores its signal — a late reply is dropped rather than appended as
   * if nothing had happened.
   */
  const deliverable = (
    mine: number,
    id: number,
    controller: AbortController
  ): boolean => current(mine) && turn === id && !controller.signal.aborted;

  /**
   * Work out whether this turn can be put back, and remember how.
   *
   * Compared against the view captured before the turn's calls ran. The
   * revision the plan is pinned to is the one the turn's own calls settled
   * at — the last result's — so anything that moves the table afterwards
   * retires the offer rather than being undone by it.
   */
  const recordUndo = (
    before: AgentContextView | null,
    reply: AssistantTransportReply,
    message: string
  ): boolean => {
    const session = live.session;
    const after = viewNow();
    const settledAt = reply.results?.at(-1)?.revision;
    if (!session || !before || !after || settledAt === undefined) return false;
    const planned = planUndo(before, after, session, settledAt);
    if ("code" in planned) {
      // Nothing moved, or something moved that no permitted capability can put
      // back. Either way this turn keeps whatever offer was already standing:
      // a turn that changed nothing does not retire the one before it.
      return false;
    }
    undoPlan = { message, undo: planned };
    // And one per action, where restoring a field to what it was before the
    // turn is exactly that action and nothing more. It is when one action in
    // the turn owns that field: the turn's opening view is then the view that
    // action ran against.
    //
    // Kept even when only one action moved anything, because the control
    // belongs ON that action. A turn drawing two cards and one loose button
    // above them says nothing about which card the button answers for — and
    // in a turn that re-applied a sort already in place, that is exactly the
    // shape it takes.
    actionPlans = new Map();
    const results = reply.results ?? [];
    const changed = (index: number, result: ExecuteResult) => {
      const key = reply.keys?.[index];
      if (!key || !result.ok) return undefined;
      return UNDO_FIELDS_FOR[key];
    };
    // Two actions moving the same field is the case a single before-state
    // cannot answer for. Sort ascending, then descending: the second ran
    // against a view the store never saw, so restoring the turn's opening
    // sort from that card would take the first action back with it. Those
    // cards carry no Undo of their own — the turn's own Undo is the offer
    // that tells the truth about them.
    const owners = new Map<string, number>();
    for (const [index, result] of results.entries()) {
      for (const field of changed(index, result) ?? []) {
        owners.set(field, (owners.get(field) ?? 0) + 1);
      }
    }
    for (const [index, result] of results.entries()) {
      const fields = changed(index, result);
      if (!fields) continue;
      if (fields.some((field) => (owners.get(field) ?? 0) > 1)) continue;
      const one = planUndo(before, after, session, settledAt, fields);
      if ("code" in one) continue;
      actionPlans.set(result.idempotencyKey, one);
    }
    return true;
  };

  /** Run one plan and report what went wrong, wherever it came from. */
  const runOneUndo = async (
    session: AgentSession,
    undo: AssistantUndo,
    idempotencyKey: string
  ): Promise<void> => {
    try {
      const results = await runUndo(
        session,
        undo,
        idempotencyKey,
        undefined,
        viewNow() ?? undefined
      );
      const failed = results.find((result) => !result.ok);
      if (failed) error = failed.error?.message ?? "the undo did not finish";
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
      errorCode = undefined;
    }
    publish();
  };

  /**
   * Give a host capability's receipt something to say.
   *
   * `subjectFor` describes the built-ins and declines everything else, which
   * is right — only a host's own runner knows what its capability did. But
   * the catalog knows what it is CALLED, and a card reading "done" is the
   * defect this whole surface exists to fix.
   */
  const named = (
    receipts: readonly AssistantReceipt[],
    keys: readonly string[] | undefined
  ): readonly AssistantReceipt[] =>
    receipts.map((receipt, index) => {
      if (receipt.subject) return receipt;
      const key = keys?.[index];
      const name = key ? capabilityName(key) : undefined;
      if (!name) return receipt;
      return {
        ...receipt,
        subject: { kind: "operation", terms: [{ value: name }] },
      };
    });

  const receive = (
    reply: AssistantTransportReply,
    before: AgentContextView | null,
    was: string
  ): void => {
    // The table's own policy decides whether an applied write is saved or
    // staged; the result cannot say on its own.
    const receipts = receiptsFromResults(
      reply.results ?? [],
      reply.keys,
      live.session?.manifest().policy.commit,
      reply.subjects
    );
    // No words, nothing applied, and no reason given. Pushing that as a
    // message renders an empty bubble under a "ready" badge: the reader is
    // told the turn worked and handed nothing to read or act on. It is a
    // turn that failed to answer, and it is reported as one — draft restored,
    // so a retry is one keystroke.
    if (silentTurn(reply, receipts.length)) {
      if (draft === "") draft = was;
      error = EMPTY_TURN;
      errorCode = undefined;
      status = "error";
      publish();
      return;
    }
    seq += 1;
    const id = messageId("assistant", seq);
    recordUndo(before, reply, id);
    push({
      id,
      role: "assistant",
      text: reply.text,
      at: Date.now(),
      receipts: receipts.length > 0 ? named(receipts, reply.keys) : undefined,
      outcome: receipts.length > 0 ? turnStatus(receipts) : undefined,
    });
    if (reply.unresolved) {
      error = reply.unresolved.message;
      errorCode = reply.unresolved.code;
    }
    setStatus(
      receipts.some((receipt) => receipt.status === "awaiting-approval")
        ? "awaiting-approval"
        : "ready"
    );
    publish();
  };

  const recover = (cause: unknown, aborted: boolean, was: string): void => {
    // Put the draft back unless the reader has already typed something else,
    // so a retry is one keystroke rather than retyping.
    if (draft === "") draft = was;
    // Stopping before a reply is not a failure to report as one, and nothing
    // is resent either way: an action whose outcome is unknown stays unknown.
    // A detached turn never reaches here at all: releasing the lane moves the
    // turn on, so the transport's eventual failure belongs to nobody.
    if (!aborted) {
      error = cause instanceof Error ? cause.message : String(cause);
      errorCode = undefined;
    }
    status = aborted ? "ready" : "error";
    publish();
  };

  /**
   * Settle the open question, once.
   *
   * Every path that ends a turn goes through here — the reader answering, a
   * stop, a new table, a failure — because a transport awaiting an answer
   * that never comes holds the turn open forever.
   */
  const settleQuestion = (given: AssistantAnswer | undefined): void => {
    const resume = resumeQuestion;
    // The message stays; it just stops asking. Dropping it would delete
    // something the assistant said.
    if (asking !== undefined) {
      const id = asking;
      setMessages(
        messages.map((entry) =>
          entry.id === id ? stripQuestion(entry) : entry
        )
      );
    }
    asking = undefined;
    resumeQuestion = undefined;
    resume?.(given);
  };

  const release = (mine: number, id: number): void => {
    // Only this turn's reservation, never a later turn's.
    if (generation !== mine || turn !== id) return;
    sending = false;
    abort = undefined;
    if (streamingMessage?.generation === mine && streamingMessage.turn === id) {
      streamingMessage = undefined;
    }
    settleQuestion(undefined);
    publish();
  };

  const startConnection = (): void => {
    const transport = live.transport;
    const session = live.session;
    if (!session || !transport) {
      setStatus("disconnected");
      return;
    }
    if (!transport.connect) {
      setStatus("ready");
      return;
    }
    const mine = generation;
    const controller = new AbortController();
    connection = controller;
    setStatus("connecting");
    void (async () => {
      try {
        await transport.connect?.({ session, signal: controller.signal });
        if (!current(mine) || connection !== controller) return;
        setStatus("ready");
      } catch (cause) {
        if (!current(mine) || connection !== controller) return;
        error = cause instanceof Error ? cause.message : String(cause);
        errorCode = undefined;
        status = "error";
        publish();
      }
    })();
  };

  /**
   * Close the open connection.
   *
   * `transport` is passed in rather than read from `live`, because the one
   * case that matters is a swap: `update` has already replaced the inputs by
   * the time this runs, and disconnecting the new transport would leave the
   * old one holding whatever it acquired — an endpoint credential included.
   */
  /**
   * Let go of the open connection.
   *
   * `released` is the transport being told the conversation is over, which is
   * what makes it forget whatever the backend established — its pin, and the
   * handle naming the thread that backend is holding. A session the host
   * rebuilt for the same table is not that: the reader is still talking to
   * the same backend about the same table, so the connection is re-made
   * rather than disowned.
   */
  const dropConnection = (
    transport = live.transport,
    released = true
  ): void => {
    connection?.abort();
    connection = undefined;
    if (released) transport?.disconnect?.();
  };

  /**
   * Take away the provisional message of a turn nobody is waiting for.
   *
   * Only the turn that put it there may take it: a turn whose transport
   * returns after the reader has moved on would otherwise clear a message the
   * turn they are watching is still writing into.
   */
  const dropStreamingMessage = (mine: number, id: number): void => {
    const owned = streamingMessage;
    if (owned === undefined) return;
    if (owned.generation !== mine || owned.turn !== id) return;
    streamingMessage = undefined;
    setMessages(messages.filter((entry) => entry.id !== owned.id));
  };

  /**
   * Stop waiting for the turn in flight.
   *
   * Released here rather than when the transport settles. One that never
   * settles would otherwise hold the composer busy forever; its eventual reply
   * is already undeliverable, because the turn it belonged to is no longer the
   * current one. The provisional message goes with it — a transport is asked
   * to honour `signal`, but it is host code and may not, and half a sentence
   * would otherwise stay in the transcript for good.
   */
  const releaseTurn = (): void => {
    dropStreamingMessage(generation, turn);
    turn += 1;
    sending = false;
    settleQuestion(undefined);
  };

  /** Stop waiting, and end the work behind it. */
  const cancelTurn = (): void => {
    if (!sending) return;
    abort?.abort();
    abort = undefined;
    releaseTurn();
  };

  /**
   * Stop waiting, and leave the work running.
   *
   * The signal is deliberately not raised: the backend was not asked to stop,
   * and a resume rejoins what it is still doing. The controller stays with the
   * turn that holds it, so its reply is dropped rather than delivered into a
   * conversation that has moved on.
   */
  const detachTurn = (): void => {
    if (!sending) return;
    abort = undefined;
    releaseTurn();
  };

  /**
   * How a turn began.
   *
   * Sending and resuming are the same turn from here on — the same lane, the
   * same streaming message, the same delivery rules — so they run one path and
   * differ only where they must: what the transport is asked, and whether the
   * reader's message is new to the transcript.
   */
  type TurnStart =
    | {
        readonly kind: "send";
        readonly text: string;
        readonly keepDraft: boolean;
        readonly audio?: AssistantAudio;
      }
    | { readonly kind: "resume"; readonly handle: AssistantResumeHandle };

  const runTurn = async (
    start: TurnStart,
    transport: AssistantTransport,
    session: AgentSession
  ): Promise<void> => {
    sending = true;
    interrupted = undefined;
    const mine = generation;
    turn += 1;
    const id = turn;
    const controller = new AbortController();
    abort = controller;
    const previousDraft = draft;
    // Captured before the transport runs, which is before any of this turn's
    // calls can execute. Reading it afterwards would capture what the turn
    // already did. A resumed turn takes it fresh for the same reason: the
    // baseline is where the table is now, not where it was when the connection
    // was lost.
    const before = viewNow();
    error = undefined;
    errorCode = undefined;
    status = "sending";
    let userMessageId: string | undefined;
    if (start.kind === "send") {
      seq += 1;
      if (!start.keepDraft) draft = "";
      userMessageId = messageId("user", seq);
      // `push` publishes; a resumed turn has nothing new to say, so it says
      // only that it is running again.
      push({
        id: userMessageId,
        role: "user",
        text: start.text,
        at: Date.now(),
        ...(start.audio ? { transcribing: true } : {}),
      });
    } else {
      publish();
    }
    // What the backend heard replaces the recording's placeholder in the
    // reader's own message, once, while the turn is still the current one.
    let heard: string | undefined;
    /** A recording nobody transcribed stops claiming it is being transcribed. */
    const settleVoice = (): void => {
      if (userMessageId === undefined || heard !== undefined) return;
      if (
        !messages.some(
          (entry) => entry.id === userMessageId && entry.transcribing
        )
      ) {
        return;
      }
      setMessages(
        messages.map((entry) =>
          entry.id === userMessageId ? { ...entry, transcribing: false } : entry
        )
      );
      publish();
    };
    const writeTranscript = (text: string | undefined): void => {
      if (userMessageId === undefined || heard !== undefined) return;
      const words = text?.trim();
      if (!words || !deliverable(mine, id, controller)) return;
      heard = words;
      setMessages(
        messages.map((entry) =>
          entry.id === userMessageId
            ? { ...entry, text: words, transcribing: false }
            : entry
        )
      );
      publish();
    };

    // One provisional message, updated in place as text arrives. A new entry
    // per delta would make the transcript grow by a message a token.
    seq += 1;
    const streamingId = messageId("assistant", seq);
    streamingMessage = { id: streamingId, generation: mine, turn: id };
    let streamed = "";
    let streamPending = false;
    const flushStream = (): void => {
      streamPending = false;
      if (!deliverable(mine, id, controller)) return;
      // A frame queued before the reply landed still belongs to a turn that is
      // current and uncancelled, so the turn alone does not say whether this
      // update is still wanted. The provisional message does: the reply takes
      // it away, and an update with nothing left to write into is spent.
      if (streamingMessage?.id !== streamingId) return;
      const existing = messages.some((entry) => entry.id === streamingId);
      setMessages(
        existing
          ? messages.map((entry) =>
              entry.id === streamingId
                ? { ...entry, text: streamed, streaming: true }
                : entry
            )
          : [
              ...messages,
              {
                id: streamingId,
                role: "assistant" as const,
                text: streamed,
                at: Date.now(),
                streaming: true,
              },
            ]
      );
      publish();
    };

    const shared = {
      session,
      conversation: exchanges(carried()),
      signal: controller.signal,
      onResumable: (token: unknown) => {
        // Named while the turn runs, because a connection released afterwards
        // is exactly when it is needed.
        if (!deliverable(mine, id, controller)) return;
        resumable = {
          text:
            start.kind === "send" ? (heard ?? start.text) : start.handle.text,
          token,
        };
        publish();
      },
      onTranscript: writeTranscript,
      onPartialText: (partial: string) => {
        streamed = partial;
        // Coalesced rather than published per token: a repaint per delta is a
        // render storm, and the reader cannot read that fast anyway.
        if (streamPending) return;
        streamPending = true;
        scheduleFlush(flushStream);
      },
      askUser: (asked: AssistantQuestion) =>
        new Promise<AssistantAnswer | undefined>((settle) => {
          // A question from a turn that is no longer the current one is
          // answered by nobody: resolving immediately lets that transport
          // report it as unresolved instead of waiting on a reader who is
          // looking at a different conversation.
          if (!deliverable(mine, id, controller)) {
            settle(undefined);
            return;
          }
          seq += 1;
          asking = messageId("assistant", seq);
          push({
            id: asking,
            role: "assistant",
            text: asked.question,
            at: Date.now(),
            question: asked,
          });
          resumeQuestion = settle;
          status = "awaiting-user";
          publish();
        }),
    };

    try {
      const reply =
        start.kind === "send"
          ? await transport.send({
              ...shared,
              text: start.text,
              ...(start.audio ? { audio: start.audio } : {}),
            })
          : await resumeWith(transport, shared, start.handle);
      writeTranscript(reply.transcript);
      // The provisional message goes when the real one lands. A reply is the
      // authority for what happened; the words that preceded it are not.
      dropStreamingMessage(mine, id);
      // A transport is asked to honour `signal`, but it is host code and may
      // not. Stop has to hold either way, so delivery is gated on the signal
      // as well as on the turn still being the current one.
      if (deliverable(mine, id, controller)) {
        // Whatever was left to come back to has arrived.
        resumable = undefined;
        receive(reply, before, previousDraft);
      }
    } catch (cause) {
      // An abandoned stream leaves nothing behind: the partial message is
      // dropped, and nothing ran, because calls execute only after the reply
      // is complete.
      dropStreamingMessage(mine, id);
      if (current(mine) && turn === id) {
        recover(cause, controller.signal.aborted, previousDraft);
      }
    } finally {
      settleVoice();
      release(mine, id);
    }
  };

  const send = async (text?: string): Promise<void> => {
    if (disposed) return;
    const outgoing = (text ?? draft).trim();
    if (!outgoing || sending) return;
    const transport = live.transport;
    const session = live.session;
    if (!session || !transport) {
      status = "disconnected";
      error = "no transport is connected";
      publish();
      return;
    }
    // A new question is not the old one: whatever was left running belongs to
    // a turn the reader has moved on from.
    resumable = undefined;
    await runTurn(
      { kind: "send", text: outgoing, keepDraft: text !== undefined },
      transport,
      session
    );
  };

  const sendClip = async (clip: AssistantAudio): Promise<void> => {
    if (disposed || sending) return;
    const transport = live.transport;
    const session = live.session;
    if (!session || !transport) {
      status = "disconnected";
      error = "no transport is connected";
      publish();
      return;
    }
    resumable = undefined;
    await runTurn(
      { kind: "send", text: "", keepDraft: true, audio: clip },
      transport,
      session
    );
  };

  // Taken once, so `publish` always has something to compare against. Without
  // it the first republish notifies whatever happened — which is precisely the
  // case a binding hits when it hands over its live inputs on a render before
  // anything has read the state. Building it is pure: no timer, no listener,
  // no connection.
  getState();

  return {
    getState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setDraft: (next) => {
      if (disposed || draft === next) return;
      draft = next;
      publish();
    },
    send,
    sendClip,
    stop: () => {
      if (disposed || !sending) return;
      cancelTurn();
      interrupted = "stopped";
      // The reader ended the work, so there is nothing to come back to. A
      // handle left standing would offer to rejoin something they cancelled.
      resumable = undefined;
      setStatus("ready");
      publish();
    },
    clear: () => {
      if (disposed) return;
      // Cancelling first rather than refusing: a reader who asks for a clear
      // transcript means it, and leaving a reply with nowhere to land is worse
      // than ending a turn they have visibly abandoned.
      cancelTurn();
      setMessages([]);
      error = undefined;
      errorCode = undefined;
      // The offer belonged to a message the reader has just removed.
      undoPlan = null;
      status = live.session && live.transport ? "ready" : status;
      publish();
    },
    runSuggestion: async (id) => {
      const authored = (live.suggestions ?? []).find(
        (candidate) => candidate.id === id
      );
      if (!authored) return;
      // Re-read the catalog HERE. A capability can go away between a chip
      // being drawn and being clicked, and the reader would otherwise send a
      // prompt the table can no longer serve. The executor would refuse it
      // anyway — this is so the refusal is not what they find out from.
      const available = live.session?.catalog().map((entry) => entry.key) ?? [];
      const [runnable] = eligibleSuggestions([authored], available);
      if (!runnable) return;
      await send(runnable.prompt);
    },
    revokeAlwaysAllow: (capability) => {
      if (disposed) return;
      live.onRevokeAlwaysAllow?.(capability);
      // The list itself belongs to whoever owns the memory; this publishes so
      // a surface re-reads rather than waiting for the next unrelated change.
      publish();
    },
    undoAction: async (idempotencyKey) => {
      const session = live.session;
      const plan = actionPlans.get(idempotencyKey);
      if (disposed || !session || !plan) return;
      if (undoBlocked(session, plan, viewNow() ?? undefined)) {
        publish();
        return;
      }
      // Only this one is retired. The others describe fields this undo does
      // not write, so they still stand — and the guard tells the truth about
      // any that do not.
      actionPlans.delete(idempotencyKey);
      // The whole-turn offer no longer describes the table: part of the turn
      // has been put back, so putting "the turn" back would be a second
      // answer to a question the reader has already answered.
      undoPlan = null;
      await runOneUndo(session, plan, `undo:${idempotencyKey}`);
    },
    undoTurn: async () => {
      const session = live.session;
      const plan = undoPlan;
      if (disposed || !session || !plan) return;
      if (undoBlocked(session, plan.undo, viewNow() ?? undefined)) {
        // The snapshot already says the offer has expired. Acting anyway would
        // put the table back to a state the reader has since moved away from.
        publish();
        return;
      }
      // Retired before the calls run: whatever happens next, this plan
      // describes a table that no longer exists once it has.
      undoPlan = null;
      actionPlans = new Map();
      await runOneUndo(session, plan.undo, `undo:${plan.message}`);
    },
    answer: (given) => {
      const open = openQuestion(messages);
      if (disposed || !open) return;
      // What they answered, in their own words: a chip that empties the
      // question and leaves nothing behind reads as a click that did nothing,
      // and the conversation a later turn is sent would show the assistant
      // asking into silence.
      const said = answerText(open, given);
      if (said) {
        seq += 1;
        push({
          id: messageId("user", seq),
          role: "user",
          text: said,
          at: Date.now(),
        });
      }
      // Back to work: the turn was never abandoned, it was waiting.
      setStatus("sending");
      settleQuestion(given);
      publish();
    },
    update: (next) => {
      if (disposed) return;
      const sessionChanged = next.session !== live.session;
      // A different table, which is a different conversation. Arriving at a
      // session, or losing one, is neither: a host that supplied a transcript
      // before its table was ready still means it.
      const nextTableId = next.session?.manifest().tableId;
      const tableChanged =
        tableId !== undefined &&
        nextTableId !== undefined &&
        nextTableId !== tableId;
      const transportChanged = next.transportKey !== live.transportKey;
      // The one that is about to be replaced, so it can be told.
      const previousTransport = live.transport;
      const supplied = next.messages;
      live = next;
      // A host that owns the transcript has handed over a different list: a
      // conversation loaded when the panel opened, a message that arrived on a
      // socket, a clear of its own. The same list back is that host holding
      // what it was already given, not undoing what just happened here.
      if (supplied !== undefined && supplied !== adopted) {
        adopted = supplied;
        messages = supplied;
      }
      if (sessionChanged) {
        // The turn in flight belonged to the session being replaced, and the
        // revisions its plans name belong to that session's counter.
        generation += 1;
        cancelTurn();
        tableId = nextTableId ?? tableId;
        // The transcript belongs to the table and the reader, not to the object
        // that happens to carry it. A host rebuilding the session for its own
        // reasons — a remounted provider, a re-keyed parent — is the same
        // conversation about the same table, and throwing it away loses work
        // the reader did. Only a different table is a different conversation.
        if (tableChanged) setMessages([]);
        error = undefined;
        errorCode = undefined;
        // A different table is not one this plan describes, and a revision
        // number from the old one could coincide with the new one's.
        undoPlan = null;
        actionPlans = new Map();
        // Whatever was still running belonged to the table the reader left.
        resumable = undefined;
        interrupted = undefined;
        dropConnection(previousTransport, tableChanged);
        startConnection();
        publish();
        return;
      }
      if (transportChanged) {
        cancelTurn();
        // Only the transport that started the work can rejoin it.
        resumable = undefined;
        interrupted = undefined;
        dropConnection(previousTransport);
        startConnection();
        publish();
        return;
      }
      // An ordinary update — a changed catalog, a new approval, a fresh
      // suggestion list. It republishes and touches nothing else.
      publish();
    },
    connect: () => {
      if (disposed) return;
      startConnection();
    },
    disconnect: () => {
      if (disposed) return;
      if (sending) {
        const handle = resumable;
        if (handle) {
          // The connection goes; the work does not. This conversation stops
          // waiting for the reply, the backend keeps going, and the handle
          // goes to whoever can keep it.
          detachTurn();
          interrupted = "detached";
          live.onDetach?.(handle);
        } else {
          // Nothing named anything to come back to, so releasing the
          // connection is the end of this turn. Saying so is better than
          // leaving a reader watching a turn that cannot finish.
          cancelTurn();
          interrupted = "stopped";
        }
      }
      dropConnection();
      setStatus("disconnected");
      publish();
    },
    resume: async () => {
      if (disposed || sending) return;
      const handle = resumable ?? live.resumeHandle;
      const transport = live.transport;
      const session = live.session;
      if (!handle || !session || !transport) return;
      if (!transport.resume) {
        error = "this transport cannot rejoin work it started";
        errorCode = "resume-unsupported";
        status = "error";
        publish();
        return;
      }
      resumable = handle;
      await runTurn({ kind: "resume", handle }, transport, session);
    },
    dispose: () => {
      if (disposed) return;
      cancelTurn();
      dropConnection();
      disposed = true;
      listeners.clear();
    },
  };
}
