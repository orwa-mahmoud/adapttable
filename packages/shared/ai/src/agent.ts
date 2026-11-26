/**
 * The table agent controller — `@adapttable/ai/agent`.
 *
 * What a framework binding drives a table's agent with, on an entry of its
 * own: the main entry also offers `registerWebMcpTools`, and a bundle that
 * reaches the controller through it keeps the WebMCP registrar in its first
 * load. From here the registrar loads only when a table sets `webmcp`.
 */
export { TABLE_AGENT_STATE } from "./agentStateKey";
export type { SharedApproval } from "./approvalConfig";
export type { CapabilityPresentation } from "./assistantContracts";
export type { AssistantSuggestion } from "./assistantContracts";
export type { AlwaysAllowedState, TableAgentBridge } from "./binding";
export type { AgentContextInputs } from "./context";
export type { CommitPolicy } from "./keys";
export type { WritePolicy } from "./keys";
export type { ApprovalPolicy } from "./keys";
export type { RowAddressScope } from "./keys";
export type { CapabilityKey } from "./keys";
export type { CAPABILITY_KEYS } from "./keys";
export type { TableAgentColumnPatch } from "./liveTable";
export type { AgentPagination } from "./pagination";
export {
  createTableAgentController,
  type TableAgentController,
  type TableAgentControllerInputs,
  type TableAgentControllerOptions,
  type TableAgentState,
  type TableAgentViewReader,
  type TableAgentWebMcpOptions,
} from "./tableAgentController";
export type { TableAgentRuntimeOptions } from "./tableAgentRuntime";
export type { AgentSession } from "./types";
export type { AgentAggregations } from "./types";
export type { AgentApply } from "./types";
export type { AgentCapabilityDefinition } from "./types";
export type { AgentFilter } from "./types";
export type { AgentManifest } from "./types";
export type { AgentObservation } from "./types";
export type { ApprovalResult } from "./types";
export type { ApprovalSubject } from "./types";
export type { CapabilityGuide } from "./types";
export type { CatalogEntry } from "./types";
export type { ExecuteResult } from "./types";
export type { AgentAggregationColumn } from "./types";
export type { AgentAggregationsPatch } from "./types";
export type { AgentCapabilityContext } from "./types";
export type { AgentCapabilityKind } from "./types";
export type { AgentCellEdit } from "./types";
export type { AgentColumn } from "./types";
export type { AgentFilterOption } from "./types";
export type { AgentLimits } from "./types";
export type { AgentManifestAggregation } from "./types";
export type { AgentPolicy } from "./types";
export type { AgentRowAddressing } from "./types";
export type { CapabilityFamily } from "./types";
export type { CapabilityPartial } from "./types";
export type { CapabilityPlan } from "./types";
export type { CapabilityStaging } from "./types";
export type { ExecuteError } from "./types";
export type { JsonSchema } from "./types";
export type { ResolvedRow } from "./types";
export type { RowReadQuery } from "./types";
export type { RowRef } from "./types";
export type { RowWindow } from "./types";
export type { WriteProposal } from "./types";
export type { AgentAggregateOperation } from "./types";
export type { AgentColumnAuthoring } from "./types";
export type { CapabilityProgress } from "./types";
export type { RowKeyRef } from "./types";
export type { RowPositionRef } from "./types";
export type { RowWindowRow } from "./types";
