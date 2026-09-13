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
import {
  type AssistantAnswer,
  type AssistantExchange,
  type AssistantQuestion,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
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
  type UndoBlock,
  undoBlocked,
} from "./assistantUndo";
import type { AgentContextInputs } from "./context";
import { type AgentContextView, buildView } from "./contextSnapshot";
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

/** One shared empty list, so an unchanged snapshot stays identical. */
const EMPTY_ALLOWED: readonly string[] = [];

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
   * Text so far, while a transport is still streaming this reply.
   *
   * Present only on the message in flight, and cleared when the turn settles
   * into `text`. A panel renders it as provisional; nothing acts on it, and no
   * call is ever made from a partial reply.
   */
  readonly partialText?: string;
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
  /** How many primary suggestions to surface. The rest are `more`. */
  readonly primarySuggestions?: number;
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
   * Live view and filter data the manifest does not carry.
   *
   * A function, not a value: undo compares the view before a turn against the
   * view after it, and a fixed object would report that nothing moved. The
   * filter catalog belongs here too — without it the sanitized view carries no
   * filter state, and a turn that filtered would look like a turn that did
   * nothing.
   */
  readonly contextInputs?: () => AgentContextInputs;
  /** Capability keys the reader has waved through, for this contract. */
  readonly alwaysAllowed?: readonly string[];
  /** Ask about one of them again from now on. */
  readonly onRevokeAlwaysAllow?: (capability: string) => void;
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
  /** The suggestions this table can run right now. */
  readonly suggestions: readonly AssistantSuggestion[];
  /** Eligible suggestions past `primarySuggestions`. */
  readonly moreSuggestions: readonly AssistantSuggestion[];
  /** The pending approval a host supplied, or nothing. */
  readonly approval: unknown;
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
   * Capability keys the reader said not to ask about again.
   *
   * Readable with nothing pending, because that is when somebody goes looking
   * for what they agreed to.
   */
  readonly alwaysAllowed: readonly string[];
  /** Whether a send would do anything right now. */
  readonly canSend: boolean;
  /** Whether there is a turn to stop. */
  readonly canStop: boolean;
}

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
  /** Abort the turn in flight. Safe to call when nothing is in flight. */
  readonly stop: () => void;
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
  /** Release the connection without discarding the transcript. */
  readonly disconnect: () => void;
  /** Idempotent. After this, nothing is delivered and nothing is notified. */
  readonly dispose: () => void;
}

