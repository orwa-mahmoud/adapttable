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
  aggregationsFor,
  type AggregationState,
  applyAggregations,
} from "./aggregationCommands";
export {
  resolveApproval,
  type ResolvedApproval,
  type SharedApproval,
  sharedApproval,
} from "./approvalConfig";
export {
  type AlwaysAllowInput,
  ApprovalAlwaysAllowError,
  type ApprovalMemory,
  type ApprovalTransaction,
  assertAlwaysAllow,
  closeTransaction,
  createApprovalMemory,
  mayAlwaysAllow,
  openTransaction,
  type PendingApproval,
  recordDecision,
  settleDecisions,
} from "./approvalTransaction";
export {
  assertUniqueSuggestions,
  type AssistantAction,
  type AssistantAnswer,
  type AssistantConversation,
  type AssistantExchange,
  type AssistantOutcome,
  type AssistantOutcomeStatus,
  type AssistantPlanner,
  type AssistantProposal,
  type AssistantQuestion,
  type AssistantQuestionOption,
  type AssistantRequest,
  type AssistantResumeHandle,
  type AssistantResumeInput,
  type AssistantSendInput,
  type AssistantSuggestion,
  type AssistantTransport,
  type AssistantTransportReply,
  type AssistantTurn,
  type AssistantTurnInput,
  type AssistantUnresolved,
  type CapabilityPresentation,
  eligibleSuggestions,
} from "./assistantContracts";
export {
  type AssistantReceipt,
  type AssistantReceiptStatus,
  type AssistantReceiptSubject,
  type AssistantReceiptTerm,
  type AssistantTurnStatus,
  receiptFromResult,
  receiptsFromResults,
  turnStatus,
} from "./assistantReceipts";
export {
  type AssistantAllowance,
  type AssistantInterruption,
  type AssistantMessage,
  type AssistantStatus,
  type AssistantUndoOffer,
  createTableAssistant,
  type TableAssistantInputs,
  type TableAssistantSnapshot,
  type TableAssistantStore,
} from "./assistantStore";
export { subjectFor } from "./assistantSubjects";
export {
  type AssistantUndo,
  isUndoBlock,
  planUndo,
  runUndo,
  type UndoBlock,
  undoBlocked,
  type UndoCall,
} from "./assistantUndo";
export {
  type AlwaysAllowedState,
  contractFingerprint,
  displayProposals,
  type ProposalResolver,
  type TableAgentBridge,
} from "./binding";
export { openAiToolNameMap } from "./capabilities/registry";
export {
  type AgentContext,
  type AgentContextContract,
  type AgentContextInputs,
  type AgentContextOptions,
  type AgentContextProfile,
  type AgentContextSelection,
  type AgentContextView,
  buildAgentContext,
  ContextBudgetError,
  type ContextCapability,
  type ContextColumn,
  ContextIncludeError,
  contractVersion,
  DEFAULT_COMPACT_TOKENS,
  rowProvenance,
} from "./context";
export {
  discover,
  type DiscoveryRequest,
  type DiscoveryResult,
  type DiscoverySource,
  familyOf,
  MAX_FAMILY_GUIDES,
} from "./discovery";
export {
  createDiscoveryCache,
  DEFAULT_CACHE_GUIDES,
  DEFAULT_CACHE_VERSIONS,
  type DiscoveryCache,
} from "./discoveryCache";
export {
  agentFiltersFromDefs,
  type FilterCatalogColumnPatch,
} from "./filterCatalog";
export { guideOf, summaryOf } from "./guides";
export {
  AgentStreamError,
  type AgentStreamEvent,
  type AgentStreamEventKind,
  createStreamReply,
  MAX_STREAM_EVENTS,
  parseStreamRecord,
  splitRecords,
} from "./httpStream";
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
export {
  agentObservation,
  type ObservationInputs,
  type ObservedPolicy,
  type ObservedView,
  type RuntimeOperations,
} from "./observation";
export {
  type AgentPagination,
  agentPagination,
  pageRefusal,
  pageSizeRefusal,
  type PaginationInput,
} from "./pagination";
export { createAgentSession, type CreateAgentSessionOptions } from "./session";
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
export { validateSchema } from "./validate";
export {
  createSpeechInput,
  readRememberedLanguage,
  rememberLanguage,
  type SpeechClip,
  type SpeechInput,
  type SpeechInputOptions,
  type SpeechMode,
  type SpeechState,
  type SpeechStatus,
  type VoiceOptions,
} from "./voice";
export {
  type ModelContextLike,
  registerWebMcpTools,
  type WebMcpAnnotations,
  type WebMcpContent,
  type WebMcpOptions,
  type WebMcpRegistration,
  type WebMcpResult,
  type WebMcpTool,
} from "./webmcp";
// Named by signatures this entry already exports: a selection says why a guide
// was deferred, and the HTTP helpers return the reply shape.
export type { DeferralKind, DeferralReason } from "./contextSelection";
export type {
  AgentHttpPinAck,
  AgentHttpResponse,
  AgentHttpToolCall,
  PinStatus,
} from "./http";
