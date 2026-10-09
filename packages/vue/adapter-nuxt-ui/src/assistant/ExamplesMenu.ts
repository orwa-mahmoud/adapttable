import {
  createMenuNavigation,
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UPopover from "@nuxt/ui/components/Popover.vue";
import { defineComponent, h, shallowRef, watch } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";

/** One shortcut as a menu item: its icon, title and optional description. */
function shortcut(
  item: TableAssistantMenuProps["items"][number],
  choose: (id: string) => void
) {
  return h(
    NuxtButton,
    {
      key: item.id,
      variant: "ghost",
      block: true,
      attrs: {
        role: "menuitem",
        tabindex: -1,
        "data-adapttable-part": item.part,
        class: "adapttable-nuxt-assistant-shortcut",
        onClick: () => choose(item.id),
      },
    },
    () => [
      item.icon,
      h("span", [
        h("strong", item.title),
        item.description ? h("small", item.description) : null,
      ]),
    ]
  );
}

const focusFirst = (event: Event) => {
  event.preventDefault();
  const panel = event.target;
  if (panel instanceof HTMLElement)
    panel
      .querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
};
const keepFocus = (event: Event) => {
  event.preventDefault();
};

/**
 * The assistant's shortcuts in a Nuxt UI popover menu under its trigger.
 * The shared menu navigation moves focus; Escape and Tab close the menu and
 * Escape returns focus to the trigger.
 */
export const NuxtExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLElement | null>(null);
    const setTrigger = (element: HTMLElement | null) => {
      trigger.value = element;
    };
    const navigation = createMenuNavigation();
    let generation = 0;
    watch(
      [active, () => props.disabled, () => props.items, () => props.onSelect],
      () => {
        generation++;
        open.value = false;
      },
      { flush: "sync" }
    );
    watch(open, () => {
      navigation.reset();
    });
    const close = (restore: boolean) => {
      open.value = false;
      if (restore) trigger.value?.focus({ preventScroll: true });
    };
    const keydown = (event: KeyboardEvent) => {
      const panel = event.currentTarget;
      if (!(panel instanceof HTMLElement)) return;
      const items = [
        ...panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
      ];
      const action = navigation.key(
        event,
        items.map((item) => ({
          label: item.textContent ?? "",
          disabled: item.disabled,
        })),
        items.findIndex((item) => item === panel.ownerDocument.activeElement)
      );
      if (!action) return;
      if (action.kind !== "close" || action.key !== "Tab")
        event.preventDefault();
      // Reka's dismissable layers listen on the window; the menu's own keys
      // never reach the assistant sheet beneath it.
      event.stopPropagation();
      if (action.kind === "close") close(action.key === "Escape");
      else items[action.index]?.focus({ preventScroll: true });
    };
    const outside = (event: CustomEvent<{ originalEvent: Event }>) => {
      const target = event.detail.originalEvent.target;
      // The trigger owns its own toggle.
      if (target instanceof Node && trigger.value?.contains(target))
        event.preventDefault();
    };
    return () => {
      if (!active.value) return null;
      const ticket = generation;
      const choose = (id: string) => {
        if (
          !active.value ||
          props.disabled ||
          ticket !== generation ||
          !props.items.some((item) => item.id === id)
        )
          return;
        close(false);
        props.onSelect(id);
      };
      const items = props.items.map((item) => shortcut(item, choose));
      // Reka names its popover content a dialog; the menu is the list inside.
      const content = {
        "aria-label": props.label,
        align: "start",
        onOpenAutoFocus: focusFirst,
        onCloseAutoFocus: keepFocus,
        onInteractOutside: outside,
      } as const;
      return [
        h(
          NuxtButton,
          {
            attrs: {
              ref: setTrigger,
              disabled: props.disabled,
              "aria-label": props.label,
              "aria-haspopup": "menu",
              "aria-expanded": open.value,
              title: props.label,
              class: props.className,
              "data-adapttable-part": props.part,
              onClick: () => {
                if (active.value && !props.disabled) open.value = !open.value;
              },
            },
          },
          () => [props.icon, props.label]
        ),
        h(
          UPopover,
          {
            open: open.value,
            reference: trigger.value ?? undefined,
            content,
            ui: { content: "adapttable-nuxt-assistant-menu" },
            "onUpdate:open": (next: boolean) => {
              if (!next) close(false);
            },
          },
          {
            content: () =>
              h(
                "div",
                {
                  role: "menu",
                  "aria-label": props.label,
                  class: "adapttable-nuxt-assistant-menu-items",
                  style: { maxHeight: props.maxHeight },
                  onKeydown: keydown,
                },
                items
              ),
          }
        ),
      ];
    };
  },
  {
    name: "NuxtExamplesMenu",
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
