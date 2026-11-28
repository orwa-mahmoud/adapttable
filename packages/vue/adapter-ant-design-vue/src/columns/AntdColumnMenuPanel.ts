import {
  type ManagedOverlayPanelProps,
  scheduleTick,
  useElementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  defineComponent,
  h,
  mergeProps,
  onScopeDispose,
  type PropType,
  provide,
  shallowRef,
  watch,
} from "vue";

import { isElementRef } from "../controls/ref";
import {
  AntdAnchoredPopover,
  presentPopoverContent,
} from "../overlays/AnchoredPopover";
import { useOutsideDismiss } from "../overlays/outsideDismiss";
import { AntdCard } from "../presentation/AntdCard";
import { rtlScrollbarGutter } from "../scrollbarGutter";
import { columnMenuContainer } from "./panelContext";

export const AntdColumnMenuPanel = defineComponent(
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
    const panel = shallowRef<HTMLElement | null>(null);
    const setPanel = (target: unknown) => {
      if (target == null) {
        panel.value = null;
        return;
      }
      panel.value = target instanceof HTMLElement ? target : null;
      if (panel.value) {
        presentPopoverContent(panel.value);
        readDirection();
        scheduleTick(focus);
      }
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
        scheduleTick(() => {
          if (
            (!live || !props.control.open) &&
            control.isCurrent() &&
            control.anchor?.isConnected
          )
            control.anchor.focus();
        });
    };
    useOutsideDismiss(
      () => active.value && props.control.open && props.control.isCurrent(),
      () => props.control.anchor?.ownerDocument,
      () => [panel.value, props.control.anchor],
      () => close("outside")
    );
    const keydown = (event: KeyboardEvent) => {
      if (
        !active.value ||
        !props.control.open ||
        !props.control.isCurrent() ||
        event.key !== "Escape"
      )
        return;
      // Ant Design Vue's focus trap releases on any Escape that reaches the document,
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
    // The trigger stays outside the popover's event tree.
    // It remains the keyboard owner until the native enter handoff finishes.
    watch(
      [active, () => props.control.anchor, () => props.control.open],
      ([enabled, anchor], _previous, cleanup) => {
        if (!enabled || !anchor || !props.control.open) return;
        const document = anchor.ownerDocument;
        document.addEventListener("keydown", keydown);
        cleanup(() => document.removeEventListener("keydown", keydown));
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
        focused !== element.closest(".ant-popover")
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
        AntdAnchoredPopover,
        {
          open: control.open,
          anchor: control.anchor,
          container: control.container ?? undefined,
          placement: dir === "rtl" ? "bottomRight" : "bottomLeft",
          overlayStyle: {
            width: "min(28rem, calc(100vw - 1rem))",
            direction: dir,
            translate: `${rtlScrollbarGutter(dir, props.control.anchor?.ownerDocument.defaultView)} 0`,
          },
          afterOpen: () => {
            if (panel.value) presentPopoverContent(panel.value);
            readDirection();
            focus();
          },
        },
        {
          default: () =>
            h(
              AntdCard,
              {
                attrs: mergeProps(control.attrs, {
                  ref: setPanel,
                  dir,
                  tabindex: -1,
                  class: "adapttable-ant-design-vue-column-panel",
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
        }
      );
    };
  },
  {
    name: "AntdColumnMenuPanel",
    props: {
      control: { type: Object as PropType<ManagedOverlayPanelProps> },
      initialFocus: { type: String as PropType<string | undefined> },
    },
  }
);
