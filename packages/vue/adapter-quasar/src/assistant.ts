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
import { defineComponent, h, type PropType } from "vue";

import {
  quasarApprovalControls,
  quasarAssistantControls,
} from "./assistant/controls";

export const TableAssistant = defineComponent(
  (props: TableAssistantProps) => () =>
    h(TableAssistantChrome, { ...props, slots: quasarAssistantControls }),
  {
    name: "QuasarTableAssistant",
    props: {
      assistant: { type: Object as PropType<TableAssistantProps["assistant"]> },
      speech: { type: Object as PropType<TableAssistantProps["speech"]> },
      open: {
        type: Boolean as PropType<TableAssistantProps["open"]>,
        default: undefined,
      },
      onOpenChange: {
        type: Function as PropType<TableAssistantProps["onOpenChange"]>,
      },
      presentation: {
        type: String as PropType<TableAssistantProps["presentation"]>,
      },
      labels: { type: Object as PropType<TableAssistantProps["labels"]> },
      accent: { type: String as PropType<TableAssistantProps["accent"]> },
      receipts: {
        type: Boolean as PropType<TableAssistantProps["receipts"]>,
        default: undefined,
      },
      className: { type: String as PropType<TableAssistantProps["className"]> },
      launcher: {
        type: Boolean as PropType<TableAssistantProps["launcher"]>,
        default: undefined,
      },
      onSettings: {
        type: Function as PropType<TableAssistantProps["onSettings"]>,
      },
      boundary: {
        type: [String, Object] as PropType<TableAssistantProps["boundary"]>,
      },
      note: { type: String as PropType<TableAssistantProps["note"]> },
      greeting: { type: String as PropType<TableAssistantProps["greeting"]> },
      avatars: { type: Object as PropType<TableAssistantProps["avatars"]> },
      messageAction: {
        type: Function as PropType<TableAssistantProps["messageAction"]>,
      },
      approval: { type: Object as PropType<TableAssistantProps["approval"]> },
      dir: { type: String as PropType<TableAssistantProps["dir"]> },
    },
  }
);
export const AgentApproval = defineComponent(
  (props: AgentApprovalProps) => () =>
    h(AgentApprovalChrome, { ...props, slots: quasarApprovalControls }),
  {
    name: "QuasarAgentApproval",
    props: {
      pending: { type: Object as PropType<AgentApprovalProps["pending"]> },
      labels: { type: Object as PropType<AgentApprovalProps["labels"]> },
      className: { type: String as PropType<AgentApprovalProps["className"]> },
      buttonClassName: {
        type: String as PropType<AgentApprovalProps["buttonClassName"]>,
      },
    },
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
