/** Native HTML is this kit. Other kits fill the same required binding slots. */
import {
  type ApprovalReviewSlots,
  type TableAssistantSheetProps,
  type TableAssistantSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { NativeExamplesMenu } from "./NativeExamplesMenu";

const NativeSheet = defineComponent(
  (props: TableAssistantSheetProps) => {
    const active = useScopeActivity();
    const dialog = shallowRef<HTMLDialogElement | null>(null);
    watch(
      () => [props.open, active.value, dialog.value] as const,
      ([open, enabled, element], _previous, cleanup) => {
        if (!element || !enabled || !open) return;
        element.showModal();
        // showModal applies native autofocus after Chrome's initial focus.
        // Finish opening on the composer, inside the now-active modal.
        element
          .querySelector<HTMLTextAreaElement>(
            '[data-adapttable-part="assistant-input"]'
          )
          ?.focus();
        cleanup(() => {
          if (element.open) element.close();
        });
      },
      { flush: "post" }
    );
    return () =>
      h(
        "dialog",
        {
          ref: dialog,
          "data-adapttable-part": props.part,
          "aria-label": props.label,
          class: props.className,
          dir: props.dir,
          onCancel: (event: Event) => {
            event.preventDefault();
            props.onClose();
          },
          onClick: (event: MouseEvent) => {
            if (event.target === dialog.value) props.onClose();
          },
        },
        [h("div", [props.children])]
      );
  },
  {
    name: "NativeAssistantSheet",
    props: {
      label: { type: String as PropType<TableAssistantSheetProps["label"]> },
      part: { type: String as PropType<TableAssistantSheetProps["part"]> },
      className: {
        type: String as PropType<TableAssistantSheetProps["className"]>,
      },
      dir: { type: String as PropType<TableAssistantSheetProps["dir"]> },
      open: {
        type: Boolean as PropType<TableAssistantSheetProps["open"]>,
        default: undefined,
      },
      onClose: {
        type: Function as PropType<TableAssistantSheetProps["onClose"]>,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          TableAssistantSheetProps["children"]
        >,
        default: undefined,
      },
    },
  }
);

export const nativeAssistantSlots: TableAssistantSlots = {
  Button: (props) =>
    h(
      "button",
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
    h("textarea", {
      "data-adapttable-part": props.part,
      "aria-label": props.label,
      placeholder: props.placeholder,
      class: props.className,
      value: props.value,
      disabled: props.disabled,
      rows: 2,
      onInput: (event: Event) => {
        if (event.target instanceof HTMLTextAreaElement)
          props.onChange(event.target.value);
      },
      onKeydown: props.onKeyDown,
    }),
  Badge: (props) =>
    h(
      "span",
      {
        "data-adapttable-part": props.part,
        "data-tone": props.tone,
        class: props.className,
      },
      props.label
    ),
  Panel: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: props.className,
      },
      [props.children]
    ),
  Window: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: props.className,
        style: props.style,
      },
      [props.children]
    ),
  Sheet: (props) => h(NativeSheet, props),
  Menu: (props) => h(NativeExamplesMenu, props),
  LanguageChip: (props) =>
    h(
      "select",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: props.className,
        value: props.value,
        disabled: props.disabled,
        onChange: (event: Event) => {
          if (event.target instanceof HTMLSelectElement)
            props.onChange(event.target.value);
        },
      },
      props.options.map((item) =>
        h("option", { key: item.value, value: item.value }, item.label)
      )
    ),
};
export const nativeApprovalSlots: ApprovalReviewSlots = {
  Approve: nativeAssistantSlots.Button,
  Reject: nativeAssistantSlots.Button,
  Action: nativeAssistantSlots.Button,
  List: (props) =>
    h(
      "ul",
      {
        "data-adapttable-part": props.part,
        "aria-label": props.label,
        class: props.className,
      },
      [props.children]
    ),
};
