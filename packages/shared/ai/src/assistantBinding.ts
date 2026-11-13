/**
 * What every framework binding of the assistant computes the same way.
 *
 * A binding supplies its framework's subscription and lifecycle; the mapping
 * from its options and the table's feature state to the controller's inputs,
 * and from the controller's snapshot to the fields a panel renders, is one
 * answer and lives here.
 */
import type { AgentApprovalPending, AgentProgress } from "@adapttable/core";
import type {
  AgentAlwaysAllowState,
  AgentViewState,
} from "@adapttable/core/binding";

import type {
  AssistantUndoOffer,
  TableAssistantInputs,
  TableAssistantSnapshot,
  TableAssistantStore,
} from "./assistantStoreTypes";
import type { AlwaysAllowedState } from "./binding";
import type { AgentContextInputs } from "./context";

/**
 * What a table publishes to a panel through feature state. A panel outside
 * the table reads none of it and passes the same facts as options instead.
 *
 * @public
 */
export interface AssistantTableState {
  /** The write waiting on the reader, if one is. */
  readonly approval?: AgentApprovalPending | null;
  /** What the reader has waved through, and how to take it back. */
  readonly alwaysAllow?: AgentAlwaysAllowState | null;
  /** The table's reader of its live view and filters. */
  readonly viewState?: AgentViewState | null;
  /** How far the capability now running has got. */
  readonly progress?: AgentProgress | null;
}

/**
 * A binding's assistant options, as far as the controller reads them.
 *
 * `approval`, `progress` and `alwaysAllow` are for a panel mounted outside the
 * table, which has no feature state to read; when given they win over it.
 *
 * @public
 */
export interface AssistantBindingOptions extends Omit<
  TableAssistantInputs,
  "approval" | "progress" | "alwaysAllowed" | "onRevokeAlwaysAllow"
> {
  /** The write waiting on the reader, for a panel outside the table. */
  readonly approval?: AgentApprovalPending | null;
  /** The running capability's progress, for a panel outside the table. */
  readonly progress?: AgentProgress | null;
  /** What the reader has waved through, for a panel outside the table. */
  readonly alwaysAllow?: AlwaysAllowedState;
}

/** The option when it was given, else the table's own, else nothing. */
function given<T>(own: T | null | undefined, table: T | null | undefined) {
  return own !== undefined ? (own ?? null) : (table ?? null);
}

/**
 * The controller's inputs from a binding's options and the table's state.
 *
 * The host's own reader of the view wins; otherwise the table's, which is what
 * makes per-turn undo work without a host lifting page and sort into its own
 * state. A write waiting on the reader parks the turn unless the host says
 * otherwise.
 *
 * @public
 */
export function tableAssistantInputs(
  options: AssistantBindingOptions,
  table: AssistantTableState
): TableAssistantInputs {
  const approval = given(options.approval, table.approval);
  const allow = options.alwaysAllow ?? table.alwaysAllow ?? undefined;
  const reader = table.viewState;
  const contextInputs =
    options.contextInputs ??
    (reader ? () => reader.read() as AgentContextInputs : undefined);
  return {
    session: options.session,
    transport: options.transport,
    transportKey: options.transportKey,
    suggestions: options.suggestions,
    awaitingApproval: options.awaitingApproval ?? approval !== null,
    approval,
    progress: given(options.progress, table.progress),
    ...(contextInputs ? { contextInputs } : {}),
    ...(options.onDetach ? { onDetach: options.onDetach } : {}),
    ...(options.messages ? { messages: options.messages } : {}),
    ...(options.onMessagesChange
      ? { onMessagesChange: options.onMessagesChange }
      : {}),
    ...(options.conversation === undefined
      ? {}
      : { conversation: options.conversation }),
    ...(options.resumeHandle ? { resumeHandle: options.resumeHandle } : {}),
    ...(allow
      ? {
          alwaysAllowed: allow.capabilities,
          onRevokeAlwaysAllow: allow.revoke,
        }
      : {}),
  };
}

/**
 * The undo offer as a panel draws it. `blockedCode` is a token the labels
 * translate — the panel never shows a reader a code.
 *
 * @public
 */
export interface AssistantUndoView {
  /** The assistant message the offer belongs to. */
  readonly messageId: string;
  /** Whether the control is live right now. */
  readonly available: boolean;
  /** Why it is not, as a label token, when it is not. */
  readonly blockedCode?: string;
}

/** The undo offer as a panel draws it, or `null` when there is none. @public */
export function assistantUndoView(
  undo: AssistantUndoOffer | null
): AssistantUndoView | null {
  if (!undo) return null;
  return {
    messageId: undo.messageId,
    available: undo.available,
    ...(undo.blocked ? { blockedCode: undo.blocked.code } : {}),
  };
}

/**
 * What a panel renders from one snapshot, before the binding adds its own
 * open state and the approval it reads.
 *
 * @public
 */
export type TableAssistantFields = Pick<
  TableAssistantSnapshot,
  | "messages"
  | "draft"
  | "interrupted"
  | "resumable"
  | "status"
  | "busy"
  | "progress"
  | "alwaysAllowed"
  | "suggestions"
  | "error"
  | "errorCode"
> &
  Pick<
    TableAssistantStore,
    | "setDraft"
    | "send"
    | "sendClip"
    | "stop"
    | "resume"
    | "clear"
    | "answer"
    | "undoTurn"
    | "undoAction"
    | "revokeAlwaysAllow"
    | "runSuggestion"
  > & { readonly undo: AssistantUndoView | null };

/**
 * The snapshot's fields and the store's actions, as one object a panel
 * renders from.
 *
 * @public
 */
export function tableAssistantFields(
  state: TableAssistantSnapshot,
  store: TableAssistantStore
): TableAssistantFields {
  return {
    messages: state.messages,
    draft: state.draft,
    setDraft: store.setDraft,
    send: store.send,
    sendClip: store.sendClip,
    stop: store.stop,
    resume: store.resume,
    interrupted: state.interrupted,
    resumable: state.resumable,
    clear: store.clear,
    status: state.status,
    busy: state.busy,
    progress: state.progress,
    answer: store.answer,
    undo: assistantUndoView(state.undo),
    undoTurn: store.undoTurn,
    undoAction: store.undoAction,
    alwaysAllowed: state.alwaysAllowed,
    revokeAlwaysAllow: store.revokeAlwaysAllow,
    suggestions: state.suggestions,
    runSuggestion: store.runSuggestion,
    error: state.error,
    errorCode: state.errorCode,
  };
}
