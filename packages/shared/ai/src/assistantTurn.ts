/**
 * One turn: sending or resuming, streaming the reply, asking the reader, and
 * receiving or recovering from what came back.
 */

import {
  type AssistantAnswer,
  type AssistantAudio,
  type AssistantQuestion,
  type AssistantTransport,
  type AssistantTransportReply,
} from "./assistantContracts";
import { dropStreamingMessage, release } from "./assistantLifecycle";
import {
  type AssistantReceipt,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
import {
  capabilityName,
  carried,
  current,
  deliverable,
  publish,
  push,
  setMessages,
  setStatus,
  viewNow,
} from "./assistantSnapshot";
import {
  type AssistantStoreState,
  EMPTY_TURN,
  exchanges,
  messageId,
  resumeWith,
  scheduleFlush,
  silentTurn,
  type TurnStart,
} from "./assistantState";
import { recordUndo } from "./assistantUndoFlow";
import { type AgentContextView } from "./contextSnapshot";
import type { AgentSession } from "./types";

/**
 * Give a host capability's receipt something to say.
 *
 * `subjectFor` describes the built-ins and declines everything else, which
 * is right — only a host's own runner knows what its capability did. But
 * the catalog knows what it is CALLED, and a card reading "done" is the
 * defect this whole surface exists to fix.
 */
export function named(
  s: AssistantStoreState,
  receipts: readonly AssistantReceipt[],
  keys: readonly string[] | undefined
): readonly AssistantReceipt[] {
  return receipts.map((receipt, index) => {
    if (receipt.subject) return receipt;
    const key = keys?.[index];
    const name = key ? capabilityName(s, key) : undefined;
    if (!name) return receipt;
    return {
      ...receipt,
      subject: { kind: "operation", terms: [{ value: name }] },
    };
  });
}

export function receive(
  s: AssistantStoreState,
  reply: AssistantTransportReply,
  before: AgentContextView | null,
  was: string
): void {
  // The table's own policy decides whether an applied write is saved or
  // staged; the result cannot say on its own.
  const receipts = receiptsFromResults(
    reply.results ?? [],
    reply.keys,
    s.live.session?.manifest().policy.commit,
    reply.subjects
  );
  // No words, nothing applied, and no reason given. Pushing that as a
  // message renders an empty bubble under a "ready" badge: the reader is
  // told the turn worked and handed nothing to read or act on. It is a
  // turn that failed to answer, and it is reported as one — draft restored,
  // so a retry is one keystroke.
  if (silentTurn(reply, receipts.length)) {
    if (s.draft === "") s.draft = was;
    s.error = EMPTY_TURN;
    s.errorCode = undefined;
    s.status = "error";
    publish(s);
    return;
  }
  s.seq += 1;
  const id = messageId("assistant", s.seq);
  recordUndo(s, before, reply, id);
  push(s, {
    id,
    role: "assistant",
    text: reply.text,
    at: Date.now(),
    receipts: receipts.length > 0 ? named(s, receipts, reply.keys) : undefined,
    outcome: receipts.length > 0 ? turnStatus(receipts) : undefined,
  });
  if (reply.unresolved) {
    s.error = reply.unresolved.message;
    s.errorCode = reply.unresolved.code;
  }
  setStatus(
    s,
    receipts.some((receipt) => receipt.status === "awaiting-approval")
      ? "awaiting-approval"
      : "ready"
  );
  publish(s);
}

export function recover(
  s: AssistantStoreState,
  cause: unknown,
  aborted: boolean,
  was: string
): void {
  // Put the draft back unless the reader has already typed something else,
  // so a retry is one keystroke rather than retyping.
  if (s.draft === "") s.draft = was;
  // Stopping before a reply is not a failure to report as one, and nothing
  // is resent either way: an action whose outcome is unknown stays unknown.
  // A detached turn never reaches here at all: releasing the lane moves the
  // turn on, so the transport's eventual failure belongs to nobody.
  if (!aborted) {
    s.error = cause instanceof Error ? cause.message : String(cause);
    s.errorCode = undefined;
  }
  s.status = aborted ? "ready" : "error";
  publish(s);
}

export async function runTurn(
  s: AssistantStoreState,
  start: TurnStart,
  transport: AssistantTransport,
  session: AgentSession
): Promise<void> {
  s.sending = true;
  s.interrupted = undefined;
  const mine = s.generation;
  s.turn += 1;
  const id = s.turn;
  const controller = new AbortController();
  s.abort = controller;
  const previousDraft = s.draft;
  // Captured before the transport runs, which is before any of this turn's
  // calls can execute. Reading it afterwards would capture what the turn
  // already did. A resumed turn takes it fresh for the same reason: the
  // baseline is where the table is now, not where it was when the connection
  // was lost.
  const before = viewNow(s);
  s.error = undefined;
  s.errorCode = undefined;
  s.status = "sending";
  let userMessageId: string | undefined;
  if (start.kind === "send") {
    s.seq += 1;
    if (!start.keepDraft) s.draft = "";
    userMessageId = messageId("user", s.seq);
    // `push` publishes; a resumed turn has nothing new to say, so it says
    // only that it is running again.
    push(s, {
      id: userMessageId,
      role: "user",
      text: start.text,
      at: Date.now(),
      ...(start.audio ? { transcribing: true } : {}),
    });
  } else {
    publish(s);
  }
  // What the backend heard replaces the recording's placeholder in the
  // reader's own message, once, while the turn is still the current one.
  let heard: string | undefined;
  /** A recording nobody transcribed stops claiming it is being transcribed. */
  const settleVoice = (): void => {
    if (userMessageId === undefined || heard !== undefined) return;
    if (
      !s.messages.some(
        (entry) => entry.id === userMessageId && entry.transcribing
      )
    ) {
      return;
    }
    setMessages(
      s,
      s.messages.map((entry) =>
        entry.id === userMessageId ? { ...entry, transcribing: false } : entry
      )
    );
    publish(s);
  };
  const writeTranscript = (text: string | undefined): void => {
    if (userMessageId === undefined || heard !== undefined) return;
    const words = text?.trim();
    if (!words || !deliverable(s, mine, id, controller)) return;
    heard = words;
    setMessages(
      s,
      s.messages.map((entry) =>
        entry.id === userMessageId
          ? { ...entry, text: words, transcribing: false }
          : entry
      )
    );
    publish(s);
  };

  // One provisional message, updated in place as text arrives. A new entry
  // per delta would make the transcript grow by a message a token.
  s.seq += 1;
  const streamingId = messageId("assistant", s.seq);
  s.streamingMessage = { id: streamingId, generation: mine, turn: id };
  let streamed = "";
  let streamPending = false;
  const flushStream = (): void => {
    streamPending = false;
    if (!deliverable(s, mine, id, controller)) return;
    // A frame queued before the reply landed still belongs to a turn that is
    // current and uncancelled, so the turn alone does not say whether this
    // update is still wanted. The provisional message does: the reply takes
    // it away, and an update with nothing left to write into is spent.
    if (s.streamingMessage?.id !== streamingId) return;
    const existing = s.messages.some((entry) => entry.id === streamingId);
    setMessages(
      s,
      existing
        ? s.messages.map((entry) =>
            entry.id === streamingId
              ? { ...entry, text: streamed, streaming: true }
              : entry
          )
        : [
            ...s.messages,
            {
              id: streamingId,
              role: "assistant" as const,
              text: streamed,
              at: Date.now(),
              streaming: true,
            },
          ]
    );
    publish(s);
  };

  const shared = {
    session,
    conversation: exchanges(carried(s)),
    signal: controller.signal,
    onResumable: (token: unknown) => {
      // Named while the turn runs, because a connection released afterwards
      // is exactly when it is needed.
      if (!deliverable(s, mine, id, controller)) return;
      s.resumable = {
        text: start.kind === "send" ? (heard ?? start.text) : start.handle.text,
        token,
      };
      publish(s);
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
        if (!deliverable(s, mine, id, controller)) {
          settle(undefined);
          return;
        }
        s.seq += 1;
        s.asking = messageId("assistant", s.seq);
        push(s, {
          id: s.asking,
          role: "assistant",
          text: asked.question,
          at: Date.now(),
          question: asked,
        });
        s.resumeQuestion = settle;
        s.status = "awaiting-user";
        publish(s);
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
    dropStreamingMessage(s, mine, id);
    // A transport is asked to honour `signal`, but it is host code and may
    // not. Stop has to hold either way, so delivery is gated on the signal
    // as well as on the turn still being the current one.
    if (deliverable(s, mine, id, controller)) {
      // Whatever was left to come back to has arrived.
      s.resumable = undefined;
      receive(s, reply, before, previousDraft);
    }
  } catch (cause) {
    // An abandoned stream leaves nothing behind: the partial message is
    // dropped, and nothing ran, because calls execute only after the reply
    // is complete.
    dropStreamingMessage(s, mine, id);
    if (current(s, mine) && s.turn === id) {
      recover(s, cause, controller.signal.aborted, previousDraft);
    }
  } finally {
    settleVoice();
    release(s, mine, id);
  }
}

export async function send(
  s: AssistantStoreState,
  text?: string
): Promise<void> {
  if (s.disposed) return;
  const outgoing = (text ?? s.draft).trim();
  if (!outgoing || s.sending) return;
  const transport = s.live.transport;
  const session = s.live.session;
  if (!session || !transport) {
    s.status = "disconnected";
    s.error = "no transport is connected";
    publish(s);
    return;
  }
  // A new question is not the old one: whatever was left running belongs to
  // a turn the reader has moved on from.
  s.resumable = undefined;
  await runTurn(
    s,
    { kind: "send", text: outgoing, keepDraft: text !== undefined },
    transport,
    session
  );
}

export async function sendClip(
  s: AssistantStoreState,
  clip: AssistantAudio
): Promise<void> {
  if (s.disposed || s.sending) return;
  const transport = s.live.transport;
  const session = s.live.session;
  if (!session || !transport) {
    s.status = "disconnected";
    s.error = "no transport is connected";
    publish(s);
    return;
  }
  s.resumable = undefined;
  await runTurn(
    s,
    { kind: "send", text: "", keepDraft: true, audio: clip },
    transport,
    session
  );
}
