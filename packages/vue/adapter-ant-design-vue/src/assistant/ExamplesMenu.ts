import {
  scheduleTick,
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Dropdown, Menu, MenuItem } from "ant-design-vue";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { antdButton } from "../controls/button";
import { focusOnOpen, handleMenuKey } from "../controls/menuKeyboard";
import { popupContainer } from "../controls/popupContainer";

/** One shortcut: its icon, title and optional description. */
function menuItem(item: TableAssistantMenuProps["items"][number]) {
  return h(
    MenuItem,
    { key: item.id, "data-adapttable-part": item.part },
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

/** The assistant's shortcuts in an Ant Design Vue dropdown under its trigger. */
export const AntdExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const trigger = shallowRef<HTMLElement | null>(null);
    const open = shallowRef(false);
    let generation = 0;
    const focusMenu = focusOnOpen(scheduleTick);
    watch(
      [active, () => props.disabled, () => props.items, () => props.onSelect],
      () => {
        generation++;
        open.value = false;
      },
      { flush: "sync" }
    );
    // The menu closes itself on Escape and hands focus back to its trigger,
    // so an Escape inside it never reaches the surface around the trigger.
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing) return;
      event.preventDefault();
      event.stopPropagation();
      open.value = false;
      trigger.value?.focus({ preventScroll: true });
    };
    return () => {
      if (!active.value) return null;
      const ticket = generation;
      const current = () =>
        active.value && !props.disabled && ticket === generation;
      const choose = ({ key }: { key: string | number }) => {
        open.value = false;
        const id = String(key);
        if (current() && props.items.some((item) => item.id === id))
          props.onSelect(id);
      };
      return h(
        Dropdown,
        {
          trigger: ["click"],
          open: open.value && !props.disabled,
          disabled: props.disabled,
          // The list leaves the sheet so the drawer's scrolling never clips it.
          getPopupContainer: popupContainer(true),
          overlayStyle: { maxHeight: props.maxHeight },
          destroyPopupOnHide: true,
          onOpenChange: (value: boolean) => {
            open.value = value;
          },
        },
        {
          default: () =>
            antdButton(
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
                onKeydown: (event: KeyboardEvent) => {
                  if (open.value) keydown(event);
                },
              },
              [props.icon ?? props.label]
            ),
          overlay: () =>
            h(
              Menu,
              {
                // Captured on the list so an Escape from any item reaches it
                // before Ant Design Vue's own handling moves focus into the list.
                "aria-label": props.label,
                selectable: false,
                onKeydownCapture: keydown,
                onKeydown: handleMenuKey,
                ref: focusMenu,
                onClick: choose,
              },
              { default: () => props.items.map(menuItem) }
            ),
        }
      );
    };
  },
  {
    name: "AntdExamplesMenu",
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
