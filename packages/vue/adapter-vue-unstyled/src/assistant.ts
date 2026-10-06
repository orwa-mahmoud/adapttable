/** Optional native assistant and approval surfaces; no AI runtime is imported. */
import { type StaticTableFeature } from "@adapttable/vue";
import {
  AgentApprovalChrome,
  type AgentApprovalProps,
  createAdapterAgentApprovalFeature,
  createAdapterTableAssistantFeature,
  TableAssistantChrome,
  type TableAssistantProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import {
  nativeApprovalSlots,
  nativeAssistantSlots,
} from "./assistant/nativeSlots";
export type {
  AgentApprovalProps,
  TableAssistantProps,
} from "@adapttable/vue/adapter";
/** @public */
export const TableAssistant = defineComponent(
  (props: TableAssistantProps) => () =>
    h(TableAssistantChrome, { ...props, slots: nativeAssistantSlots }),
  {
    name: "TableAssistant",
    props: [
      "assistant",
      "speech",
      "open",
      "onOpenChange",
      "presentation",
      "labels",
      "accent",
      "receipts",
      "className",
      "launcher",
      "onSettings",
      "boundary",
      "note",
      "greeting",
      "avatars",
      "messageAction",
      "approval",
      "dir",
    ],
  }
);
/** @public */
export const AgentApproval = defineComponent(
  (props: AgentApprovalProps) => () =>
    h(AgentApprovalChrome, { ...props, slots: nativeApprovalSlots }),
  {
    name: "AgentApproval",
    props: ["pending", "labels", "className", "buttonClassName"],
  }
);
/** @public */
export function tableAssistant(): StaticTableFeature {
  return createAdapterTableAssistantFeature((props) =>
    h(TableAssistant, props)
  );
}
/** @public */
export function agentApproval(): StaticTableFeature {
  return createAdapterAgentApprovalFeature((props) => h(AgentApproval, props));
}
