/**
 * The snapshot a binding renders: derived from the controller's state,
 * kept identical while nothing an observer can see has moved.
 */
import { sameItems } from "@adapttable/core/binding";

import {
  type AssistantSuggestion,
  eligibleSuggestions,
} from "./assistantContracts";
import {
  type AssistantStoreState,
  badgeStatus,
  openQuestion,
} from "./assistantState";
import {
  type AssistantAllowance,
  type AssistantMessage,
  type AssistantStatus,
  type AssistantUndoOffer,
  type TableAssistantSnapshot,
} from "./assistantStoreTypes";
import { undoBlocked } from "./assistantUndo";
import { type AgentContextView, buildView } from "./contextSnapshot";

/** One shared empty list, so an unchanged snapshot stays identical. */
const EMPTY_ALLOWED: readonly string[] = [];

/** The same, for the allowances built from them. */
const EMPTY_ALLOWANCES: readonly AssistantAllowance[] = [];

export function eligible(
  s: AssistantStoreState
): readonly AssistantSuggestion[] {
  // Read at call time, never memoized on the session object: a table keeps
  // one session and changes its capabilities in place, so a chip for a
  // feature just turned off would otherwise sit there until something
  // unrelated happened to republish.
  const keys = s.live.session?.catalog().map((entry) => entry.key) ?? [];
  const available = keys.join("\u0000");
  if (
    s.offeredCache &&
    s.offeredCache.authored === s.live.suggestions &&
    s.offeredCache.available === available
  ) {
    return s.offeredCache.value;
  }
  const value = eligibleSuggestions(s.live.suggestions ?? [], keys);
  s.offeredCache = { authored: s.live.suggestions, available, value };
  return value;
}

/** Whether two undo offers say the same thing. */
export function sameOffer(
  a: AssistantUndoOffer | null,
  b: AssistantUndoOffer | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.messageId === b.messageId &&
    a.available === b.available &&
    a.blocked?.code === b.blocked?.code
  );
}

/**
 * The sanitized view right now, as undo compares it.
 *
 * The view alone, not the whole context: a turn's undo needs what the table
 * is showing, and building the contract and its prompt rendering to get
 * there would pull all of that into a conversation bundle.
 */
export function viewNow(s: AssistantStoreState): AgentContextView | null {
  const session = s.live.session;
  if (!session) return null;
  const inputs = s.live.contextInputs?.() ?? {};
  return buildView(
    { revision: session.manifest().viewRevision, ...inputs.view },
    inputs.filters ?? []
  );
}

/**
 * The transcript, with each receipt's offer read fresh.
 *
 * `undoable` is a live question, not something a turn settles once: undoing
 * one action retires that action's plan, and a card still drawing a control
 * for it would be a control that does nothing. Kept identical when nothing
 * is on offer, so an unchanged snapshot stays unchanged.
 */
export function offeredMessages(
  s: AssistantStoreState
): readonly AssistantMessage[] {
  if (s.actionPlans.size === 0) return s.messages;
  // Cached on what it is derived from, because a subscriber compares the
  // transcript by identity: a fresh array on every read is a render loop,
  // not a re-render.
  const keys = [...s.actionPlans.keys()].join("\u0000");
  if (
    s.transcriptCache?.source === s.messages &&
    s.transcriptCache.keys === keys
  ) {
    return s.transcriptCache.value;
  }
  const value = s.messages.map((message) => {
    if (!message.receipts) return message;
    return {
      ...message,
      receipts: message.receipts.map((receipt) => ({
        ...receipt,
        undoable: s.actionPlans.has(receipt.idempotencyKey),
      })),
    };
  });
  s.transcriptCache = { source: s.messages, keys, value };
  return value;
}

/**
 * What a capability is called, in the words whoever wrote it chose.
 *
 * The built-in keys have translations; a host's own does not, and printing
 * `staff.raiseTeam` at a reader tells them the developer's identifier
 * rather than what the table did. The catalog carries the definition's own
 * one-line summary, which is the closest thing to a name it has.
 */
export function capabilityName(
  s: AssistantStoreState,
  key: string
): string | undefined {
  const entry = s.live.session
    ?.catalog()
    .find((candidate) => candidate.key === key);
  return entry?.summaryShort ?? entry?.summary;
}

export function allowances(
  s: AssistantStoreState,
  keys: readonly string[] | undefined
): readonly AssistantAllowance[] {
  const list = keys ?? EMPTY_ALLOWED;
  if (list.length === 0) return EMPTY_ALLOWANCES;
  // Built once per list, so an unchanged table hands back the same array
  // rather than an equal one — a snapshot never equal to the last is a
  // render loop in a binding that subscribes.
  if (s.namesCache && sameItems(s.namesCache.keys, list))
    return s.namesCache.value;
  const value = list.map((capability) => {
    const name = capabilityName(s, capability);
    return name === undefined ? { capability } : { capability, name };
  });
  s.namesCache = { keys: list, value };
  return value;
}

