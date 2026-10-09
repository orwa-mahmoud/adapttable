/** Optional assistant presentation; all conversation and approval state stays in the binding. */
import "./assistant/assistant.css";

import type { StaticTableFeature } from "@adapttable/vue";
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
  quasarApprovalControls,
  quasarAssistantControls,
} from "./assistant/controls";

export const TableAssistant = defineComponent(
  (props: TableAssistantProps) => () =>
    h(TableAssistantChrome, { ...props, slots: quasarAssistantControls }),
  {
    name: "QuasarTableAssistant",
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
export const AgentApproval = defineComponent(
  (props: AgentApprovalProps) => () =>
    h(AgentApprovalChrome, { ...props, slots: quasarApprovalControls }),
  {
    name: "QuasarAgentApproval",
    props: ["pending", "labels", "className", "buttonClassName"],
  }
);
export function tableAssistant(): StaticTableFeature {
  return createAdapterTableAssistantFeature((props) =>
    h(TableAssistant, props)
  );
}
export function agentApproval(): StaticTableFeature {
  return createAdapterAgentApprovalFeature((props) => h(AgentApproval, props));
}
export type {
  AgentApprovalProps,
  TableAssistantProps,
} from "@adapttable/vue/adapter";
