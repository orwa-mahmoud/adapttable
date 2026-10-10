import {
  type TableAssistantMenuProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  shallowRef,
  useId,
  watch,
} from "vue";

/** A native disclosure of commands. The browser retains ordinary Tab navigation. */
export const NativeExamplesMenu = defineComponent(
  (props: TableAssistantMenuProps) => {
    const active = useScopeActivity();
    const root = shallowRef<HTMLDetailsElement | null>(null);
    const trigger = shallowRef<HTMLElement | null>(null);
    const open = shallowRef(false);
    const listId = useId();
    const generation = shallowRef(0);
    const close = (restore = false) => {
      open.value = false;
      if (root.value) root.value.open = false;
      if (restore && active.value && !props.disabled) trigger.value?.focus();
    };
    watch(
      [active, () => props.disabled, () => props.onSelect, () => props.items],
      () => {
        generation.value += 1;
        close();
      },
      { flush: "sync" }
    );
    watch(
      active,
      (enabled, _previous, cleanup) => {
        if (!enabled) return;
        const outside = (event: PointerEvent) => {
          if (
            event.target instanceof Node &&
            !root.value?.contains(event.target)
          )
            close();
        };
        document.addEventListener("pointerdown", outside);
        cleanup(() => document.removeEventListener("pointerdown", outside));
      },
      { immediate: true }
    );
    const buttons = () =>
      Array.from(
        root.value?.querySelectorAll<HTMLButtonElement>(
          "menu button:not(:disabled)"
        ) ?? []
      );
    const keydown = (event: KeyboardEvent) => {
      if (props.disabled || !active.value) return;
      if (event.key === "Escape" && (open.value || root.value?.open)) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      open.value = true;
      const owner = generation.value;
      void nextTick(() => {
        if (!active.value || props.disabled || owner !== generation.value)
          return;
        const items = buttons();
        if (!items.length) return;
        const current = items.findIndex(
          (item) => item === document.activeElement
        );
        let index = (current + 1) % items.length;
        if (event.key === "Home") index = 0;
        else if (event.key === "End") index = items.length - 1;
        else if (event.key === "ArrowUp")
          index = current <= 0 ? items.length - 1 : current - 1;
        items[index]?.focus();
      });
    };
    const choose = async (
      item: TableAssistantMenuProps["items"][number],
      owner: number,
      select: TableAssistantMenuProps["onSelect"]
    ) => {
      close(true);
      await Promise.resolve();
      await nextTick();
      if (
        active.value &&
        !props.disabled &&
        owner === generation.value &&
        props.onSelect === select &&
        props.items.includes(item)
      )
        select(item.id);
    };
    return () => {
      const owner = generation.value;
      const select = props.onSelect;
      return h(
        "details",
        {
          ref: root,
          open: open.value,
          "data-adapttable-part": "assistant-examples",
          onKeydown: keydown,
          onToggle: () => {
            if (!active.value || props.disabled) close();
            else open.value = Boolean(root.value?.open);
          },
        },
        [
          h(
            "summary",
            {
              ref: trigger,
              "data-adapttable-part": props.part,
              class: props.className,
              "aria-label": props.label,
              title: props.label,
              "aria-disabled": props.disabled,
              "aria-expanded": open.value,
              "aria-controls": listId,
              tabindex: props.disabled ? -1 : undefined,
              onClick: (event: MouseEvent) => {
                if (props.disabled || !active.value) event.preventDefault();
              },
            },
            [props.icon, props.label]
          ),
          h(
            "menu",
            {
              id: listId,
              "data-adapttable-part": "assistant-examples-list",
              style: { maxHeight: props.maxHeight, overflowY: "auto" },
            },
            props.items.map((item) =>
              h("li", { key: item.id }, [
                h(
                  "button",
                  {
                    type: "button",
                    "data-adapttable-part": item.part,
                    disabled: props.disabled,
                    onClick: () => {
                      void choose(item, owner, select);
                    },
                  },
                  [
                    item.icon,
                    h("span", item.title),
                    item.description ? h("small", item.description) : null,
                  ]
                ),
              ])
            )
          ),
        ]
      );
    };
  },
  {
    name: "NativeExamplesMenu",
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
