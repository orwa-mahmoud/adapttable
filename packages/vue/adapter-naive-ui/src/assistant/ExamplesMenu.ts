import {
  createMenuNavigation,
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NCard, NPopover } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  nextTick,
  type PropType,
  type ShallowRef,
  shallowRef,
  watch,
} from "vue";

import { naiveButton } from "../controls/button";
import { htmlRoot } from "../controls/elementTarget";

/** One shortcut as a menu item: its icon, title and optional description. */
function shortcut(
  item: TableAssistantMenuProps["items"][number],
  choose: (id: string) => void
) {
  return naiveButton(
    {
      key: item.id,
      role: "menuitem",
      tabindex: -1,
      "data-adapttable-part": item.part,
      class: "adapttable-naive-assistant-shortcut",
      onClick: () => choose(item.id),
    },
    [
      item.icon,
      h("span", [
        h("strong", item.title),
        item.description ? h("small", item.description) : null,
      ]),
    ],
    { text: true }
  );
}

/** The open menu: a Naive UI card holding one menu item per shortcut. */
function menuCard(
  props: TableAssistantMenuProps,
  card: ShallowRef<ComponentPublicInstance | null>,
  keydown: (event: KeyboardEvent) => void,
  choose: (id: string) => void
) {
  const items = props.items.map((item) => shortcut(item, choose));
  return h(
    NCard,
    {
      ref: card,
      size: "small",
      role: "menu",
      "aria-label": props.label,
      class: "adapttable-naive-assistant-menu",
      contentStyle: { display: "flex", flexDirection: "column", gap: "4px" },
      style: { maxHeight: props.maxHeight, overflowY: "auto" },
      onKeydown: keydown,
    },
    { default: () => items }
  );
}

/**
 * The assistant's shortcuts in a Naive UI popover menu under its trigger.
 * The shared menu navigation moves focus; Escape and Tab close the menu and
 * Escape returns focus to the trigger.
 */
export const NaiveExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLElement | null>(null);
    const card = shallowRef<ComponentPublicInstance | null>(null);
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
    watch(open, (expanded) => {
      navigation.reset();
      if (!expanded) return;
      void nextTick(() => {
        const panel = card.value ? htmlRoot(card.value) : null;
        panel
          ?.querySelector<HTMLElement>('[role="menuitem"]')
          ?.focus({ preventScroll: true });
      });
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
      const focusTargets: readonly (EventTarget | null | undefined)[] = items;
      const action = navigation.key(
        event,
        items.map((item) => ({
          label: item.textContent ?? "",
          disabled: item.disabled,
        })),
        focusTargets.indexOf(panel.ownerDocument.activeElement)
      );
      if (!action) return;
      if (action.kind !== "close" || action.key !== "Tab")
        event.preventDefault();
      event.stopPropagation();
      if (action.kind === "close") close(action.key === "Escape");
      else items[action.index]?.focus({ preventScroll: true });
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
      return h(
        NPopover,
        {
          trigger: "manual",
          show: open.value,
          placement: "bottom-start",
          showArrow: false,
          raw: true,
          onClickoutside: (event: MouseEvent) => {
            if (
              event.target instanceof Node &&
              trigger.value?.contains(event.target)
            )
              return;
            close(false);
          },
        },
        {
          trigger: () =>
            naiveButton(
              {
                ref: (element: HTMLElement | null) => {
                  trigger.value = element;
                },
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
              [props.icon, props.label]
            ),
          default: () => menuCard(props, card, keydown, choose),
        }
      );
    };
  },
  {
    name: "NaiveExamplesMenu",
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
