import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { Tag } from "ant-design-vue";
import { h } from "vue";

import AntdInput from "../controls/AntdInput.vue";
import AntdSelect from "../controls/AntdSelect.vue";
import { antdButton } from "../controls/button";
import { AntdCard } from "../presentation/AntdCard";
import { AntdExamplesMenu } from "./ExamplesMenu";
import { AntdAssistantSheet } from "./Sheet";

/** Ant Design Vue tag colors for the assistant's status tones. */
const TAG_COLOR = {
  neutral: "default",
  busy: "processing",
  warning: "warning",
  danger: "error",
} as const;

export const antdAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    antdButton(
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
    h(AntdInput, {
      type: "textarea",
      rows: 1,
      value: props.value,
      disabled: props.disabled,
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: ["adapttable-ant-design-vue-assistant-input", props.className],
      onChange: props.onChange,
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      Tag,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        color: TAG_COLOR[props.tone],
        class: props.className,
      },
      { default: () => props.label }
    ),
  Panel: (props) =>
    h(
      AntdCard,
      {
        attrs: {
          role: "region",
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: ["adapttable-ant-design-vue-assistant-panel", props.className],
        },
      },
      { default: () => props.children }
    ),
  Window: (props) =>
    h(
      AntdCard,
      {
        attrs: {
          role: "region",
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: [
            "adapttable-ant-design-vue-assistant-window",
            props.className,
          ],
          style: props.style,
        },
      },
      { default: () => props.children }
    ),
  Sheet: (props) => h(AntdAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(AntdExamplesMenu, props),
  LanguageChip: (props) =>
    h(AntdSelect, {
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      class: props.className,
      disabled: props.disabled,
      value: props.value,
      options: props.options,
      onChange: props.onChange,
    }),
};

export const antdApprovalControls: ApprovalReviewSlots = {
  Approve: antdAssistantControls.Button,
  Reject: antdAssistantControls.Button,
  Action: antdAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-ant-design-vue-approval-list", props.className],
      },
      [props.children]
    ),
};
