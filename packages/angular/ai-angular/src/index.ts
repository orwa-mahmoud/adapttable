/**
 * Angular lifecycle and signals for the neutral AdaptTable AI controllers.
 * @packageDocumentation
 */
export {
  type AssistantMessage,
  type AssistantStatus,
  injectTableAssistant,
  type TableAssistantOptions,
  type TableAssistantState,
} from "./assistant";
export { injectSpeechInput, type SpeechInputOptions } from "./speechInput";
export {
  type SharedApproval,
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentBridge,
  type TableAgentColumnPatch,
  type TableAgentOptions,
} from "./tableAgent";
export type {
  ApprovalPolicy,
  AssistantAnswer,
  AssistantExchange,
  AssistantInterruption,
  AssistantQuestion,
  AssistantReceipt,
  AssistantReceiptStatus,
  AssistantReceiptSubject,
  AssistantResumeHandle,
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnStatus,
  AssistantUndoOffer,
  CommitPolicy,
  RowAddressScope,
  TableAssistantSnapshot,
  TableAssistantStore,
  WritePolicy,
} from "@adapttable/ai";
export type { SpeechClip, VoiceOptions } from "@adapttable/ai/voice";
