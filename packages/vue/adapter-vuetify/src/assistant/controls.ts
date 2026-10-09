import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { h, type StyleValue, type VNodeChild } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VChip } from "vuetify/components/VChip";

import { vuetifyButton } from "../controls";
import VuetifySelect from "../controls/VuetifySelect.vue";
import { VuetifyAssistantComposer } from "./Composer";
import { VuetifyExamplesMenu } from "./ExamplesMenu";
import { VuetifyAssistantSheet } from "./Sheet";

/** Vuetify theme colors for the assistant's status tones. */
const CHIP_COLOR = {
  neutral: undefined,
  busy: "info",
  warning: "warning",
  danger: "error",
} as const;

const surface = (
  props: {
    readonly part: string;
    readonly label: string;
    readonly children: VNodeChild;
    readonly style?: StyleValue;
  },
  classes: readonly (string | undefined)[]
) =>
  h(
    VCard,
    {
      role: "region",
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      class: classes,
      style: props.style,
    },
    () => props.children
  );

export const vuetifyAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    vuetifyButton(
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        "aria-expanded": props.expanded,
        title: props.tooltip,
        class: props.className,
        disabled: props.disabled,
        onClick: props.onClick,
        size: props.part === "assistant-launcher" ? "default" : "small",
      },
      [
        props.icon,
        props.iconOnly && props.icon ? null : (props.children ?? props.label),
      ]
    ),
  Composer: (props) => h(VuetifyAssistantComposer, props),
  Badge: (props) =>
    h(
      VChip,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        color: CHIP_COLOR[props.tone],
        size: "small",
        variant: "tonal",
        class: props.className,
      },
      () => props.label
    ),
  Panel: (props) =>
    surface(props, ["adapttable-vuetify-assistant-panel", props.className]),
  Window: (props) =>
    surface(props, ["adapttable-vuetify-assistant-window", props.className]),
  Sheet: (props) => h(VuetifyAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(VuetifyExamplesMenu, props),
  LanguageChip: (props) =>
    h(VuetifySelect, {
      attrs: {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: props.className,
        disabled: props.disabled,
      },
      value: props.value,
      options: props.options,
      onChange: props.onChange,
    }),
};

export const vuetifyApprovalControls: ApprovalReviewSlots = {
  Approve: vuetifyAssistantControls.Button,
  Reject: vuetifyAssistantControls.Button,
  Action: vuetifyAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-vuetify-approval-list", props.className],
      },
      [props.children]
    ),
};
