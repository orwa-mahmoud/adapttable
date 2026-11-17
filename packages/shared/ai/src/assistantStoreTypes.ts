/**
 * What a conversation controller publishes and accepts: messages, statuses,
 * snapshots, inputs and the store's own interface.
 */
import type { AgentProgress } from "@adapttable/core";

import {
  type AssistantAnswer,
  type AssistantAudio,
  type AssistantQuestion,
  type AssistantResumeHandle,
  type AssistantSuggestion,
  type AssistantTransport,
} from "./assistantContracts";
import {
  type AssistantReceipt,
  type AssistantTurnStatus,
} from "./assistantReceipts";
import { type UndoBlock } from "./assistantUndo";
import type { AgentContextInputs } from "./context";
import type { AgentSession } from "./types";

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
   * The machine code behind `error`, when a turn ended with work
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
