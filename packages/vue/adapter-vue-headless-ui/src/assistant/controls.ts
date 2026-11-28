import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton } from "../controls/basic";
import { HeadlessPrimitive } from "../controls/primitive";
import { headlessSelect } from "../controls/select";
import { HeadlessExamplesMenu } from "./ExamplesMenu";
import { HeadlessAssistantSheet } from "./Sheet";

export const headlessAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    headlessButton(
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
    h(HeadlessPrimitive, {
      as: "textarea",
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: [
        "at-headless-input",
        "at-headless-assistant-input",
        props.className,
      ],
      value: props.value,
      disabled: props.disabled,
      rows: 1,
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
        class: ["at-headless-assistant-badge", props.className],
      },
      props.label
    ),
  Panel: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: [
          "at-headless-surface",
          "at-headless-assistant-panel",
          props.className,
        ],
      },
      [props.children]
    ),
  Window: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: [
          "at-headless-surface",
          "at-headless-assistant-window",
          props.className,
        ],
        style: props.style,
      },
      [props.children]
    ),
  Sheet: (props) => h(HeadlessAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(HeadlessExamplesMenu, props),
  LanguageChip: (props) =>
    headlessSelect({
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
export const headlessApprovalControls: ApprovalReviewSlots = {
  Approve: headlessAssistantControls.Button,
  Reject: headlessAssistantControls.Button,
  Action: headlessAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["at-headless-approval-list", props.className],
      },
      [props.children]
    ),
};
