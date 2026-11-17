/**
 * The conversation lifecycle, without a framework.
 *
 * One send at a time, a draft that survives a failure, a late reply that is
 * dropped rather than appended, a turn that belonged to a table the reader
 * has left — those are the same rules wherever the panel is drawn, so they
 * live here once and every binding subscribes to them.
 *
 * Each stage is its own module over one shared state object: the snapshot a
 * binding renders, the turn, its lane and connection, and undo.
 *
 * The rules that shape it:
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

import { eligibleSuggestions } from "./assistantContracts";
import {
  cancelTurn,
  detachTurn,
  dropConnection,
  settleQuestion,
  startConnection,
} from "./assistantLifecycle";
import {
  getState,
  publish,
  push,
  setMessages,
  setStatus,
  viewNow,
} from "./assistantSnapshot";
import {
  answerText,
  createAssistantState,
  messageId,
  openQuestion,
} from "./assistantState";
import {
  type TableAssistantInputs,
  type TableAssistantStore,
} from "./assistantStoreTypes";
import { runTurn, send, sendClip } from "./assistantTurn";
import { undoBlocked } from "./assistantUndo";
import { runOneUndo } from "./assistantUndoFlow";

export type {
  AssistantAllowance,
  AssistantInterruption,
  AssistantMessage,
  AssistantStatus,
  AssistantUndoOffer,
  TableAssistantInputs,
  TableAssistantSnapshot,
  TableAssistantStore,
} from "./assistantStoreTypes";

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
  const s = createAssistantState(inputs);
  // Taken once, so `publish` always has something to compare against. Without
  // it the first republish notifies whatever happened — which is precisely the
  // case a binding hits when it hands over its live inputs on a render before
  // anything has read the state. Building it is pure: no timer, no listener,
  // no connection.
  getState(s);

  return {
    getState: () => getState(s),
    subscribe: (listener) => {
      s.listeners.add(listener);
      return () => s.listeners.delete(listener);
    },
    setDraft: (next) => {
      if (s.disposed || s.draft === next) return;
      s.draft = next;
      publish(s);
    },
    send: (text) => send(s, text),
    sendClip: (clip) => sendClip(s, clip),
    stop: () => {
      if (s.disposed || !s.sending) return;
      cancelTurn(s);
      s.interrupted = "stopped";
      // The reader ended the work, so there is nothing to come back to. A
      // handle left standing would offer to rejoin something they cancelled.
      s.resumable = undefined;
      setStatus(s, "ready");
      publish(s);
    },
    clear: () => {
      if (s.disposed) return;
      // Cancelling first rather than refusing: a reader who asks for a clear
      // transcript means it, and leaving a reply with nowhere to land is worse
      // than ending a turn they have visibly abandoned.
      cancelTurn(s);
      setMessages(s, []);
      s.error = undefined;
      s.errorCode = undefined;
      // The offer belonged to a message the reader has just removed.
      s.undoPlan = null;
      s.actionPlans = new Map();
      s.resumable = undefined;
      s.interrupted = undefined;
      s.status = s.live.session && s.live.transport ? "ready" : s.status;
      publish(s);
    },
    runSuggestion: async (id) => {
      const authored = (s.live.suggestions ?? []).find(
        (candidate) => candidate.id === id
      );
      if (!authored) return;
      // Re-read the catalog HERE. A capability can go away between a chip
      // being drawn and being clicked, and the reader would otherwise send a
      // prompt the table can no longer serve. The executor would refuse it
      // anyway — this is so the refusal is not what they find out from.
      const available =
        s.live.session?.catalog().map((entry) => entry.key) ?? [];
      const [runnable] = eligibleSuggestions([authored], available);
      if (!runnable) return;
      await send(s, runnable.prompt);
    },
    revokeAlwaysAllow: (capability) => {
      if (s.disposed) return;
      s.live.onRevokeAlwaysAllow?.(capability);
      // The list itself belongs to whoever owns the memory; this publishes so
      // a surface re-reads rather than waiting for the next unrelated change.
      publish(s);
    },
    undoAction: async (idempotencyKey) => {
      const session = s.live.session;
      const plan = s.actionPlans.get(idempotencyKey);
      if (s.disposed || !session || !plan) return;
      if (undoBlocked(session, plan, viewNow(s) ?? undefined)) {
        publish(s);
        return;
      }
      // Only this one is retired. The others describe fields this undo does
      // not write, so they still stand — and the guard tells the truth about
      // any that do not.
      s.actionPlans.delete(idempotencyKey);
      // The whole-turn offer no longer describes the table: part of the turn
      // has been put back, so putting "the turn" back would be a second
      // answer to a question the reader has already answered.
      s.undoPlan = null;
      await runOneUndo(s, session, plan, `undo:${idempotencyKey}`);
    },
    undoTurn: async () => {
      const session = s.live.session;
      const plan = s.undoPlan;
      if (s.disposed || !session || !plan) return;
      if (undoBlocked(session, plan.undo, viewNow(s) ?? undefined)) {
        // The snapshot already says the offer has expired. Acting anyway would
        // put the table back to a state the reader has since moved away from.
        publish(s);
        return;
      }
      // Retired before the calls run: whatever happens next, this plan
      // describes a table that no longer exists once it has.
      s.undoPlan = null;
      s.actionPlans = new Map();
      await runOneUndo(s, session, plan.undo, `undo:${plan.message}`);
    },
    answer: (given) => {
      const open = openQuestion(s.messages);
      if (s.disposed || !open) return;
      // What they answered, in their own words: a chip that empties the
      // question and leaves nothing behind reads as a click that did nothing,
      // and the conversation a later turn is sent would show the assistant
      // asking into silence.
      const said = answerText(open, given);
      if (said) {
        s.seq += 1;
        push(s, {
          id: messageId("user", s.seq),
          role: "user",
          text: said,
          at: Date.now(),
        });
      }
      // Back to work: the turn was never abandoned, it was waiting.
      setStatus(s, "sending");
      settleQuestion(s, given);
      publish(s);
    },
    update: (next) => {
      if (s.disposed) return;
      const sessionChanged = next.session !== s.live.session;
      // A different table, which is a different conversation. Arriving at a
      // session, or losing one, is neither: a host that supplied a transcript
      // before its table was ready still means it.
      const nextTableId = next.session?.manifest().tableId;
      const tableChanged =
        s.tableId !== undefined &&
        nextTableId !== undefined &&
        nextTableId !== s.tableId;
      const transportChanged = next.transportKey !== s.live.transportKey;
      // The one that is about to be replaced, so it can be told.
      const previousTransport = s.live.transport;
      const supplied = next.messages;
      s.live = next;
      // A host that owns the transcript has handed over a different list: a
      // conversation loaded when the panel opened, a message that arrived on a
      // socket, a clear of its own. The same list back is that host holding
      // what it was already given, not undoing what just happened here.
      if (supplied !== undefined && supplied !== s.adopted) {
        s.adopted = supplied;
        s.messages = supplied;
      }
      if (sessionChanged) {
        // The turn in flight belonged to the session being replaced, and the
        // revisions its plans name belong to that session's counter.
        s.generation += 1;
        cancelTurn(s);
        s.tableId = nextTableId ?? s.tableId;
        // The transcript belongs to the table and the reader, not to the object
        // that happens to carry it. A host rebuilding the session for its own
        // reasons — a remounted provider, a re-keyed parent — is the same
        // conversation about the same table, and throwing it away loses work
        // the reader did. Only a different table is a different conversation.
        if (tableChanged) setMessages(s, []);
        s.error = undefined;
        s.errorCode = undefined;
        // A different table is not one this plan describes, and a revision
        // number from the old one could coincide with the new one's.
        s.undoPlan = null;
        s.actionPlans = new Map();
        // Whatever was still running belonged to the table the reader left.
        s.resumable = undefined;
        s.interrupted = undefined;
        dropConnection(s, previousTransport, tableChanged);
        startConnection(s);
        publish(s);
        return;
      }
      if (transportChanged) {
        cancelTurn(s);
        // Only the transport that started the work can rejoin it.
        s.resumable = undefined;
        s.interrupted = undefined;
        dropConnection(s, previousTransport);
        startConnection(s);
        publish(s);
        return;
      }
      // An ordinary update — a changed catalog, a new approval, a fresh
      // suggestion list. It republishes and touches nothing else.
      publish(s);
    },
    connect: () => {
      if (s.disposed) return;
      startConnection(s);
    },
    disconnect: () => {
      if (s.disposed) return;
      if (s.sending) {
        const handle = s.resumable;
        if (handle) {
          // The connection goes; the work does not. This conversation stops
          // waiting for the reply, the backend keeps going, and the handle
          // goes to whoever can keep it.
          detachTurn(s);
          s.interrupted = "detached";
          s.live.onDetach?.(handle);
        } else {
          // Nothing named anything to come back to, so releasing the
          // connection is the end of this turn. Saying so is better than
          // leaving a reader watching a turn that cannot finish.
          cancelTurn(s);
          s.interrupted = "stopped";
        }
      }
      dropConnection(s);
      setStatus(s, "disconnected");
      publish(s);
    },
    resume: async () => {
      if (s.disposed || s.sending) return;
      const handle = s.resumable ?? s.live.resumeHandle;
      const transport = s.live.transport;
      const session = s.live.session;
      if (!handle || !session || !transport) return;
      if (!transport.resume) {
        s.error = "this transport cannot rejoin work it started";
        s.errorCode = "resume-unsupported";
        s.status = "error";
        publish(s);
        return;
      }
      s.resumable = handle;
      await runTurn(s, { kind: "resume", handle }, transport, session);
    },
    dispose: () => {
      if (s.disposed) return;
      cancelTurn(s);
      dropConnection(s);
      s.disposed = true;
      s.listeners.clear();
    },
  };
}
