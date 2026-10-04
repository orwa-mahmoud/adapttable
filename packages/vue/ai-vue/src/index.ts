/** Optional Vue lifecycle integration for AdaptTable AI. @packageDocumentation */
export {
  type TableAssistantOptions,
  type TableAssistantState,
  useTableAssistant,
} from "./assistant";
export {
  type SpeechInputState,
  useSpeechInput,
  type UseSpeechInputOptions,
} from "./speechInput";
export {
  type SharedApproval,
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentBridge,
  type TableAgentColumnPatch,
  type TableAgentOptions,
} from "./tableAgent";
export type * from "@adapttable/ai";
export type {
  AgentApprovalPending,
  AgentProgress,
} from "@adapttable/vue/adapter";
export type { StaticTableFeature } from "@adapttable/vue/features";
