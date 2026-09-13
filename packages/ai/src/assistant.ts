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
export {
  type AssistantMessage,
  type AssistantStatus,
  type AssistantUndoOffer,
  createTableAssistant,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
  type TableAssistantStore,
} from "./assistantStore";
export {
  type AssistantUndo,
  isUndoBlock,
  planUndo,
  runUndo,
  type UndoBlock,
  undoBlocked,
  type UndoCall,
} from "./assistantUndo";

// Named by the signatures above: a transport's reply carries an
// `ExecuteResult`, the store is built from a session and the context inputs it
// sends, and a receipt quotes the catalog. A caller that cannot name these
// cannot type a transport of its own.
export type { CapabilityPresentation } from "./assistantContracts";
export type { AgentContextInputs, AgentContextView } from "./context";
export type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
export type {
  AgentAggregateOperation,
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCapabilityKind,
  AgentCellEdit,
  AgentColumn,
  AgentColumnAuthoring,
  AgentFilter,
  AgentFilterOption,
  AgentLimits,
  AgentManifest,
  AgentObservation,
  AgentPolicy,
  AgentRowAddressing,
  AgentSession,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  CapabilityFamily,
  CapabilityGuide,
  CapabilityPartial,
  CapabilityPlan,
  CapabilityStaging,
  CatalogEntry,
  ExecuteError,
  ExecuteResult,
  JsonSchema,
  ResolvedRow,
  RowKeyRef,
  RowPositionRef,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowRef,
  RowWindow,
  RowWindowRow,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";
