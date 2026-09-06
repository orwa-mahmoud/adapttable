/**
 * `@adapttable/ai/assistant` — the conversation lifecycle, without a UI.
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type AssistantExchange,
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
import type { AgentSession } from "./types";

// The hook's own options and state name these, so the entry that publishes
// the hook publishes them too — a consumer typing a variable from it should
// not have to reach into another entry point for the pieces.
export type {
  AssistantExchange,
  AssistantTransport,
  AssistantTransportReply,
} from "./assistantContracts";
export type {
  AssistantReceipt,
  AssistantReceiptStatus,
  AssistantTurnStatus,
} from "./assistantReceipts";
export type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
export type * from "./types";

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
  /** How many primary suggestions to surface. The rest are `more`. */
  readonly primarySuggestions?: number;
}

/** What a host renders from. @public */
export interface TableAssistantState {
  readonly status: AssistantStatus;
  readonly messages: readonly AssistantMessage[];
  readonly draft: string;
  readonly setDraft: (draft: string) => void;
  /** Send the draft, or the given text. Resolves when the turn settles. */
  readonly send: (text?: string) => Promise<void>;
  /** Abort the turn in flight. Safe to call when nothing is in flight. */
  readonly stop: () => void;
  /** Drop the transcript. Refuses while a turn is in flight. */
  readonly clear: () => void;
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

  // Sending is reserved synchronously, before the first await. A state flag
  // would not be: two clicks in one tick would both read "not sending".
  const sending = useRef(false);
  // The latest transport, so an inline object does not read as a new one.
  const transportRef = useRef(transport);
  transportRef.current = transport;
  const abort = useRef<AbortController | undefined>(undefined);
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

  const available = useMemo(
    () => session?.catalog().map((entry) => entry.key) ?? [],
    [session]
  );
  // Eligibility is recomputed from the live catalog on every render, so a
  // chip rendered a second ago is re-checked before its prompt is sent.
  const eligible = useMemo(
    () => eligibleSuggestions(options.suggestions ?? [], available),
    [options.suggestions, available]
  );
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

  const push = useCallback((message: AssistantMessage) => {
    setMessages((current) => [...current, message]);
  }, []);

  const receive = useCallback(
    (reply: AssistantTransportReply) => {
      const receipts = receiptsFromResults(reply.results ?? [], reply.keys);
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
    [push]
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
        if (current(mine)) receive(reply);
      } catch (cause) {
        if (current(mine)) {
          recover(cause, controller.signal.aborted, previousDraft);
        }
      } finally {
        if (generation.current === mine) {
          sending.current = false;
          abort.current = undefined;
        }
      }
    },
    [current, draft, messages, push, receive, recover, session]
  );

  const stop = useCallback(() => {
    abort.current?.abort();
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
      // Re-checked here, not when the chip rendered: a capability can go away
      // between the two.
      const suggestion = eligible.find((candidate) => candidate.id === id);
      if (!suggestion) return;
      // The reader sees this prompt, so this is the text that gets sent.
      await send(suggestion.prompt);
    },
    [eligible, send]
  );

  return {
    status,
    messages,
    draft,
    setDraft,
    send,
    stop,
    clear,
    suggestions: eligible.slice(0, primary),
    moreSuggestions: eligible.slice(primary),
    runSuggestion,
    open,
    setOpen,
    error,
  };
}
