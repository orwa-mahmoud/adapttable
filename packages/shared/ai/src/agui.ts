/**
 * The table as an AG-UI frontend tool host — `@adapttable/ai/ag-ui`.
 *
 * AG-UI is what a running agent and a user interface say to each other while
 * a run is in flight. Speaking it as a *frontend tool host* means three
 * things: the table offers its enabled contract as the run's tools, it
 * publishes its own sanitized view state, and every call the backend makes
 * comes back through `session.execute` — the same executor, the same
 * exclusion predicate, the same approval policy and the same receipts the
 * HTTP path uses. There is no second dispatcher here.
 *
 * No SDK is imported. The event types below are this package's own, and the
 * one seam a host fills is {@link AgUiConnection}: hand it a run input, get
 * events back. A CopilotKit, Mastra, LangGraph or Microsoft Agent Framework
 * backend is reached through that seam, and is described as supported only
 * once its recorded-event conformance fixture runs green against this
 * adapter.
 *
 * ## The mapping, field by field
 *
 * Nothing is assumed from the two protocols merely both having tool calls.
 *
 * **Outbound — what a run input carries**
 *
 * | AG-UI | Ours |
 * | --- | --- |
 * | `tools[].name` | `adapttable.<tableId>.<capability key>` |
 * | `tools[].description` | the capability's `summaryShort` |
 * | `tools[].parameters` | `session.describe(key).input` |
 * | `state` (`STATE_SNAPSHOT`) | `buildAgentContext(...).view` |
 * | `stateDelta` (`STATE_DELTA`) | RFC 6902 patch between two of those views |
 * | `messages` (`MESSAGES_SNAPSHOT`) | the conversation, plus this turn's text |
 * | `resume[]` | what the reader decided about the last interrupt |
 *
 * **Inbound — what an event does**
 *
 * | AG-UI | Ours |
 * | --- | --- |
 * | `TEXT_MESSAGE_CONTENT.delta` | appended, reported through `onPartialText` |
 * | `TOOL_CALL_START.toolCallName` | a capability key, when the name is ours |
 * | `TOOL_CALL_ARGS.delta` | accumulated JSON text for that `toolCallId` |
 * | `TOOL_CALL_END` | `session.execute`, answered with `TOOL_CALL_RESULT` |
 * | `TOOL_CALL_RESULT` | recorded as a tool message for the next run |
 * | `RUN_FINISHED.outcome.interrupt` `"confirmation"` | an {@link ApprovalSubject} |
 * | `RUN_FINISHED.outcome.interrupt` `"input_required"` | an `askUser` question |
 * | `RUN_ERROR` | the turn fails with that message |
 *
 * Two rules are worth stating rather than inferring:
 *
 * - **A tool call we do not own is not ours to answer.** Only names in our
 *   namespace execute; anything else is the host's own frontend tool, and the
 *   adapter leaves it for whoever registered it.
 * - **The replay identity is the run's `toolCallId`**, not a counter. A
 *   resumed run that re-emits a call it already made gets the first result
 *   back rather than writing a second time, which is exactly what an
 *   interrupt-and-resume protocol needs.
 *
 * @packageDocumentation
 */

export {
  AgUiProtocolError,
  aguiToolName,
  aguiTools,
  statePatch,
} from "./aguiProtocol";
export { aguiTransport } from "./aguiTransport";
export type {
  AgUiConnection,
  AgUiEvent,
  AgUiInterrupt,
  AgUiMessage,
  AgUiOptions,
  AgUiResume,
  AgUiResumeStatus,
  AgUiRunInput,
  AgUiRunOutcome,
  AgUiTool,
  JsonPatchOperation,
} from "./aguiTypes";

// A transport is handed a session and answers from its catalog, so the entry
// names the session, the context it sends, the approval it raises and the
// conversation shapes it speaks. A host writing its own connection needs
// every one of them to type its side.
export type {
  AssistantAnswer,
  AssistantAudio,
  AssistantExchange,
  AssistantQuestion,
  AssistantQuestionOption,
  AssistantResumeHandle,
  AssistantResumeInput,
  AssistantSendInput,
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnInput,
  AssistantUnresolved,
  CapabilityPresentation,
} from "./assistantContracts";
export type {
  AssistantReceiptSubject,
  AssistantReceiptTerm,
} from "./assistantReceipts";
export type {
  AgentContextInputs,
  AgentContextOptions,
  AgentContextView,
} from "./context";
export type { AgentContextProfile } from "./contextSelection";
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
  AgentManifestAggregation,
  AgentObservation,
  AgentPagination,
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
  CapabilityProgress,
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
