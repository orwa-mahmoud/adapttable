/**
 * `@adapttable/ai` — provider-neutral capability discovery for a live table.
 *
 * The root entry imports no React and no model SDK. Compose
 * `tableAgent` from `@adapttable/ai-react` when a table should publish
 * a manifest. `@adapttable/core`, every adapter root, and
 * `@adapttable/server` stay out of this graph.
 *
 * @packageDocumentation
 */
export {
  type AggregationInputs,
  type AggregationState,
  aggregationsFor,
  applyAggregations,
} from "./aggregationCommands";
export {
  type ResolvedApproval,
  type SharedApproval,
  sharedApproval,
} from "./approvalConfig";
export {
  type ApprovalTransaction,
  closeTransaction,
  createApprovalMemory,
  openTransaction,
  type PendingApproval,
  recordDecision,
  settleDecisions,
} from "./approvalTransaction";
export {
  type BindingOperations,
  type BindingQuery,
  type BindingSnapshot,
  contractFingerprint,
  displayProposals,
  type ProposalResolver,
  type TableAgentBridge,
} from "./binding";
export {
  assertUniqueSuggestions,
  type AssistantAction,
  type AssistantConversation,
  type AssistantExchange,
  type AssistantOutcome,
  type AssistantOutcomeStatus,
  type AssistantAnswer,
  type AssistantPlanner,
  type AssistantProposal,
  type AssistantQuestion,
  type AssistantQuestionOption,
  type AssistantRequest,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurn,
  type AssistantUnresolved,
  type CapabilityPresentation,
  eligibleSuggestions,
} from "./assistantContracts";
export {
  type AssistantMessage,
  type AssistantStatus,
  createTableAssistant,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
  type TableAssistantStore,
} from "./assistantStore";
export {
  type AssistantReceipt,
  type AssistantReceiptStatus,
  type AssistantReceiptSubject,
  type AssistantTurnStatus,
  receiptFromResult,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
export { openAiToolNameMap } from "./capabilities/registry";
export {
  agentFiltersFromDefs,
  type FilterCatalogColumnPatch,
} from "./filterCatalog";
export { guideOf, summaryOf } from "./guides";
export {
  AGENT_SCHEMA_VERSION,
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export {
  agentColumnsFromNeutral,
  type LiveObservationOptions,
  monotonicRevision,
  type NeutralQueryOverlay,
  observationFromNeutral,
  readRowsFromNeutral,
  resolveRowFromNeutral,
  revisionToken,
  type TableAgentColumnPatch,
} from "./liveTable";
export { buildManifest, enabledKeys } from "./manifest";
export { createAgentSession, type CreateAgentSessionOptions } from "./session";
export type {
  AgentAggregateOperation,
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCellEdit,
  AgentColumn,
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
  RowReadQuery,
  RowRef,
  RowWindow,
  RowWindowRow,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";
export { validateSchema } from "./validate";
