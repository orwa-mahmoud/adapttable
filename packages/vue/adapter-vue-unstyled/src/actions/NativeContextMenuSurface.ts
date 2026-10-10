import {
  type ContextMenuSurfaceProps,
  elementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  nextTick,
  type PropType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";
/** Native HTML is this kit's menu primitive, including its keyboard behavior. */
export const NativeContextMenuSurface = defineComponent(
  (props: ContextMenuSurfaceProps<VNodeChild>) => {
    const root = shallowRef<HTMLElement | null>(null);
    const active = useScopeActivity();
    const position = shallowRef({ left: props.at.x, top: props.at.y });
    const items = () => [
      ...(root.value?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])'
      ) ?? []),
    ];
    const focusFirst = () => {
      if (active.value) {
        items()[0]?.focus();
        const rect = root.value?.getBoundingClientRect();
        const win = root.value?.ownerDocument.defaultView;
        if (rect && win)
          position.value = {
            left: Math.max(
              0,
              Math.min(props.at.x, win.innerWidth - rect.width)
            ),
            top: Math.max(
              0,
              Math.min(props.at.y, win.innerHeight - rect.height)
            ),
          };
      }
    };
    watch(
      [root, active, () => props.at],
      () => {
        void nextTick(focusFirst);
      },
      { flush: "post" }
    );
    watch(
      [root, active],
      ([element, live], _old, onCleanup) => {
        if (!element || !live) return;
        const outside = (event: PointerEvent) => {
          if (!event.composedPath().includes(element)) props.onClose();
        };
        element.ownerDocument.addEventListener("pointerdown", outside);
        onCleanup(() =>
          element.ownerDocument.removeEventListener("pointerdown", outside)
        );
      },
      { flush: "sync" }
    );
    watch(
      [root, active],
      ([element, live], _old, onCleanup) => {
        if (!element || !live || typeof element.showPopover !== "function")
          return;
        element.showPopover();
        onCleanup(() => element.hidePopover());
      },
      { flush: "post" }
    );
    let typeahead = "";
    let typedAt = 0;
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !active.value) return;
      const own =
        event.target instanceof Element
          ? event.target.closest('[role="menu"]')
          : null;
      if (own !== root.value) return;
      if (event.key === "Escape" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        props.onClose();
        return;
      }
      const entries = items();
      const at = entries.findIndex(
        (item) => item === root.value?.ownerDocument.activeElement
      );
      let to: number | undefined;
      if (event.key === "ArrowDown") to = (at + 1) % entries.length;
      else if (event.key === "ArrowUp")
        to = (at - 1 + entries.length) % entries.length;
      else if (event.key === "Home") to = 0;
      else if (event.key === "End") to = entries.length - 1;
      else if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const now = Date.now();
        typeahead =
          (now - typedAt > 700 ? "" : typeahead) +
          event.key.toLocaleLowerCase();
        typedAt = now;
        to = entries.findIndex((item) =>
          item.textContent?.trim().toLocaleLowerCase().startsWith(typeahead)
        );
      }
      if (to !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        entries[to]?.focus();
      }
    };
    return () =>
      h(
        "div",
        {
          ref: elementRef<HTMLElement>((element) => {
            root.value = element;
          }),
          role: "menu",
          popover: "manual",
          "aria-label": props.label,
          "data-adapttable-part": "context-menu",
          class: props.className,
          onKeydown: key,
          style: {
            position: "fixed",
            margin: 0,
            inset: "auto",
            left: `${position.value.left}px`,
            top: `${position.value.top}px`,
            zIndex: 1100,
            background: "Canvas",
            color: "CanvasText",
            padding: ".5rem",
            display: "flex",
            flexDirection: "column",
            maxWidth: "90vw",
            maxHeight: "80vh",
            overflow: "auto",
          },
        },
        [props.children]
      );
  },
  {
    name: "NativeContextMenuSurface",
    props: {
      at: {
        type: Object as PropType<ContextMenuSurfaceProps<VNodeChild>["at"]>,
      },
      anchorRef: {
        type: Object as PropType<
          ContextMenuSurfaceProps<VNodeChild>["anchorRef"]
        >,
      },
      label: {
        type: String as PropType<ContextMenuSurfaceProps<VNodeChild>["label"]>,
      },
      onClose: {
        type: Function as PropType<
          ContextMenuSurfaceProps<VNodeChild>["onClose"]
        >,
      },
      container: {
        type: Object as PropType<
          ContextMenuSurfaceProps<VNodeChild>["container"]
        >,
      },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          ContextMenuSurfaceProps<VNodeChild>["children"]
        >,
        default: undefined,
      },
      className: {
        type: String as PropType<
          ContextMenuSurfaceProps<VNodeChild>["className"]
        >,
      },
    },
  }
);
