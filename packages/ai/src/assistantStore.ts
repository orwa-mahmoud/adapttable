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
  type AssistantReceipt,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  eligibleSuggestions,
} from "./assistantContracts";
import {
  type AssistantTurnStatus,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
import type { AgentSession } from "./types";

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
  let resumeQuestion: ((answer: AssistantAnswer) => void) | undefined;

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
    for (const listener of [...listeners]) listener();
  };

  const getState = (): TableAssistantSnapshot => {
    if (snapshot) return snapshot;
    const offered = eligible();
    const primary = live.primarySuggestions ?? DEFAULT_PRIMARY;
    // Sliced once per eligibility answer, so an unchanged table hands back the
    // same arrays rather than equal ones.
    if (
      !sliceCache ||
      sliceCache.offered !== offered ||
      sliceCache.primary !== primary
    ) {
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
      // this is separate from `busy`.
      status: parked && status === "sending" ? "awaiting-approval" : status,
      busy: sending,
      messages,
      draft,
      error,
      suggestions: sliceCache.head,
      moreSuggestions: sliceCache.tail,
      approval: live.approval ?? null,
      pendingQuestion: question,
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

  const receive = (reply: AssistantTransportReply): void => {
    // The table's own policy decides whether an applied write is saved or
    // staged; the result cannot say on its own.
    const receipts = receiptsFromResults(
      reply.results ?? [],
      reply.keys,
      live.session?.manifest().policy.commit,
      reply.subjects
    );
    seq += 1;
    push({
      id: messageId("assistant", seq),
      role: "assistant",
      text: reply.text,
      at: Date.now(),
      receipts: receipts.length > 0 ? receipts : undefined,
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

  const release = (mine: number, id: number): void => {
    // Only this turn's reservation, never a later turn's.
    if (generation !== mine || turn !== id) return;
    sending = false;
    abort = undefined;
    question = null;
    resumeQuestion = undefined;
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

  const dropConnection = (): void => {
    connection?.abort();
    connection = undefined;
    live.transport?.disconnect?.();
  };

  const cancelTurn = (): void => {
    if (!sending) return;
    abort?.abort();
    abort = undefined;
    // Release the lane here rather than waiting for the transport. One that
    // never settles would otherwise hold the composer busy forever; its
    // eventual reply is already undeliverable, because the turn it belonged to
    // is no longer the current one.
    turn += 1;
    sending = false;
    question = null;
    resumeQuestion = undefined;
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
    if (text === undefined) draft = "";
    error = undefined;
    status = "sending";
    push(userMessage);

    try {
      const reply = await transport.send({
        session,
        text: outgoing,
        conversation: exchanges([...messages]),
        signal: controller.signal,
      });
      // A transport is asked to honour `signal`, but it is host code and may
      // not. Stop has to hold either way, so delivery is gated on the signal
      // as well as on the turn still being the current one.
      if (deliverable(mine, id, controller)) receive(reply);
    } catch (cause) {
      if (current(mine) && turn === id) {
        recover(cause, controller.signal.aborted, previousDraft);
      }
    } finally {
      release(mine, id);
    }
  };

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
    answer: (given) => {
      if (disposed || !question) return;
      const resume = resumeQuestion;
      question = null;
      resumeQuestion = undefined;
      setStatus("sending");
      resume?.(given);
      publish();
    },
    update: (next) => {
      if (disposed) return;
      const sessionChanged = next.session !== live.session;
      const transportChanged = next.transportKey !== live.transportKey;
      live = next;
      if (sessionChanged) {
        // A new session is a new table, or a new identity for this one. The
        // turn in flight belonged to the old one.
        generation += 1;
        cancelTurn();
        messages = [];
        error = undefined;
        dropConnection();
        startConnection();
        publish();
        return;
      }
      if (transportChanged) {
        cancelTurn();
        dropConnection();
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
