import {
  type ManagedOverlayPanelProps,
  useElementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { ClickOutside, ElPopover } from "element-plus";
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  onScopeDispose,
  type PropType,
  provide,
  shallowRef,
  watch,
  withDirectives,
} from "vue";

import { isElementRef } from "../controls/ref";
import { ElementCard } from "../presentation/ElementCard";
import { columnMenuContainer } from "./panelContext";

export const ElementColumnMenuPanel = defineComponent(
  (props: {
    readonly control: ManagedOverlayPanelProps;
    readonly initialFocus?: string;
  }) => {
    const active = useScopeActivity();
    const inheritedDirection = shallowRef<"ltr" | "rtl">();
    const readDirection = () => {
      if (props.control.attrs.dir !== undefined) return;
      const anchor = props.control.anchor;
      const view = anchor?.ownerDocument.defaultView;
      if (anchor && view)
        inheritedDirection.value =
          view.getComputedStyle(anchor).direction === "rtl" ? "rtl" : "ltr";
    };
    // A public virtual positioning reference leaves trigger ARIA/events with Chrome.
    const virtualAnchor = {
      getBoundingClientRect: () =>
        props.control.anchor?.getBoundingClientRect() ?? new DOMRect(),
      get contextElement() {
        return props.control.anchor ?? undefined;
      },
    };
    const panel = shallowRef<HTMLElement | null>(null);
    const setPanel = (target: unknown) => {
      if (target == null) {
        panel.value = null;
        return;
      }
      panel.value = target instanceof HTMLElement ? target : null;
    };
    provide(columnMenuContainer, panel);
    useElementRef(
      () => panel.value,
      () =>
        isElementRef(props.control.attrs.ref)
          ? props.control.attrs.ref
          : undefined
    );
    let live = true;
    onScopeDispose(() => {
      live = false;
    });
    const close = (reason: "escape" | "outside") => {
      const control = props.control;
      if (!active.value || !control.open || !control.isCurrent()) return;
      control.onClose(reason);
      if (reason === "escape")
        void nextTick(() => {
          if (
            (!live || !props.control.open) &&
            control.isCurrent() &&
            control.anchor?.isConnected
          )
            control.anchor.focus();
        });
    };
    const outside = (event: MouseEvent) => {
      if (
        event.target instanceof Node &&
        props.control.anchor?.contains(event.target)
      )
        return;
      close("outside");
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        !active.value ||
        !props.control.open ||
        !props.control.isCurrent() ||
        event.key !== "Escape"
      )
        return;
      // Element's focus trap releases on any Escape that reaches the document,
      // including one an inner control handled or an IME composition owns, so
      // the panel keeps those Escapes inside itself.
      if (event.defaultPrevented || event.isComposing) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      close("escape");
    };
    // The virtual reference leaves the trigger outside ElPopover's event tree.
    // It remains the keyboard owner until the native enter handoff finishes.
    watch(
      [active, () => props.control.anchor],
      ([enabled, anchor], _previous, cleanup) => {
        if (!enabled || !anchor) return;
        anchor.addEventListener("keydown", keydown);
        cleanup(() => anchor.removeEventListener("keydown", keydown));
      },
      { immediate: true }
    );
    const focus = () => {
      if (!active.value || !props.control.open || !props.control.isCurrent())
        return;
      const element = panel.value;
      if (!element) return;
      const focused = element.ownerDocument.activeElement;
      if (
        focused !== props.control.anchor &&
        focused !== element.ownerDocument.body &&
        focused !== element &&
        focused !== element.closest(".el-popper")
      )
        return;
      const search = panel.value?.querySelector<HTMLInputElement>(
        props.initialFocus ?? 'input[data-adapttable-part="column-menu-search"]'
      );
      (search ?? element).focus({ preventScroll: true });
    };
    return () => {
      const control = props.control;
      if (
        !active.value ||
        !control.open ||
        !control.isCurrent() ||
        !control.anchor
      )
        return null;
      const direction = control.attrs.dir;
      const dir =
        direction === "rtl" || direction === "ltr"
          ? direction
          : inheritedDirection.value;
      return h(
        ElPopover,
        {
          visible: control.open,
          virtualTriggering: true,
          virtualRef: virtualAnchor,
          trigger: "click",
          // The actual content card carries Chrome's dialog id, name and ref.
          role: "group",
          placement: dir === "rtl" ? "bottom-end" : "bottom-start",
          appendTo: control.container ?? "body",
          teleported: true,
          persistent: false,
          showArrow: false,
          width: "min(28rem, calc(100vw - 1rem))",
          popperStyle: { padding: 0, direction: dir },
          onBeforeEnter: readDirection,
          onAfterEnter: focus,
        },
        {
          default: () =>
            withDirectives(
              h(
                ElementCard,
                {
                  attrs: mergeProps(control.attrs, {
                    ref: setPanel,
                    dir,
                    tabindex: -1,
                    class: "adapttable-element-plus-column-panel",
                    style: { overflow: "visible" },
                    onKeydown: keydown,
                  }),
                  bodyStyle: {
                    padding: "0.75rem",
                    maxHeight: "min(70vh, 32rem)",
                    overflow: "auto",
                  },
                },
                { default: () => control.content }
              ),
              [[ClickOutside, outside]]
            ),
        }
      );
    };
  },
  {
    name: "ElementColumnMenuPanel",
    props: {
      control: { type: Object as PropType<ManagedOverlayPanelProps> },
      initialFocus: { type: String as PropType<string | undefined> },
    },
  }
);
