import {
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { HeadlessMenu, headlessMenuItem } from "../controls/menu";

function exampleItems(props: TableAssistantMenuProps, current: () => boolean) {
  return props.items.map((item) =>
    headlessMenuItem(
      {
        key: item.id,
        "data-adapttable-part": item.part,
        onClick: () => {
          if (current() && props.items.includes(item)) props.onSelect(item.id);
        },
      },
      () => [
        item.icon,
        h("span", [
          h("strong", item.title),
          item.description ? h("small", item.description) : null,
        ]),
      ]
    )
  );
}

export const HeadlessExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    // A new epoch closes the menu, which is how an open one is retired.
    const generation = shallowRef(0);
    watch(
      [active, () => props.disabled, () => props.items, () => props.onSelect],
      () => {
        generation.value++;
      },
      { flush: "sync" }
    );
    return () => {
      const ticket = generation.value;
      const current = () =>
        active.value && !props.disabled && ticket === generation.value;
      return h(
        HeadlessMenu,
        {
          epoch: ticket,
          triggerAttrs: {
            class: ["at-headless-button", props.className],
            disabled: props.disabled,
            "aria-label": props.label,
            title: props.label,
            "data-adapttable-part": props.part,
          },
          itemsAttrs: {
            "aria-label": props.label,
            style: { maxBlockSize: props.maxHeight, overflowY: "auto" },
          },
        },
        {
          trigger: () => [props.icon ?? props.label],
          default: () => exampleItems(props, current),
        }
      );
    };
  },
  {
    name: "HeadlessExamplesMenu",
    props: {
      label: { type: String as PropType<TableAssistantMenuProps["label"]> },
      part: { type: String as PropType<TableAssistantMenuProps["part"]> },
      className: {
        type: String as PropType<TableAssistantMenuProps["className"]>,
      },
      icon: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          TableAssistantMenuProps["icon"]
        >,
        default: undefined,
      },
      disabled: {
        type: Boolean as PropType<TableAssistantMenuProps["disabled"]>,
        default: undefined,
      },
      items: { type: Array as PropType<TableAssistantMenuProps["items"]> },
      onSelect: {
        type: Function as PropType<TableAssistantMenuProps["onSelect"]>,
      },
      maxHeight: {
        type: String as PropType<TableAssistantMenuProps["maxHeight"]>,
      },
    },
  }
);
