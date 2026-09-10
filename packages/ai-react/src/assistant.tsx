/**
 * `@adapttable/ai-react` — the conversation lifecycle, without a UI.
 *
 * This entry owns state and nothing else: no markup, no launcher, no
 * provider client. A host renders its own panel from what the hook returns,
 * and the shipped widget is written against these same public values — which
 * is the only way to be sure it is not required.
 *
 * The rules that shape it:
 *
 * - **One send at a time**, reserved before any await. Two sends racing would
 *   interleave two turns' actions against one table.
 * - **A draft survives failure.** Losing what someone typed because a
 *   backend was down is worse than the outage.
 * - **A cancelled send is not a cancelled action.** Aborting before the
 *   transport answers is clean; aborting after actions began is reported for
 *   what it is, and nothing is retried — a mutation whose outcome is unknown
 *   is never sent twice.
 * - **A late reply is dropped.** A turn that was stopped, or that belonged
 *   to a previous table, never writes into the transcript.
 */
"use client";

import {
  type AgentSession,
  type ApprovalPolicy,
  type AssistantExchange,
  type AssistantReceipt,
  type AssistantReceiptStatus,
  type AssistantReceiptSubject,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurnStatus,
  type CommitPolicy,
  eligibleSuggestions,
  receiptsFromResults,
  type RowAddressScope,
  turnStatus,
  type WritePolicy,
} from "@adapttable/ai";
import {
  AGENT_APPROVAL_STATE,
  type AgentApprovalPending,
  useFeatureState,
} from "@adapttable/react/adapter";
import { useCallback, useEffect, useRef, useState } from "react";

// The hook's own options and state name these, so the entry that publishes
// the hook publishes them too — a consumer typing a variable from it should
// not have to reach into another entry point for the pieces.
export type {
  ApprovalPolicy,
  AssistantExchange,
  AssistantReceipt,
  AssistantReceiptStatus,
  AssistantReceiptSubject,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnStatus,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
};

/**
 * Where the conversation is.
 *
 * @public
 */
export type AssistantStatus =
  | "idle"
  | "connecting"
  | "ready"
  | "sending"
  | "awaiting-approval"
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
  /** What the actions in this turn actually did. */
  readonly receipts?: readonly AssistantReceipt[];
  /** The turn's overall outcome, when it ran actions. */
  readonly outcome?: AssistantTurnStatus;
}

/** How {@link useTableAssistant} is configured. @public */
export interface TableAssistantOptions {
  /** The live session. Changing it starts a new conversation. */
  readonly session: AgentSession | undefined;
  /**
   * Where a turn goes. Omit and the assistant stays disconnected.
   *
   * May be a fresh object every render — the controller reads the latest one
   * rather than reconnecting on its identity, so a host is not forced to
   * memoize it.
   */
  readonly transport?: AssistantTransport;
  /**
   * Changes when the transport should be re-established.
   *
   * The conversation resets on a new session, because that is a new table.
   * Swapping one transport for another — a backend for a scripted one — is
   * not visible in the object identity, so a host that does it names the
   * change here. A backend transport must never quietly become a simulated
   * one under the same key.
   */
  readonly transportKey?: string;
  /** Everything authored, filtered live against what the table offers. */
  readonly suggestions?: readonly AssistantSuggestion[];
  /** Controlled panel state. Omit for uncontrolled. */
  readonly open?: boolean;
  /** Called on every open/close request, controlled or not. */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Whether a write from this conversation is waiting on a human.
   *
   * `execute` does not return while an approval is open, so the turn looks
   * like thinking from in here. A host that renders the approval — or wires
   * `bridge.approvals` — passes it back so the panel can say what is
   * actually happening. The turn is still in flight and still stoppable.
   */
  readonly awaitingApproval?: boolean;
  /** How many primary suggestions to surface. The rest are `more`. */
  readonly primarySuggestions?: number;
}

