import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { h } from "vue";

import { rekaButton } from "../controls/basic";
import { rekaSelect } from "../controls/select";
import { RekaExamplesMenu } from "./ExamplesMenu";
import { RekaAssistantSheet } from "./Sheet";

export const rekaAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    rekaButton(
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
    h(Primitive, {
      as: "textarea",
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: ["at-reka-input", "at-reka-assistant-input", props.className],
      value: props.value,
      disabled: props.disabled,
      rows: 2,
      onInput: (event: Event) => {
        const target = event.currentTarget;
        if (target instanceof HTMLTextAreaElement) {
          props.onChange(target.value);
          target.value = props.value;
        }
      },
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      "span",
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        class: ["at-reka-assistant-badge", props.className],
      },
      props.label
    ),
  Panel: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["at-reka-surface", "at-reka-assistant-panel", props.className],
      },
      [props.children]
    ),
  Window: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["at-reka-surface", "at-reka-assistant-window", props.className],
        style: props.style,
      },
      [props.children]
    ),
  Sheet: (props) => h(RekaAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(RekaExamplesMenu, props),
  LanguageChip: (props) =>
    rekaSelect({
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
export const rekaApprovalControls: ApprovalReviewSlots = {
  Approve: rekaAssistantControls.Button,
  Reject: rekaAssistantControls.Button,
  Action: rekaAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["at-reka-approval-list", props.className],
      },
      [props.children]
    ),
};
