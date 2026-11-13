/**
 * A turn's lane and a connection's life: reserving, releasing, cancelling,
 * detaching and settling an open question.
 */

import { type AssistantAnswer } from "./assistantContracts";
import { current, publish, setMessages, setStatus } from "./assistantSnapshot";
import { type AssistantStoreState, stripQuestion } from "./assistantState";

/**
 * Settle the open question, once.
 *
 * Every path that ends a turn goes through here — the reader answering, a
 * stop, a new table, a failure — because a transport awaiting an answer
 * that never comes holds the turn open forever.
 */
export function settleQuestion(
  s: AssistantStoreState,
  given: AssistantAnswer | undefined
): void {
  const resume = s.resumeQuestion;
  // The message stays; it just stops asking. Dropping it would delete
  // something the assistant said.
  if (s.asking !== undefined) {
    const id = s.asking;
    setMessages(
      s,
      s.messages.map((entry) =>
        entry.id === id ? stripQuestion(entry) : entry
      )
    );
  }
  s.asking = undefined;
  s.resumeQuestion = undefined;
  resume?.(given);
}

export function release(
  s: AssistantStoreState,
  mine: number,
  id: number
): void {
  // Only this turn's reservation, never a later turn's.
  if (s.generation !== mine || s.turn !== id) return;
  s.sending = false;
  s.abort = undefined;
  if (
    s.streamingMessage?.generation === mine &&
    s.streamingMessage.turn === id
  ) {
    s.streamingMessage = undefined;
  }
  settleQuestion(s, undefined);
  publish(s);
}

export function startConnection(s: AssistantStoreState): void {
  const transport = s.live.transport;
  const session = s.live.session;
  if (!session || !transport) {
    setStatus(s, "disconnected");
    return;
  }
  if (!transport.connect) {
    setStatus(s, "ready");
    return;
  }
  const mine = s.generation;
  const controller = new AbortController();
  s.connection = controller;
  setStatus(s, "connecting");
  void (async () => {
    try {
      await transport.connect?.({ session, signal: controller.signal });
      if (!current(s, mine) || s.connection !== controller) return;
      setStatus(s, "ready");
    } catch (cause) {
      if (!current(s, mine) || s.connection !== controller) return;
      s.error = cause instanceof Error ? cause.message : String(cause);
      s.errorCode = undefined;
      s.status = "error";
      publish(s);
    }
  })();
}

/**
 * Let go of the open connection.
 *
 * `transport` is passed in rather than read from `live`, because the one
 * case that matters is a swap: `update` has already replaced the inputs by
 * the time this runs, and disconnecting the new transport would leave the
 * old one holding whatever it acquired — an endpoint credential included.
 *
 * `released` is the transport being told the conversation is over, which is
 * what makes it forget whatever the backend established — its pin, and the
 * handle naming the thread that backend is holding. A session the host
 * rebuilt for the same table is not that: the reader is still talking to
 * the same backend about the same table, so the connection is re-made
 * rather than disowned.
 */
export function dropConnection(
  s: AssistantStoreState,
  transport = s.live.transport,
  released = true
): void {
  s.connection?.abort();
  s.connection = undefined;
  if (released) transport?.disconnect?.();
}

/**
 * Take away the provisional message of a turn nobody is waiting for.
 *
 * Only the turn that put it there may take it: a turn whose transport
 * returns after the reader has moved on would otherwise clear a message the
 * turn they are watching is still writing into.
 */
export function dropStreamingMessage(
  s: AssistantStoreState,
  mine: number,
  id: number
): void {
  const owned = s.streamingMessage;
  if (owned === undefined) return;
  if (owned.generation !== mine || owned.turn !== id) return;
  s.streamingMessage = undefined;
  setMessages(
    s,
    s.messages.filter((entry) => entry.id !== owned.id)
  );
}

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
export function releaseTurn(s: AssistantStoreState): void {
  dropStreamingMessage(s, s.generation, s.turn);
  s.turn += 1;
  s.sending = false;
  settleQuestion(s, undefined);
}

/** Stop waiting, and end the work behind it. */
export function cancelTurn(s: AssistantStoreState): void {
  if (!s.sending) return;
  s.abort?.abort();
  s.abort = undefined;
  releaseTurn(s);
}

/**
 * Stop waiting, and leave the work running.
 *
 * The signal is deliberately not raised: the backend was not asked to stop,
 * and a resume rejoins what it is still doing. The controller stays with the
 * turn that holds it, so its reply is dropped rather than delivered into a
 * conversation that has moved on.
 */
export function detachTurn(s: AssistantStoreState): void {
  if (!s.sending) return;
  s.abort = undefined;
  releaseTurn(s);
}
