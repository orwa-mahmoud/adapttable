import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { h, type StyleValue, type VNodeChild } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtCard from "../controls/NuxtCard.vue";
import NuxtSelect from "../controls/NuxtSelect.vue";
import { NuxtExamplesMenu } from "./ExamplesMenu";
import NuxtAssistantComposer from "./NuxtAssistantComposer.vue";
import { NuxtAssistantSheet } from "./Sheet";

/** Nuxt UI badge colors for the assistant's status tones. */
const BADGE_COLOR = {
  neutral: "neutral",
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
    NuxtCard,
    {
      attrs: {
        role: "region",
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: classes,
        style: props.style,
      },
    },
    () => props.children
  );

export const nuxtAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    h(
      NuxtButton,
      {
        attrs: {
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          "aria-expanded": props.expanded,
          title: props.tooltip,
          class: props.className,
          disabled: props.disabled,
          onClick: props.onClick,
        },
      },
      () => [
        props.icon,
        props.iconOnly && props.icon ? null : (props.children ?? props.label),
      ]
    ),
  Composer: (control) => h(NuxtAssistantComposer, { control }),
  Badge: (props) =>
    h(
      UBadge,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        color: BADGE_COLOR[props.tone],
        variant: "subtle",
        class: props.className,
      },
      () => props.label
    ),
  Panel: (props) =>
    surface(props, ["adapttable-nuxt-assistant-panel", props.className]),
  Window: (props) =>
    surface(props, ["adapttable-nuxt-assistant-window", props.className]),
  Sheet: (props) => h(NuxtAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(NuxtExamplesMenu, props),
  LanguageChip: (props) =>
    h(NuxtSelect, {
      control: {
        label: props.label,
        attrs: {
          "data-adapttable-part": props.part,
          class: props.className,
          disabled: props.disabled,
        },
        value: props.value,
        options: props.options,
        onChange: props.onChange,
      },
    }),
};

export const nuxtApprovalControls: ApprovalReviewSlots = {
  Approve: nuxtAssistantControls.Button,
  Reject: nuxtAssistantControls.Button,
  Action: nuxtAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-nuxt-approval-list", props.className],
      },
      [props.children]
    ),
};
