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
  type AgentContextInputs,
  type AgentSession,
  type AssistantExchange,
  type AssistantMessage,
  type AssistantQuestion,
  type AssistantReceipt,
  type AssistantStatus,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurnStatus,
  createTableAssistant,
} from "@adapttable/ai";
import {
  AGENT_ALWAYS_ALLOW_STATE,
  AGENT_APPROVAL_STATE,
  type AgentAlwaysAllowState,
  type AgentApprovalPending,
  useFeatureState,
} from "@adapttable/react/adapter";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// The hook's own options and state name these, so the entry that publishes
// the hook publishes them too — a consumer typing a variable from it should
// not have to reach into another entry point for the pieces.
export type {
  ApprovalPolicy,
  AssistantReceiptStatus,
  AssistantReceiptSubject,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "@adapttable/ai";
export type {
  AssistantExchange,
  AssistantMessage,
  AssistantQuestion,
  AssistantReceipt,
  AssistantStatus,
  AssistantTransport,
  AssistantTransportReply,
  AssistantUndoOffer,
  AssistantTurnStatus,
};

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
  /**
   * Live view and filter data the manifest does not carry.
   *
   * Read when a turn starts and again when it settles, so per-turn undo can
   * tell what the turn moved. A function rather than a value: a fixed object
   * would report that nothing changed.
   */
  readonly contextInputs?: () => AgentContextInputs;
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
  /**
   * A question the backend put to the reader, or nothing.
   *
   * The turn is parked rather than finished; answering resumes it.
   */
  readonly pendingQuestion: AssistantQuestion | null;
  /** Answer the pending question and let the turn continue. */
  readonly answer: (answer: { optionId?: string; text?: string }) => void;
  /**
   * Whether the last turn that moved the table can still be put back.
   *
   * Null when no turn moved it. Re-read every render, because the offer ends
   * the moment anything else changes the view. `blockedCode` is a token the
   * labels translate — the panel never shows a reader a code.
   */
  readonly undo: {
    readonly messageId: string;
    readonly available: boolean;
    readonly blockedCode?: string;
  } | null;
  /** Put that turn back. A no-op once the offer has expired. */
  readonly undoTurn: () => Promise<void>;
  /** Capability keys the reader said not to ask about again. */
  readonly alwaysAllowed: readonly string[];
  /** Ask about one of them again from now on. */
  readonly revokeAlwaysAllow: (capability: string) => void;
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

/**
 * Run a table assistant.
 *
 * A thin subscriber to the neutral controller in `@adapttable/ai/assistant`:
 * React supplies the external-store mechanism, the live inputs and the
 * controlled presentation state, and owns none of the lifecycle.
 *
 * @param options - Session, transport and presentation.
 * @returns Everything a panel needs, and nothing about how it looks.
 *
 * @public
 */
export function useTableAssistant(
  options: TableAssistantOptions
): TableAssistantState {
  const { onOpenChange } = options;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  // The live approval, so a host wires the panel with one prop rather than
  // reaching for feature state itself.
  const approval = useFeatureState(AGENT_APPROVAL_STATE);
  // What the reader has waved through, published by the binding whether or
  // not an approval is open.
  const alwaysAllow = useFeatureState(AGENT_ALWAYS_ALLOW_STATE);

  // Created once, inert until the mount effect connects it. Constructing a
  // store during render must not open a connection — a render can be thrown
  // away, and Strict Mode throws the first one away on purpose.
  const storeRef = useRef<ReturnType<typeof createTableAssistant> | null>(null);
  storeRef.current ??= createTableAssistant(
    inputsOf(options, approval, alwaysAllow)
  );
  const store = storeRef.current;

  // Live inputs, every render. The store decides what a change means: a new
  // session resets the conversation, a new transport key reconnects, and an
  // updated catalog or a newly arrived approval does neither.
  useEffect(() => {
    store.update(inputsOf(options, approval, alwaysAllow));
  });

  useEffect(() => {
    store.connect();
    return () => {
      store.dispose();
      // A disposed store is never reused. Strict Mode's second setup, and any
      // later remount, builds a fresh one rather than reviving one that has
      // already released its connection.
      storeRef.current = null;
    };
    // Mount and unmount only: every other change reaches the store through
    // `update` above, which is what keeps connection effects out of render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  );

  const open = options.open ?? uncontrolledOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (options.open === undefined) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [options.open, onOpenChange]
  );

  return {
    messages: state.messages,
    draft: state.draft,
    setDraft: store.setDraft,
    send: store.send,
    stop: store.stop,
    clear: store.clear,
    status: state.status,
    busy: state.busy,
    approval: approval ?? null,
    pendingQuestion: state.pendingQuestion,
    answer: store.answer,
    undo: state.undo
      ? {
          messageId: state.undo.messageId,
          available: state.undo.available,
          ...(state.undo.blocked
            ? { blockedCode: state.undo.blocked.code }
            : {}),
        }
      : null,
    undoTurn: store.undoTurn,
    alwaysAllowed: state.alwaysAllowed,
    revokeAlwaysAllow: store.revokeAlwaysAllow,
    suggestions: state.suggestions,
    moreSuggestions: state.moreSuggestions,
    runSuggestion: store.runSuggestion,
    open,
    setOpen,
    error: state.error,
  };
}

/** The hook's options as the store's live inputs. A projection, not a decision. */
function inputsOf(
  options: TableAssistantOptions,
  approval: AgentApprovalPending | null | undefined,
  alwaysAllow: AgentAlwaysAllowState | null | undefined
) {
  return {
    session: options.session,
    transport: options.transport,
    transportKey: options.transportKey,
    suggestions: options.suggestions,
    primarySuggestions: options.primarySuggestions,
    awaitingApproval: options.awaitingApproval,
    approval: approval ?? null,
    ...(options.contextInputs ? { contextInputs: options.contextInputs } : {}),
    ...(alwaysAllow
      ? {
          alwaysAllowed: alwaysAllow.capabilities,
          onRevokeAlwaysAllow: alwaysAllow.revoke,
        }
      : {}),
  };
}
