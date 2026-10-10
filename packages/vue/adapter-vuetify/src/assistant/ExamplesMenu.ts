import {
  createMenuNavigation,
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  shallowRef,
  watch,
} from "vue";
import {
  VList,
  VListItem,
  VListItemSubtitle,
  VListItemTitle,
} from "vuetify/components/VList";
import { VMenu } from "vuetify/components/VMenu";

import { vuetifyButton } from "../controls";

/** One shortcut as a menu item: its icon, title and optional description. */
function shortcut(
  item: TableAssistantMenuProps["items"][number],
  choose: (id: string) => void
) {
  return h(
    VListItem,
    {
      key: item.id,
      link: true,
      role: "menuitem",
      tabindex: -1,
      "data-adapttable-part": item.part,
      class: "adapttable-vuetify-assistant-shortcut",
      onClick: () => choose(item.id),
    },
    {
      prepend: item.icon ? () => item.icon : undefined,
      default: () => [
        h(VListItemTitle, {}, () => item.title),
        item.description
          ? h(VListItemSubtitle, {}, () => item.description)
          : null,
      ],
    }
  );
}

/**
 * The assistant's shortcuts in a Vuetify menu under its trigger. The shared
 * menu navigation moves focus ahead of VList's own keys; Escape and Tab close
 * the menu and Escape returns focus to the trigger.
 */
export const VuetifyExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLElement | null>(null);
    const list = shallowRef<InstanceType<typeof VList> | null>(null);
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
        const root: unknown = list.value?.$el;
        if (active.value && open.value && root instanceof HTMLElement)
          root
            .querySelector<HTMLElement>('[role="menuitem"]')
            ?.focus({ preventScroll: true });
      });
    });
    const setTrigger = (element: HTMLElement | null) => {
      trigger.value = element;
    };
    const close = (restore: boolean) => {
      open.value = false;
      if (restore) trigger.value?.focus({ preventScroll: true });
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
      // Vuetify's overlays read Escape on the window; the menu keeps its own keys.
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
      return [
        vuetifyButton(
          {
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
          [props.icon, props.label]
        ),
        h(
          VMenu,
          {
            modelValue: open.value,
            activator: trigger.value ?? undefined,
            openOnClick: false,
            transition: false,
            maxHeight: props.maxHeight,
            "onUpdate:modelValue": (value: boolean) => {
              if (!value) close(false);
            },
          },
          () =>
            h(
              VList,
              {
                ref: list,
                role: "menu",
                "aria-label": props.label,
                density: "compact",
                class: "adapttable-vuetify-assistant-menu",
                onKeydownCapture: keydown,
              },
              () => items
            )
        ),
      ];
    };
  },
  {
    name: "VuetifyExamplesMenu",
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
