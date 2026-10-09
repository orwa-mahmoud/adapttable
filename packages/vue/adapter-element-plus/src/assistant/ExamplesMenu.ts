import {
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  type DropdownInstance,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from "element-plus";
import { defineComponent, h, shallowRef, watch } from "vue";

import { elementButton } from "../controls/button";

/** One shortcut: its icon, title and optional description. */
function menuItem(item: TableAssistantMenuProps["items"][number]) {
  return h(
    ElDropdownItem,
    { key: item.id, command: item.id, "data-adapttable-part": item.part },
    {
      default: () => [
        item.icon,
        h("span", [
          h("strong", item.title),
          item.description ? h("small", item.description) : null,
        ]),
      ],
    }
  );
}

/** The assistant's shortcuts in an Element Plus dropdown under its trigger. */
export const ElementExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const dropdown = shallowRef<DropdownInstance>();
    const trigger = shallowRef<HTMLElement | null>(null);
    let generation = 0;
    watch(
      [active, () => props.disabled, () => props.items, () => props.onSelect],
      () => {
        generation++;
        dropdown.value?.handleClose();
      },
      { flush: "sync" }
    );
    // The menu closes itself on Escape and hands focus back to its trigger,
    // so an Escape inside it never reaches the surface around the trigger.
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      dropdown.value?.handleClose();
      trigger.value?.focus({ preventScroll: true });
    };
    return () => {
      if (!active.value) return null;
      const ticket = generation;
      const current = () =>
        active.value && !props.disabled && ticket === generation;
      return h(
        ElDropdown,
        {
          ref: dropdown,
          trigger: "click",
          persistent: false,
          hideTimeout: 0,
          disabled: props.disabled,
          maxHeight: props.maxHeight,
          onCommand: (id: unknown) => {
            if (
              current() &&
              typeof id === "string" &&
              props.items.some((item) => item.id === id)
            )
              props.onSelect(id);
          },
        },
        {
          default: () =>
            elementButton(
              {
                ref: (element: HTMLElement | null) => {
                  trigger.value = element;
                },
                type: "button",
                disabled: props.disabled,
                "aria-label": props.label,
                title: props.label,
                class: props.className,
                "data-adapttable-part": props.part,
              },
              [props.icon, props.label]
            ),
          dropdown: () =>
            h(
              ElDropdownMenu,
              // Captured on the list so an Escape from any item reaches it
              // before Element's own handling moves focus into the list.
              { "aria-label": props.label, onKeydownCapture: keydown },
              { default: () => props.items.map(menuItem) }
            ),
        }
      );
    };
  },
  {
    name: "ElementExamplesMenu",
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
