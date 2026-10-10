import type {
  ApprovalReviewSlots,
  TableAssistantSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { shadcnActionButton } from "../actions/controls";
import { Textarea } from "../components/textarea";
import { shadcnSelect } from "../controls";
import { ShadcnExamplesMenu } from "./ExamplesMenu";
import { assistantClass } from "./presentation";
import { ShadcnAssistantSheet } from "./Sheet";

const buttonVariants = {
  primary: "default",
  secondary: "outline",
  subtle: "ghost",
} as const;

export const shadcnAssistantControls: TableAssistantSlots = {
  Button: (props) =>
    shadcnActionButton(
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        "aria-expanded": props.expanded,
        title: props.tooltip,
        class: props.className,
        disabled: props.disabled,
        variant: props.variant ? buttonVariants[props.variant] : "outline",
        size: props.iconOnly ? "icon" : "default",
        onClick: props.onClick,
      },
      [
        props.icon,
        props.iconOnly && props.icon ? null : (props.children ?? props.label),
      ]
    ),
  Composer: (props) =>
    h(Textarea, {
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: ["resize-none", props.className],
      modelValue: props.value,
      disabled: props.disabled,
      rows: 2,
      "onUpdate:modelValue": (value: string | number) =>
        props.onChange(String(value)),
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      "span",
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        class: [
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold data-[tone=danger]:text-destructive",
          props.className,
        ],
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
          assistantClass,
          "flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
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
          assistantClass,
          "fixed bottom-4 end-4 z-50 flex max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] flex-col gap-4 overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-lg",
          props.className,
        ],
        style: props.style,
      },
      [props.children]
    ),
  Sheet: (props) => h(ShadcnAssistantSheet, { ...props, key: props.part }),
  Menu: (props) => h(ShadcnExamplesMenu, props),
  LanguageChip: (props) =>
    shadcnSelect({
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
export const shadcnApprovalControls: ApprovalReviewSlots = {
  Approve: shadcnAssistantControls.Button,
  Reject: shadcnAssistantControls.Button,
  Action: shadcnAssistantControls.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: ["m-0 grid list-none gap-2 p-0", props.className],
      },
      [props.children]
    ),
};
