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

import { menuClass, menuItemClass } from "../actions/controls";
import { Button } from "../components/button";
import { shadcnPortal } from "../lib/portal";

function menuTrigger(props: TableAssistantMenuProps) {
  return h(DropdownMenuTrigger, { asChild: true }, () =>
    h(
      Button,
      {
        variant: "outline",
        type: "button",
        class: props.className,
        disabled: props.disabled,
        "aria-label": props.label,
        title: props.label,
        "data-adapttable-part": props.part,
      },
      () => [props.icon, props.label]
    )
  );
}

export const ShadcnExamplesMenu = defineComponent(
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
            class: menuItemClass,
            "data-adapttable-part": item.part,
            "data-slot": "dropdown-menu-item",
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
                item.description
                  ? h(
                      "small",
                      { class: "block text-muted-foreground" },
                      item.description
                    )
                  : null,
              ]),
            ],
          }
        )
      );
      const content = () =>
        h(
          DropdownMenuContent,
          {
            class: menuClass,
            "data-slot": "dropdown-menu-content",
            "aria-label": props.label,
            sideOffset: 5,
            style: { maxBlockSize: props.maxHeight, overflowY: "auto" },
            onCloseAutoFocus: (event: Event) => {
              if (!active.value) event.preventDefault();
            },
          },
          { default: () => items }
        );
      const portal = () => shadcnPortal(DropdownMenuPortal, content);
      return h(
        DropdownMenuRoot,
        {
          open: active.value && open.value,
          "onUpdate:open": (value: boolean) => {
            if (current()) open.value = value;
          },
        },
        {
          default: () => [menuTrigger(props), portal()],
        }
      );
    };
  },
  {
    name: "ShadcnExamplesMenu",
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
