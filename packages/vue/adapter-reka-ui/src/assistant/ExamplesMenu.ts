import {
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { defineComponent, h, shallowRef, watch } from "vue";

import { rekaPortal } from "../controls/portal";

export const RekaExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    let generation = 0;
    watch(
      [active, () => props.disabled, () => props.items, () => props.onSelect],
      () => {
        generation++;
        open.value = false;
      },
      { flush: "sync" }
    );
    return () => {
      const ticket = generation;
      const current = () =>
        active.value && !props.disabled && ticket === generation;
      const items = props.items.map((item) =>
        h(
          DropdownMenuItem,
          {
            key: item.id,
            class: "at-reka-menu-item",
            "data-adapttable-part": item.part,
            onSelect: () => {
              if (current() && props.items.includes(item))
                props.onSelect(item.id);
            },
          },
          {
            default: () => [
              item.icon,
              h("span", [
                h("strong", item.title),
                item.description ? h("small", item.description) : null,
              ]),
            ],
          }
        )
      );
      const content = () =>
        h(
          DropdownMenuContent,
          {
            class: "at-reka-menu",
            "aria-label": props.label,
            sideOffset: 5,
            style: { maxBlockSize: props.maxHeight, overflowY: "auto" },
            onCloseAutoFocus: (event: Event) => {
              if (!active.value) event.preventDefault();
            },
          },
          { default: () => items }
        );
      const portal = () => rekaPortal(DropdownMenuPortal, content);
      return h(
        DropdownMenuRoot,
        {
          open: active.value && open.value,
          "onUpdate:open": (value: boolean) => {
            if (current()) open.value = value;
          },
        },
        {
          default: () => [
            h(
              DropdownMenuTrigger,
              {
                class: ["at-reka-button", props.className],
                disabled: props.disabled,
                "aria-label": props.label,
                title: props.label,
                "data-adapttable-part": props.part,
              },
              { default: () => [props.icon, props.label] }
            ),
            portal(),
          ],
        }
      );
    };
  },
  {
    name: "RekaExamplesMenu",
    props: [
      "label",
      "part",
      "className",
      "icon",
      "disabled",
      "items",
      "onSelect",
      "maxHeight",
    ],
  }
);