/** What a host renders from. @public */
export interface TableAssistantState {
  readonly status: AssistantStatus;
  /**
   * Whether a turn is in flight and can still be stopped.
   *
   * Separate from {@link TableAssistantState.status}: a write parked on a
   * human approval reports `awaiting-approval` but is still running, and
   * Stop still ends it.
   */
  readonly busy: boolean;
  readonly messages: readonly AssistantMessage[];
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  /** Send the draft, or the given text. Resolves when the turn settles. */
  readonly send: (text?: string) => Promise<void>;
  /** Abort the turn in flight. Safe to call when nothing is in flight. */
  readonly stop: () => void;
  /** Drop the transcript. Refuses while a turn is in flight. */
  readonly clear: () => void;
  /**
   * A write waiting on the reader, or nothing.
   *
   * Hand it to the panel as `approval` and the conversation reviews it —
   * which is where a write asked for in the conversation belongs. The panel
   * draws it only when the approval's presentation names the widget, so
   * passing it costs nothing on a table reviewing elsewhere.
   */
  readonly approval: AgentApprovalPending | null;
  /** The suggestions this table can run right now, re-checked every render. */
  readonly suggestions: readonly AssistantSuggestion[];
  /** Eligible suggestions past `primarySuggestions`. */
  readonly moreSuggestions: readonly AssistantSuggestion[];
  /** Send a suggestion's prompt as if the reader had typed it. */
  readonly runSuggestion: (id: string) => Promise<void>;
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  /** The last failure, cleared by the next successful turn. */
  readonly error: string | undefined;
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
 * Run a table assistant.
 *
 * @param options - Session, transport and presentation.
 * @returns Everything a panel needs, and nothing about how it looks.
 *
 * @public
 */
export function useTableAssistant(
  options: TableAssistantOptions
): TableAssistantState {
  const { session, transport, transportKey, onOpenChange } = options;
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  // The live approval, so a host wires the panel with one prop rather than
  // reaching for feature state itself.
  const approval = useFeatureState(AGENT_APPROVAL_STATE);

  // Sending is reserved synchronously, before the first await. A state flag
  // would not be: two clicks in one tick would both read "not sending".
  const sending = useRef(false);
  // The latest transport, so an inline object does not read as a new one.
  const transportRef = useRef(transport);
  transportRef.current = transport;
  // The session and the authored list as they are NOW, so a click reads the
  // current table rather than the one the last render saw.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const suggestionsRef = useRef<readonly AssistantSuggestion[]>([]);
  suggestionsRef.current = options.suggestions ?? [];
  const abort = useRef<AbortController | undefined>(undefined);
  // Identity for ONE send. A late turn must not have its reservation cleared
  // by an earlier turn's finally block, and a reply must not land after the
  // turn that asked for it was abandoned.
  const turnId = useRef(0);
  const seq = useRef(0);
  // Identifies the conversation a reply belongs to. A reply that arrives
  // after the table changed carries the old generation and is discarded.
  const generation = useRef(0);
  const alive = useRef(true);

  const open = options.open ?? uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (options.open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [options.open, onOpenChange]
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      // Abort the send in flight. Without this a transport keeps working — and
      // keeps a request open — for a panel that no longer exists.
      abort.current?.abort();
      abort.current = undefined;
      sending.current = false;
    };
  }, []);

  // A new session is a new table, or a new identity for this one. The turn in
  // flight belonged to the old one, so it is aborted and its transcript
  // dropped rather than carried across.
  useEffect(() => {
    generation.current += 1;
    abort.current?.abort();
    abort.current = undefined;
    sending.current = false;
    setMessages([]);
    setError(undefined);
    const active = transportRef.current;
    if (!session || !active) {
      setStatus("disconnected");
      return;
    }
    if (!active.connect) {
      setStatus("ready");
      return () => {
        active.disconnect?.();
      };
    }
    const mine = generation.current;
    const controller = new AbortController();
    setStatus("connecting");
    void (async () => {
      try {
        await active.connect?.({ session, signal: controller.signal });
        if (!alive.current || generation.current !== mine) return;
        setStatus("ready");
      } catch (cause) {
        if (!alive.current || generation.current !== mine) return;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    })();
    return () => {
      controller.abort();
      active.disconnect?.();
    };
  }, [session, transportKey]);

  // Read on EVERY render, never memoized on the session object. A table
  // keeps one session and changes its capabilities in place, so caching by
  // object identity is caching by the one thing that does not move: turn a
  // feature off and the chip for it would sit there until something unrelated
  // happened to rerender.
  const available = session?.catalog().map((entry) => entry.key) ?? [];
  const eligible = eligibleSuggestions(options.suggestions ?? [], available);
  const primary = options.primarySuggestions ?? DEFAULT_PRIMARY;

  /**
   * Whether a reply still belongs here.
   *
   * A turn that outlived its panel or its table must not write anywhere: the
   * transcript it was answering is gone.
   */
  const current = useCallback(
    (mine: number) => alive.current && generation.current === mine,
    []
  );

  /**
   * Whether a reply may still be shown.
   *
   * Three ways it may not: the panel is gone, the table changed, or this turn
   * was stopped. The last one is the reason `stop()` can be trusted with a
   * transport that ignores its signal — a late reply is dropped rather than
   * appended as if nothing had happened.
   */
  const deliverable = useCallback(
    (mine: number, turn: number, controller: AbortController) =>
      alive.current &&
      generation.current === mine &&
      turnId.current === turn &&
      !controller.signal.aborted,
    []
  );

  const push = useCallback((message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const receive = useCallback(
    (reply: AssistantTransportReply) => {
      // The table's own policy decides whether an applied write is saved or
      // staged; the result cannot say on its own.
      const receipts = receiptsFromResults(
        reply.results ?? [],
        reply.keys,
        session?.manifest().policy.commit,
        reply.subjects
      );
      seq.current += 1;
      push({
        id: messageId("assistant", seq.current),
        role: "assistant",
        text: reply.text,
        at: Date.now(),
        receipts: receipts.length > 0 ? receipts : undefined,
        outcome: receipts.length > 0 ? turnStatus(receipts) : undefined,
      });
      setStatus(
        receipts.some((receipt) => receipt.status === "awaiting-approval")
          ? "awaiting-approval"
          : "ready"
      );
    },
    [push, session]
  );

  const recover = useCallback(
    (cause: unknown, aborted: boolean, was: string) => {
      // Put the draft back unless the reader has already typed something else,
      // so a retry is one keystroke rather than retyping.
      setDraft((current) => (current === "" ? was : current));
      // Stopping before a reply is not a failure to report as one, and nothing
      // is resent either way: an action whose outcome is unknown stays unknown.
      setStatus(aborted ? "ready" : "error");
      if (aborted) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    },
    []
  );

  const send = useCallback(
    async (text?: string): Promise<void> => {
      const outgoing = (text ?? draft).trim();
      if (!outgoing || sending.current) return;
      const active = transportRef.current;
      if (!session || !active) {
        setStatus("disconnected");
        setError("no transport is connected");
        return;
      }
      sending.current = true;
      const mine = generation.current;
      turnId.current += 1;
      const turn = turnId.current;
      const controller = new AbortController();
      abort.current = controller;
      seq.current += 1;
      const userMessage: AssistantMessage = {
        id: messageId("user", seq.current),
        role: "user",
        text: outgoing,
        at: Date.now(),
      };
      push(userMessage);
      setStatus("sending");
      setError(undefined);
      const previousDraft = draft;
      if (text === undefined) setDraft("");

      try {
        const reply = await active.send({
          session,
          text: outgoing,
          conversation: exchanges([...messages, userMessage]),
          signal: controller.signal,
        });
        // A transport is asked to honour `signal`, but it is host code and
        // may not. Stop has to hold either way, so delivery is gated on the
        // signal as well as on the turn still being the current one.
        if (deliverable(mine, turn, controller)) receive(reply);
      } catch (cause) {
        if (current(mine) && turnId.current === turn) {
          recover(cause, controller.signal.aborted, previousDraft);
        }
      } finally {
        // Only this turn's reservation, never a later turn's.
        if (generation.current === mine && turnId.current === turn) {
          sending.current = false;
          abort.current = undefined;
        }
      }
    },
    [current, deliverable, draft, messages, push, receive, recover, session]
  );

  const stop = useCallback(() => {
    if (!sending.current) return;
    abort.current?.abort();
    abort.current = undefined;
    // Release the lane here rather than waiting for the transport. A
    // transport that never settles would otherwise hold the panel busy
    // forever; its eventual reply is already undeliverable, because the turn
    // it belonged to is no longer the current one.
    turnId.current += 1;
    sending.current = false;
    setStatus("ready");
  }, []);

  const clear = useCallback(() => {
    // Clearing mid-turn would leave a reply with nowhere to land and hide an
    // action that is still running.
    if (sending.current) return;
    setMessages([]);
    setError(undefined);
  }, []);

  const runSuggestion = useCallback(
    async (id: string): Promise<void> => {
      const authored = suggestionsRef.current.find(
        (candidate) => candidate.id === id
      );
      if (!authored) return;
      // Re-read the catalog HERE, not from the list this render closed over.
      // A capability can go away between a chip being drawn and being
      // clicked, and the reader would otherwise send a prompt the table can
      // no longer serve. The executor would refuse it anyway — this is so the
      // refusal is not what the reader finds out from.
      const live =
        sessionRef.current?.catalog().map((entry) => entry.key) ?? [];
      const [runnable] = eligibleSuggestions([authored], live);
      if (!runnable) return;
      await send(runnable.prompt);
    },
    [send]
  );

  return {
    messages,
    draft,
    setDraft,
    send,
    stop,
    clear,
    // What the badge says. A parked write is not "working", and a reader
    // watching a spinner that will never resolve on its own is the reason
    // this is separate from `busy`.
    status:
      status === "sending" && options.awaitingApproval
        ? "awaiting-approval"
        : status,
    // Whether a turn can still be stopped. An approval parks the turn; it
    // does not end it, so Stop stays on the composer.
    busy: status === "sending",
    approval: approval ?? null,
    suggestions: eligible.slice(0, primary),
    moreSuggestions: eligible.slice(primary),
    runSuggestion,
    open,
    setOpen,
    error,
  };
}
