import {
  createMenuNavigation,
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QItem, QItemLabel, QItemSection, QList, QMenu } from "quasar";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";

/** One shortcut as a menu item: its icon, title and optional description. */
function shortcut(
  item: TableAssistantMenuProps["items"][number],
  choose: (id: string) => void
) {
  const sections = () => [
    item.icon ? h(QItemSection, { avatar: true }, () => item.icon) : null,
    h(QItemSection, {}, () => [
      h(QItemLabel, {}, () => item.title),
      item.description
        ? h(QItemLabel, { caption: true }, () => item.description)
        : null,
    ]),
  ];
  return h(
    QItem,
    {
      key: item.id,
      clickable: true,
      role: "menuitem",
      tabindex: -1,
      "data-adapttable-part": item.part,
      class: "adapttable-quasar-assistant-shortcut",
      onClick: () => choose(item.id),
    },
    sections
  );
}

/**
 * The assistant's shortcuts in a Quasar menu under its trigger. The shared
 * menu navigation moves focus; Escape and Tab close the menu and Escape
 * returns focus to the trigger.
 */
export const QuasarExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLButtonElement | null>(null);
    const list = shallowRef<InstanceType<typeof QList> | null>(null);
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
    const setTrigger = (element: HTMLButtonElement | null) => {
      trigger.value = element;
    };
    const close = (restore: boolean) => {
      open.value = false;
      if (restore) trigger.value?.focus({ preventScroll: true });
    };
    const focusFirst = () => {
      const root: unknown = list.value?.$el;
      if (active.value && root instanceof HTMLElement)
        root
          .querySelector<HTMLElement>('[role="menuitem"]')
          ?.focus({ preventScroll: true });
    };
    const keydown = (event: KeyboardEvent) => {
      const panel = event.currentTarget;
      if (!(panel instanceof HTMLElement)) return;
      const items = [
        ...panel.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ];
      const focusTargets: readonly (EventTarget | null | undefined)[] = items;
      const action = navigation.key(
        event,
        items.map((item) => ({ label: item.textContent ?? "" })),
        focusTargets.indexOf(panel.ownerDocument.activeElement)
      );
      if (!action) return;
      if (action.kind !== "close" || action.key !== "Tab")
        event.preventDefault();
      // Quasar's menus read Escape on the window; the menu keeps its own keys.
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
      const items = props.items.map((item) => shortcut(item, choose));
      const menu = h(
        QMenu,
        {
          modelValue: open.value,
          noFocus: true,
          noRefocus: true,
          transitionDuration: 0,
          class: "adapttable-quasar-assistant-menu",
          style: { maxHeight: props.maxHeight },
          "onUpdate:modelValue": (value: boolean) => {
            if (active.value && !props.disabled) open.value = value;
          },
          onShow: focusFirst,
        },
        () =>
          h(
            QList,
            {
              ref: list,
              role: "menu",
              "aria-label": props.label,
              onKeydown: keydown,
            },
            () => items
          )
      );
      return h(
        QuasarButton,
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
          },
        },
        () => [props.icon, props.label, menu]
      );
    };
  },
  {
    name: "QuasarExamplesMenu",
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
