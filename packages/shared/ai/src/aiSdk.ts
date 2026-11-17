/**
 * The table as AI SDK client tools — `@adapttable/ai/ai-sdk`.
 *
 * A team on the AI SDK already has a `streamText` route and a page reading its
 * UI message stream. This is what lets the table join that, with the route and
 * the provider they already chose: the enabled contract is declared in the
 * route's `tools` map **without an `execute`**, which is how the SDK says "the
 * client runs this one", and the parts that come back land in
 * `session.execute` here.
 *
 * No `ai` dependency is added. The part types below are this package's own,
 * pinned to the AI SDK 7 UI message stream.
 *
 * ## The mapping, part by part
 *
 * Nothing is inferred from both sides having tool calls.
 *
 * **Inbound — what a stream part does**
 *
 * | AI SDK part | Ours |
 * | --- | --- |
 * | `start` | begins a turn; its `messageId` labels the reply |
 * | `text-delta` (`delta`) | appended, reported through `onPartialText` |
 * | `tool-input-available` | `session.execute`, when `toolName` is ours |
 * | `tool-output-available` | the backend's own tool; recorded, never answered |
 * | `tool-approval-request` | an {@link ApprovalSubject} for the transaction |
 * | `data-*` | handed to the host; this adapter reads none of it |
 * | `error` | the turn fails with that message |
 * | `finish` | the turn settles |
 *
 * **Outbound — what the next request carries**
 *
 * | AI SDK | Ours |
 * | --- | --- |
 * | `tools[name]` (no `execute`) | `adapttable_<tableId>_<key>` |
 * | `inputSchema` | `session.describe(key).input` |
 * | tool output part | `{ toolCallId, output }`, as `addToolOutput` sends |
 * | approval response | `{ approvalId, approved, reason? }` |
 * | `data-adapttable-view` | the sanitized view, so "reverse that sort" has one |
 *
 * Three things are deliberate:
 *
 * - **A tool name is a name, not a path.** The SDK's tool keys are object
 *   keys and travel through provider schemas that are strict about what a
 *   function name may contain, so ours are underscore-separated rather than
 *   dotted. {@link aiSdkCapability} is the way back.
 * - **Replay identity includes the transport, turn, request and stream step.**
 *   Repeating a call within that step returns its first result. A provider's
 *   correlation id can be reused in a later step without reusing that result.
 * - **An unknown stream version is refused.** A parser that guesses at a
 *   shape it does not know is how a silent misreading of somebody's data
 *   starts. Drift is expected; guessing is not.
 *
 * @packageDocumentation
 */

export {
  aiSdkCapability,
  AiSdkProtocolError,
  aiSdkToolName,
  aiSdkTools,
  assertAiSdkVersion,
} from "./aiSdkProtocol";
export { aiSdkTransport } from "./aiSdkTransport";
export type {
  AiSdkApprovalResponse,
  AiSdkConnection,
  AiSdkOptions,
  AiSdkPart,
  AiSdkRequest,
  AiSdkTool,
  AiSdkToolOutput,
} from "./aiSdkTypes";
export { AI_SDK_STREAM_VERSION } from "./aiSdkTypes";

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
