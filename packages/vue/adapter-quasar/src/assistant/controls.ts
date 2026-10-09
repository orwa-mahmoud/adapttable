import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { QBadge, QCard } from "quasar";
import { h, type StyleValue, type VNodeChild } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";
import { QuasarExamplesMenu } from "./ExamplesMenu";
import { QuasarAssistantSheet } from "./Sheet";

/** Quasar brand colors for the assistant's status tones. */
const BADGE_COLOR = {
  neutral: "grey-7",
  busy: "info",
  warning: "warning",
  danger: "negative",
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
    QCard,
    {
      role: "region",
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      class: classes,
      style: props.style,
    },
    () => props.children
  );

export const quasarAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    h(
      QuasarButton,
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
  Composer: (props) =>
    h(QuasarInput, {
      control: {
        type: "textarea",
        label: props.label,
        value: props.value,
        attrs: {
          "data-adapttable-part": props.part,
          placeholder: props.placeholder,
          disabled: props.disabled,
          rows: 2,
          onKeydown: props.onKeyDown,
        },
        onChange: props.onChange,
      },
      className: ["adapttable-quasar-assistant-input", props.className]
        .filter(Boolean)
        .join(" "),
    }),
  Badge: (props) =>
    h(
      QBadge,
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        color: BADGE_COLOR[props.tone],
        class: props.className,
      },
      () => props.label
    ),
  Panel: (props) =>
    surface(props, ["adapttable-quasar-assistant-panel", props.className]),
  Window: (props) =>
    surface(props, ["adapttable-quasar-assistant-window", props.className]),
  Sheet: (props) => h(QuasarAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(QuasarExamplesMenu, props),
  LanguageChip: (props) =>
    h(QuasarSelect, {
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

export const quasarApprovalControls: ApprovalReviewSlots = {
  Approve: quasarAssistantControls.Button,
  Reject: quasarAssistantControls.Button,
  Action: quasarAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["adapttable-quasar-approval-list", props.className],
      },
      [props.children]
    ),
};
