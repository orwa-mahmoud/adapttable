import type { ElementRef } from "@adapttable/vue";
import {
  type ManagedOverlayPanelProps,
  type OverlayCloseReason,
  useElementRef,
} from "@adapttable/vue/adapter";
import { NCard, NPopover } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  watch,
} from "vue";

import { withoutAttributes } from "../controls/attributes";
import { htmlRoot } from "../controls/elementTarget";

/** Public Naive positioning and card surfaces own the managed panel boundary. */
export const NaiveManagedPopover = defineComponent(
  (props: { readonly control: ManagedOverlayPanelProps }) => {
    const mounted = shallowRef(false);
    const card = shallowRef<ComponentPublicInstance | null>(null);
    const position = shallowRef<{ x: number; y: number; maxHeight: number }>();
    let acquiredFocus = false;
    const panel = () => (card.value ? htmlRoot(card.value) : null);
    useElementRef(panel, () =>
      typeof props.control.attrs.ref === "function"
        ? (props.control.attrs.ref as ElementRef)
        : undefined
    );
    let escapeOwner: ManagedOverlayPanelProps | undefined;
    const close = (reason: OverlayCloseReason, owner = props.control) => {
      if (!owner.open || !owner.isCurrent()) return;
      escapeOwner = reason === "escape" ? owner : undefined;
      owner.onClose(reason);
      void nextTick(() => {
        escapeOwner = undefined;
      });
    };
    const keydown = (event: KeyboardEvent, owner = props.control) => {
      if (
        !owner.open ||
        !owner.isCurrent() ||
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing
      )
        return;
      const target = event.target;
      const dialog =
        target instanceof Element ? target.closest('[role="dialog"]') : null;
      if (dialog && dialog !== panel()?.closest('[role="dialog"]')) return;
      event.preventDefault();
      event.stopPropagation();
      close("escape", owner);
    };
    onMounted(() => {
      mounted.value = true;
    });
    watch(
      [mounted, () => props.control],
      ([ready, owner], _previous, cleanup) => {
        const anchor = owner.anchor;
        if (!ready || !owner.open || !owner.isCurrent() || !anchor) return;
        const view = anchor.ownerDocument.defaultView;
        if (!view) return;
        const place = () => {
          if (!owner.isCurrent()) return;
          const rect = anchor.getBoundingClientRect();
          const width =
            panel()?.offsetWidth ??
            Math.min(
              26 *
                Number.parseFloat(
                  view.getComputedStyle(anchor.ownerDocument.documentElement)
                    .fontSize
                ),
              view.innerWidth - 16
            );
          const rtl = owner.attrs.dir === "rtl";
          position.value = {
            x: rtl
              ? Math.max(width + 8, Math.min(rect.right, view.innerWidth - 8))
              : Math.max(8, Math.min(rect.left, view.innerWidth - width - 8)),
            y: rect.bottom,
            maxHeight: Math.max(
              0,
              Math.min(
                560,
                Math.max(rect.top, view.innerHeight - rect.bottom) - 8
              )
            ),
          };
        };
        place();
        const document = anchor.ownerDocument;
        const keyboard = (event: KeyboardEvent) => keydown(event, owner);
        document.addEventListener("keydown", keyboard);
        view.addEventListener("resize", place);
        view.addEventListener("scroll", place, true);
        const observer = view.ResizeObserver
          ? new view.ResizeObserver(place)
          : undefined;
        observer?.observe(anchor);
        cleanup(() => {
          document.removeEventListener("keydown", keyboard);
          view.removeEventListener("resize", place);
          view.removeEventListener("scroll", place, true);
          observer?.disconnect();
        });
      },
      { flush: "post" }
    );
    watch(
      [card, () => props.control.open],
      () => {
        const owner = props.control;
        if (!owner.open) acquiredFocus = false;
        const element = panel();
        if (!owner.open || !owner.isCurrent() || !element || acquiredFocus)
          return;
        const focused = element.ownerDocument.activeElement;
        if (focused !== owner.anchor && focused !== element.ownerDocument.body)
          return;
        const search = element.querySelector<HTMLElement>(
          'input[data-adapttable-part="column-menu-search"]'
        );
        const first = element.querySelector<HTMLElement>(
          "button:not([disabled]), input:not([disabled])"
        );
        (search ?? first ?? element).focus({ preventScroll: true });
        acquiredFocus = true;
      },
      { flush: "post" }
    );
    onBeforeUnmount(() => {
      const owner = escapeOwner;
      const element = panel();
      if (
        !owner?.isCurrent() ||
        !element?.contains(element.ownerDocument.activeElement)
      )
        return;
      const anchor = owner.anchor;
      const document = element.ownerDocument;
      void nextTick(() => {
        if (
          owner.isCurrent() &&
          anchor?.isConnected &&
          (document.activeElement === document.body ||
            element.contains(document.activeElement))
        )
          anchor.focus({ preventScroll: true });
      });
    });
    return () => {
      const owner = props.control;
      if (!mounted.value || !owner.anchor || !position.value) return null;
      return h(
        NPopover,
        {
          trigger: "manual",
          show: owner.open && owner.isCurrent(),
          x: position.value.x,
          y: position.value.y,
          to: owner.container ?? undefined,
          placement: owner.attrs.dir === "rtl" ? "bottom-end" : "bottom-start",
          showArrow: false,
          raw: true,
          onClickoutside: (event: MouseEvent) => {
            if (
              !(event.target instanceof Node) ||
              !owner.anchor?.contains(event.target)
            )
              close("outside", owner);
          },
        },
        {
          default: () =>
            h(
              NCard,
              mergeProps(withoutAttributes(owner.attrs, ["ref"]), {
                ref: card,
                size: "small",
                tabindex: -1,
                class: "adapttable-naive-column-surface",
                style: {
                  width: "26rem",
                  boxSizing: "border-box",
                  maxWidth: "calc(100vw - 16px)",
                  maxHeight: `${String(position.value?.maxHeight ?? 0)}px`,
                  overflow: "auto",
                },
                onKeydown: (event: KeyboardEvent) => keydown(event, owner),
              }),
              { default: () => owner.content }
            ),
        }
      );
    };
  },
  { name: "NaiveManagedPopover", inheritAttrs: false, props: ["control"] }
);
