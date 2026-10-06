/** Optional assistant UI contracts and shared structure. Importing this installs no AI runtime. */
import {
  AGENT_APPROVAL,
  featureSlotKey,
  slotRender,
  TABLE_ASSISTANT,
} from "@adapttable/core/binding";
import type { StaticTableFeature } from "@adapttable/vue";
import type { VNodeChild } from "vue";

import type {
  AgentApprovalProps,
  TableAssistantProps,
} from "./assistant/contracts";
export * from "./assistant/approvalReviewChrome";
export * from "./assistant/contracts";
export * from "./assistant/tableAssistantChrome";
export type { StaticTableFeature } from "./features/tableFeature";

/** Required single assistant surface channel. @public */
export function tableAssistantSlotKey() {
  return featureSlotKey<TableAssistantProps>(TABLE_ASSISTANT.id, {
    single: true,
  });
}
/** Register one kit surface. Conversation state remains host-owned and AI is optional. @public */
export function createAdapterTableAssistantFeature(
  render: (props: TableAssistantProps) => VNodeChild
): StaticTableFeature {
  return {
    id: "table-assistant",
    renders: [slotRender(tableAssistantSlotKey(), render)],
  };
}
/** Register the table approval surface, which reads the same pending state as the assistant. @public */
export function createAdapterAgentApprovalFeature(
  render: (props: AgentApprovalProps) => VNodeChild
): StaticTableFeature {
  return {
    id: "agent-approval",
    renders: [slotRender(AGENT_APPROVAL, render)],
  };
}