const DEFAULT_PRIMARY = 4;

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
  let messages: readonly AssistantMessage[] = [];
  let draft = "";
  let status: AssistantStatus = "idle";
  let error: string | undefined;
  let question: AssistantQuestion | null = null;
  // The last turn that actually moved the view, and which message it was.
  let undoPlan: { message: string; undo: AssistantUndo } | null = null;
  // The provisional message of the turn in flight, so an abandoned turn can
  // take it away itself rather than waiting for a transport to settle.
  let streamingMessage: string | undefined;
  let resumeQuestion:
    ((answer: AssistantAnswer | undefined) => void) | undefined;

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
  let sliceCache:
    | {
        readonly offered: readonly AssistantSuggestion[];
        readonly primary: number;
        readonly head: readonly AssistantSuggestion[];
        readonly tail: readonly AssistantSuggestion[];
      }
    | undefined;

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

  /** What the reader is offered about the last turn, read fresh. */
  const undoOffer = (): AssistantUndoOffer | null => {
    const session = live.session;
    if (!undoPlan || !session) return null;
    const blocked = undoBlocked(session, undoPlan.undo);
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
    a.approval === b.approval &&
    a.pendingQuestion === b.pendingQuestion &&
    sameOffer(a.undo, b.undo) &&
    sameKeys(a.alwaysAllowed, b.alwaysAllowed) &&
    a.canSend === b.canSend &&
    a.canStop === b.canStop &&
    a.suggestions === b.suggestions &&
    a.moreSuggestions === b.moreSuggestions;

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
    const primary = live.primarySuggestions ?? DEFAULT_PRIMARY;
    // Sliced once per eligibility answer, so an unchanged table hands back the
    // same arrays rather than equal ones.
    if (sliceCache?.offered !== offered || sliceCache.primary !== primary) {
      sliceCache = {
        offered,
        primary,
        head: offered.slice(0, primary),
        tail: offered.slice(primary),
      };
    }
    const parked = sending && live.awaitingApproval === true;
    snapshot = {
      // What the badge says. A parked write is not "working", and a reader
      // watching a spinner that will never resolve on its own is the reason
      // this is separate from `busy`. A question the backend asked parks the
      // conversation the same way: the turn that carried it has settled, so
      // the status underneath is "ready", and a badge saying so next to an
      // unanswered question tells the reader nothing is waiting on them when
      // something is.
      status: badgeStatus(status, question !== null, parked),
      busy: sending,
      messages,
      draft,
      error,
      suggestions: sliceCache.head,
      moreSuggestions: sliceCache.tail,
      approval: live.approval ?? null,
      pendingQuestion: question,
      undo: undoOffer(),
      alwaysAllowed: live.alwaysAllowed ?? EMPTY_ALLOWED,
      canSend: !sending && Boolean(live.session) && Boolean(live.transport),
      canStop: sending,
    };
    return snapshot;
  };

  const setStatus = (next: AssistantStatus): void => {
    if (status === next) return;
    status = next;
    publish();
  };

  const push = (message: AssistantMessage): void => {
    messages = [...messages, message];
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
    return true;
  };

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
      status = "error";
      publish();
      return;
    }
    seq += 1;
    const id = messageId("assistant", seq);
    const undoable = recordUndo(before, reply, id);
    push({
      id,
      role: "assistant",
      text: reply.text,
      at: Date.now(),
      receipts:
        receipts.length > 0
          ? receipts.map((receipt) => ({ ...receipt, undoable }))
          : undefined,
      outcome: receipts.length > 0 ? turnStatus(receipts) : undefined,
    });
    if (reply.unresolved) error = reply.unresolved.message;
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
    if (!aborted) {
      error = cause instanceof Error ? cause.message : String(cause);
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
    question = null;
    resumeQuestion = undefined;
    resume?.(given);
  };

  const release = (mine: number, id: number): void => {
    // Only this turn's reservation, never a later turn's.
    if (generation !== mine || turn !== id) return;
    sending = false;
    abort = undefined;
    streamingMessage = undefined;
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
  const dropConnection = (transport = live.transport): void => {
    connection?.abort();
    connection = undefined;
    transport?.disconnect?.();
  };

  /** Take away the provisional message of a turn nobody is waiting for. */
  const dropStreamingMessage = (): void => {
    if (streamingMessage === undefined) return;
    const id = streamingMessage;
    streamingMessage = undefined;
    messages = messages.filter((entry) => entry.id !== id);
  };

  const cancelTurn = (): void => {
    if (!sending) return;
    abort?.abort();
    abort = undefined;
    // A transport is asked to honour `signal`, but it is host code and may
    // not: one that never settles would otherwise leave half a sentence in
    // the transcript for good.
    dropStreamingMessage();
    // Release the lane here rather than waiting for the transport. One that
    // never settles would otherwise hold the composer busy forever; its
    // eventual reply is already undeliverable, because the turn it belonged to
    // is no longer the current one.
    turn += 1;
    sending = false;
    settleQuestion(undefined);
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
    sending = true;
    const mine = generation;
    turn += 1;
    const id = turn;
    const controller = new AbortController();
    abort = controller;
    seq += 1;
    const userMessage: AssistantMessage = {
      id: messageId("user", seq),
      role: "user",
      text: outgoing,
      at: Date.now(),
    };
    const previousDraft = draft;
    // Captured before the transport runs, which is before any of this turn's
    // calls can execute. Reading it afterwards would capture what the turn
    // already did.
    const before = viewNow();
    if (text === undefined) draft = "";
    error = undefined;
    status = "sending";
    push(userMessage);

    // One provisional message, updated in place as text arrives. A new entry
    // per delta would make the transcript grow by a message a token.
    seq += 1;
    const streamingId = messageId("assistant", seq);
    streamingMessage = streamingId;
    let streamed = "";
    let streamPending = false;
    const flushStream = (): void => {
      streamPending = false;
      if (!deliverable(mine, id, controller)) return;
      const existing = messages.some((entry) => entry.id === streamingId);
      messages = existing
        ? messages.map((entry) =>
            entry.id === streamingId
              ? { ...entry, partialText: streamed }
              : entry
          )
        : [
            ...messages,
            {
              id: streamingId,
              role: "assistant" as const,
              text: "",
              at: Date.now(),
              partialText: streamed,
            },
          ];
      publish();
    };

    try {
      const reply = await transport.send({
        session,
        text: outgoing,
        conversation: exchanges([...messages]),
        signal: controller.signal,
        onPartialText: (partial) => {
          streamed = partial;
          // Coalesced rather than published per token: a repaint per delta is
          // a render storm, and the reader cannot read that fast anyway.
          if (streamPending) return;
          streamPending = true;
          scheduleFlush(flushStream);
        },
        askUser: (asked) =>
          new Promise<AssistantAnswer | undefined>((settle) => {
            // A question from a turn that is no longer the current one is
            // answered by nobody: resolving immediately lets that transport
            // report it as unresolved instead of waiting on a reader who is
            // looking at a different conversation.
            if (!deliverable(mine, id, controller)) {
              settle(undefined);
              return;
            }
            question = asked;
            resumeQuestion = settle;
            status = "awaiting-user";
            publish();
          }),
      });
      // The provisional message goes when the real one lands. A reply is the
      // authority for what happened; the words that preceded it are not.
      dropStreamingMessage();
      // A transport is asked to honour `signal`, but it is host code and may
      // not. Stop has to hold either way, so delivery is gated on the signal
      // as well as on the turn still being the current one.
      if (deliverable(mine, id, controller)) {
        receive(reply, before, previousDraft);
      }
    } catch (cause) {
      // An abandoned stream leaves nothing behind: the partial message is
      // dropped, and nothing ran, because calls execute only after the reply
      // is complete.
      dropStreamingMessage();
      if (current(mine) && turn === id) {
        recover(cause, controller.signal.aborted, previousDraft);
      }
    } finally {
      release(mine, id);
    }
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
    stop: () => {
      if (disposed || !sending) return;
      cancelTurn();
      setStatus("ready");
      publish();
    },
    clear: () => {
      if (disposed) return;
      // Cancelling first rather than refusing: a reader who asks for a clear
      // transcript means it, and leaving a reply with nowhere to land is worse
      // than ending a turn they have visibly abandoned.
      cancelTurn();
      messages = [];
      error = undefined;
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
    undoTurn: async () => {
      const session = live.session;
      const plan = undoPlan;
      if (disposed || !session || !plan) return;
      if (undoBlocked(session, plan.undo)) {
        // The snapshot already says the offer has expired. Acting anyway would
        // put the table back to a state the reader has since moved away from.
        publish();
        return;
      }
      // Retired before the calls run: whatever happens next, this plan
      // describes a table that no longer exists once it has.
      undoPlan = null;
      try {
        const results = await runUndo(
          session,
          plan.undo,
          `undo:${plan.message}`
        );
        const failed = results.find((result) => !result.ok);
        if (failed) error = failed.error?.message ?? "the undo did not finish";
      } catch (cause) {
        error = cause instanceof Error ? cause.message : String(cause);
      }
      publish();
    },
    answer: (given) => {
      if (disposed || !question) return;
      // Back to work: the turn was never abandoned, it was waiting.
      setStatus("sending");
      settleQuestion(given);
      publish();
    },
    update: (next) => {
      if (disposed) return;
      const sessionChanged = next.session !== live.session;
      const transportChanged = next.transportKey !== live.transportKey;
      // The one that is about to be replaced, so it can be told.
      const previousTransport = live.transport;
      live = next;
      if (sessionChanged) {
        // A new session is a new table, or a new identity for this one. The
        // turn in flight belonged to the old one.
        generation += 1;
        cancelTurn();
        messages = [];
        error = undefined;
        // A different table is not one this plan describes, and a revision
        // number from the old one could coincide with the new one's.
        undoPlan = null;
        dropConnection(previousTransport);
        startConnection();
        publish();
        return;
      }
      if (transportChanged) {
        cancelTurn();
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
      dropConnection();
      setStatus("disconnected");
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
