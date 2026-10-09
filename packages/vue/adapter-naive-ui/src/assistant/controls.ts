import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { NCard, NTag } from "naive-ui";
import { h, type StyleValue, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";
import { naiveInput } from "../controls/input";
import { naiveSelect } from "../controls/select";
import { NaiveExamplesMenu } from "./ExamplesMenu";
import { NaiveAssistantSheet } from "./Sheet";

/** Naive UI tag types for the assistant's status tones. */
const TAG_TYPE = {
  neutral: "default",
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
    NCard,
    {
      size: "small",
      role: "region",
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      class: classes,
      style: props.style,
      contentStyle: { display: "flex", flexDirection: "column", minHeight: 0 },
    },
    { default: () => props.children }
  );

export const naiveAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    naiveButton(
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        "aria-expanded": props.expanded,
        title: props.tooltip,
        class: props.className,
        disabled: props.disabled,
        onClick: props.onClick,
      },
      [
        props.icon,
        props.iconOnly && props.icon ? null : (props.children ?? props.label),
      ]
    ),
  Composer: (props) =>
    naiveInput({
      type: "textarea",
      value: props.value,
      attrs: {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        placeholder: props.placeholder,
        class: props.className,
        disabled: props.disabled,
        rows: 2,
        onKeydown: props.onKeyDown,
      },
      onChange: props.onChange,
    }),
  Badge: (props) =>
    h(
      NTag,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        type: TAG_TYPE[props.tone],
        size: "small",
        bordered: false,
        class: props.className,
      },
      { default: () => props.label }
    ),
  Panel: (props) =>
    surface(props, ["adapttable-naive-assistant-panel", props.className]),
  Window: (props) =>
    surface(props, ["adapttable-naive-assistant-window", props.className]),
  Sheet: (props) => h(NaiveAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(NaiveExamplesMenu, props),
  LanguageChip: (props) =>
    naiveSelect({
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

export const naiveApprovalControls: ApprovalReviewSlots = {
  Approve: naiveAssistantControls.Button,
  Reject: naiveAssistantControls.Button,
  Action: naiveAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-naive-approval-list", props.className],
      },
      [props.children]
    ),
};
