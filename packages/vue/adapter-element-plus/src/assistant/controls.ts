import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { ElTag } from "element-plus";
import { h } from "vue";

import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";
import ElementSelect from "../controls/ElementSelect.vue";
import { ElementCard } from "../presentation/ElementCard";
import { ElementExamplesMenu } from "./ExamplesMenu";
import { ElementAssistantSheet } from "./Sheet";

/** Element Plus tag types for the assistant's status tones. */
const TAG_TYPE = {
  neutral: "info",
  busy: "primary",
  warning: "warning",
  danger: "danger",
} as const;

export const elementAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    elementButton(
      {
        type: "button",
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
    h(ElementInput, {
      type: "textarea",
      rows: 2,
      value: props.value,
      disabled: props.disabled,
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: ["adapttable-element-plus-assistant-input", props.className],
      onChange: props.onChange,
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      ElTag,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        type: TAG_TYPE[props.tone],
        size: "small",
        effect: "light",
        class: props.className,
      },
      { default: () => props.label }
    ),
  Panel: (props) =>
    h(
      ElementCard,
      {
        attrs: {
          role: "region",
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: ["adapttable-element-plus-assistant-panel", props.className],
        },
      },
      { default: () => props.children }
    ),
  Window: (props) =>
    h(
      ElementCard,
      {
        attrs: {
          role: "region",
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: ["adapttable-element-plus-assistant-window", props.className],
          style: props.style,
        },
      },
      { default: () => props.children }
    ),
  Sheet: (props) => h(ElementAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(ElementExamplesMenu, props),
  LanguageChip: (props) =>
    h(ElementSelect, {
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      class: props.className,
      disabled: props.disabled,
      value: props.value,
      options: props.options,
      onChange: props.onChange,
    }),
};

export const elementApprovalControls: ApprovalReviewSlots = {
  Approve: elementAssistantControls.Button,
  Reject: elementAssistantControls.Button,
  Action: elementAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-element-plus-approval-list", props.className],
      },
      [props.children]
    ),
};
