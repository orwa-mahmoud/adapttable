/**
 * `@adapttable/ai-react` — bind an AdaptTable session from a React table.
 *
 * `tableAgent` publishes the live manifest. `useTableAssistant` owns the
 * conversation. `@adapttable/ai` stays React-free.
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
