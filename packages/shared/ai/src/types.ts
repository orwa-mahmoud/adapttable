/**
 * The agent contract's types. Each group lives in its own module; this entry
 * is the one place the package and every subpath re-export them from.
 */
// `AgentCapabilityDefinition` names these, and every subpath re-exports this
// module, so they travel with it rather than being reachable only from the
// root entry.
export type {
  AssistantSuggestion,
  CapabilityPresentation,
} from "./assistantContracts";
export type { AgentPagination, PaginationInput } from "./pagination";
export type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCapabilityKind,
  CapabilityFamily,
  CapabilityGuide,
  CapabilityPartial,
  CapabilityPlan,
  CapabilityProgress,
  CapabilityStaging,
  CatalogEntry,
} from "./typesCapability";
export type {
  AgentCellEdit,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  ExecuteError,
  ExecuteResult,
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
} from "./typesExecute";
export type {
  AgentAggregateOperation,
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
  AgentColumn,
  AgentColumnAuthoring,
  AgentFilter,
  AgentFilterOption,
  AgentLimits,
  AgentManifest,
  AgentManifestAggregation,
  AgentPolicy,
  AgentRowAddressing,
  JsonSchema,
  RowProvenanceEnvelope,
} from "./typesManifest";
export type { AgentApply, AgentObservation, AgentSession } from "./typesTable";

// What a capability reports plus the identity of the call that reported it,
// which is what a surface needs and what a capability should not have to
// repeat. The shape is `@adapttable/core`'s, because a panel drawing it must
// not import an AI runtime to name what it draws.
export type { AgentProgress } from "@adapttable/core";