/** What the reader is offered about the last turn, read fresh. */
export function undoOffer(s: AssistantStoreState): AssistantUndoOffer | null {
  const session = s.live.session;
  if (!s.undoPlan || !session) return null;
  // The live view, so a revision the turn's own approved write moved does
  // not retire an offer that still stands.
  const blocked = undoBlocked(
    session,
    s.undoPlan.undo,
    viewNow(s) ?? undefined
  );
  return {
    messageId: s.undoPlan.message,
    available: !blocked,
    ...(blocked ? { blocked } : {}),
  };
}

/** Whether two snapshots say the same thing. */
export function same(
  a: TableAssistantSnapshot,
  b: TableAssistantSnapshot
): boolean {
  return (
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
    a.suggestions === b.suggestions
  );
}

/**
 * Rebuild, and notify only when something an observer can see has moved.
 *
 * A binding is allowed to hand the store its live inputs on every render;
 * this is what makes that safe. The previous snapshot is kept when nothing
 * changed, so a subscriber's identity check holds and no render loops.
 */
export function publish(s: AssistantStoreState): void {
  if (s.disposed) {
    s.snapshot = undefined;
    return;
  }
  const previous = s.snapshot;
  s.snapshot = undefined;
  const next = getState(s);
  if (previous && same(previous, next)) {
    s.snapshot = previous;
    return;
  }
  // Copied first: a listener that unsubscribes while it is being notified
  // must not change the set this loop is walking.
  const notifying = [...s.listeners];
  for (const listener of notifying) listener();
}

export function getState(s: AssistantStoreState): TableAssistantSnapshot {
  if (s.snapshot) return s.snapshot;
  const offered = eligible(s);
  const parked = s.sending && s.live.awaitingApproval === true;
  s.snapshot = {
    // What the badge says. A parked write is not "working", and a reader
    // watching a spinner that will never resolve on its own is the reason
    // this is separate from `busy`. A question the backend asked parks the
    // conversation the same way: the turn that carried it has settled, so
    // the status underneath is "ready", and a badge saying so next to an
    // unanswered question tells the reader nothing is waiting on them when
    // something is.
    status: badgeStatus(s.status, s.asking !== undefined, parked),
    busy: s.sending,
    messages: offeredMessages(s),
    draft: s.draft,
    error: s.error,
    errorCode: s.errorCode,
    suggestions: offered,
    approval: s.live.approval ?? null,
    // Only while a turn is running: a report that outlived its turn would be
    // a count standing beside a finished conversation.
    progress: s.sending ? (s.live.progress ?? null) : null,
    pendingQuestion: openQuestion(s.messages),
    undo: undoOffer(s),
    alwaysAllowed: allowances(s, s.live.alwaysAllowed),
    interrupted: s.interrupted,
    // A handle the host kept across a reload counts: the store has no turn
    // of its own to come back to, and the reader still does.
    resumable: s.resumable ?? s.live.resumeHandle,
  };
  return s.snapshot;
}

export function setStatus(s: AssistantStoreState, next: AssistantStatus): void {
  if (s.status === next) return;
  s.status = next;
  publish(s);
}

/**
 * Change the transcript, and tell whoever owns it.
 *
 * One write path, so a host that keeps the conversation of its own — in a
 * database, on another device, on a socket — hears about every change
 * without this store deciding which changes are worth reporting.
 */
export function setMessages(
  s: AssistantStoreState,
  next: readonly AssistantMessage[]
): void {
  s.messages = next;
  s.live.onMessagesChange?.(next);
}

/**
 * The conversation as it travels.
 *
 * What a reader sees is never trimmed; this is only what a backend is told.
 * A backend that keeps its own session is sent none of it and answers from
 * what it remembers.
 */
export function carried(s: AssistantStoreState): readonly AssistantMessage[] {
  const limit = s.live.conversation;
  if (limit === undefined || limit === "full") return s.messages;
  const kept = Math.max(0, Math.trunc(limit));
  return kept === 0 ? [] : s.messages.slice(-kept);
}

export function push(s: AssistantStoreState, message: AssistantMessage): void {
  setMessages(s, [...s.messages, message]);
  publish(s);
}

/** Whether a reply still belongs to this conversation. */
export function current(s: AssistantStoreState, mine: number): boolean {
  return !s.disposed && s.generation === mine;
}

/**
 * Whether a reply may still be shown.
 *
 * Three ways it may not: the store is disposed, the table changed, or this
 * turn was stopped. The last is why `stop` can be trusted with a transport
 * that ignores its signal — a late reply is dropped rather than appended as
 * if nothing had happened.
 */
export function deliverable(
  s: AssistantStoreState,
  mine: number,
  id: number,
  controller: AbortController
): boolean {
  return current(s, mine) && s.turn === id && !controller.signal.aborted;
}
