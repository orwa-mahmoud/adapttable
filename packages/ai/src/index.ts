/**
 * `@adapttable/ai` — provider-neutral capability discovery for a live table.
 *
 * The root entry imports no React and no model SDK. Compose
 * `tableAgent` from `@adapttable/ai/react` when a table should publish
 * a manifest. `@adapttable/core`, every adapter root, and
 * `@adapttable/server` stay out of this graph.
 *
 * @packageDocumentation
 */
export {
  assertUniqueSuggestions,
  type AssistantAction,
  type AssistantConversation,
  type AssistantExchange,
  type AssistantOutcome,
  type AssistantOutcomeStatus,
  type AssistantPlanner,
  type AssistantProposal,
  type AssistantRequest,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurn,
  type CapabilityPresentation,
  eligibleSuggestions,
} from "./assistantContracts";
export {
  type AssistantReceipt,
  type AssistantReceiptStatus,
  type AssistantTurnStatus,
  receiptFromResult,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
export { openAiToolNameMap } from "./capabilities/registry";
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
export { buildManifest, enabledKeys } from "./manifest";
export { createAgentSession, type CreateAgentSessionOptions } from "./session";
export type {
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCellEdit,
  AgentColumn,
  AgentLimits,
  AgentManifest,
  AgentObservation,
  AgentPolicy,
  AgentRowAddressing,
  AgentSession,
  ApprovalOutcome,
  CapabilityGuide,
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
  TableAgentBridge,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";
export { validateSchema } from "./validate";
