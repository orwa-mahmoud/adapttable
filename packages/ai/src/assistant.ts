/**
 * Optional conversation controller — `@adapttable/ai/assistant`.
 *
 * A subpath because it is optional: a host that drives `session.execute` from
 * its own agent never loads any of this, and importing the session does not
 * pull a conversation state machine into the bundle.
 *
 * This is NOT `useTableAssistant`. That hook stays at `@adapttable/ai-react`
 * and is now a subscriber to this store — the same lifecycle, with React's
 * external-store mechanism in front of it. A framework without a binding of
 * its own drives this directly.
 *
 * @packageDocumentation
 */
export {
  type AssistantMessage,
  type AssistantStatus,
  createTableAssistant,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
  type TableAssistantStore,
} from "./assistantStore";
export type {
  AssistantAnswer,
  AssistantExchange,
  AssistantQuestion,
  AssistantQuestionOption,
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
export type {
  AssistantReceipt,
  AssistantReceiptStatus,
  AssistantReceiptSubject,
  AssistantTurnStatus,
} from "./assistantReceipts";
