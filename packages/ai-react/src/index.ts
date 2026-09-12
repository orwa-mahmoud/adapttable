/**
 * `@adapttable/ai-react` — bind an AdaptTable session from a React table.
 *
 * `tableAgent` publishes the live manifest. `useTableAssistant` subscribes to
 * the neutral controller at `@adapttable/ai/assistant` and supplies React's
 * external-store mechanism, its live inputs and its controlled presentation
 * state. `@adapttable/ai` stays React-free.
 *
 * @packageDocumentation
 */
export {
  type AssistantMessage,
  type AssistantStatus,
  type TableAssistantOptions,
  type TableAssistantState,
  useTableAssistant,
} from "./assistant";
export type {
  SharedApproval,
  TableAgentBridge,
  TableAgentColumnPatch,
  TableAgentOptions,
} from "./react";
export { TABLE_AGENT_STATE, tableAgent } from "./react";
export type {
  AssistantAnswer,
  AssistantQuestion,
  AssistantSuggestion,
  TableAssistantSnapshot,
  TableAssistantStore,
} from "@adapttable/ai";
