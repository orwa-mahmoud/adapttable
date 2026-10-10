import type { ElementRef } from "@adapttable/vue";
import {
  type ManagedOverlayPanelProps,
  toVueAttrs,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UPopover from "@nuxt/ui/components/Popover.vue";
import { defineComponent, h, type PropType, shallowRef, useId } from "vue";

import { controlRef, withoutAttrs } from "./attrs";
import { useControlElementRef } from "./useControlElementRef";

export default defineComponent(
  (props: {
    readonly control: ManagedOverlayPanelProps;
    readonly className?: string;
    readonly onElement?: ElementRef<HTMLElement>;
  }) => {
    const active = useScopeActivity();
    const content = shallowRef<unknown>(null);
    const surfaceId = useId();
    let reason: "escape" | "outside" | undefined;
    let closingReason: "escape" | "outside" | undefined;
    let closing = false;
    const receive = (value: unknown) => {
      if (value !== null && value !== content.value) {
        closing = false;
        reason = undefined;
        closingReason = undefined;
      }
      content.value = value;
    };
    useControlElementRef(
      () => {
        let root = content.value;
        if (root && typeof root === "object" && "$el" in root) root = root.$el;
        if (
          typeof HTMLElement === "undefined" ||
          !(root instanceof HTMLElement)
        )
          return null;
        // The public Vue ref can expose a positioning wrapper. Resolve only
        // our own marker below that ref, without vendor selectors or mutation.
        const target =
          root.dataset.adapttableManagedSurface === surfaceId
            ? root
            : Array.from(
                root.querySelectorAll<HTMLElement>(
                  "[data-adapttable-managed-surface]"
                )
              ).find(
                (element) =>
                  element.dataset.adapttableManagedSurface === surfaceId
              );
        if (!target) return null;
        const role = props.control.attrs.role;
        return typeof role !== "string" || target.getAttribute("role") === role
          ? target
          : null;
      },
      () => [props.onElement, controlRef<HTMLElement>(props.control.attrs.ref)]
    );
    return () => {
      const control = props.control;
      if (!active.value || !control.open || !control.isCurrent()) return null;
      return h(
        UPopover,
        {
          open: control.open,
          reference: control.anchor ?? undefined,
          portal: control.container ?? true,
          content: {
            ...toVueAttrs({
              ...withoutAttrs(control.attrs, ["ref"]),
              ref: receive,
              "data-adapttable-managed-surface": surfaceId,
            }),
            align: "end",
            onEscapeKeyDown: () => {
              reason = "escape";
            },
            onInteractOutside: (
              event: CustomEvent<{ originalEvent: Event }>
            ) => {
              const target = event.detail.originalEvent.target;
              if (target instanceof Node && control.anchor?.contains(target)) {
                // The separately rendered binding trigger already owns its
                // toggle; pointer focus must not close and then reopen it.
                event.preventDefault();
                return;
              }
              reason = "outside";
            },
            onCloseAutoFocus: (event: Event) => {
              event.preventDefault();
              if (
                closing &&
                closingReason !== "outside" &&
                control.isCurrent() &&
                control.anchor?.isConnected
              )
                control.anchor.focus();
            },
          },
          ui: { content: ["adapttable-nuxt-managed-popover", props.className] },
          "onUpdate:open": (open: boolean) => {
            if (open || !active.value || !control.isCurrent()) return;
            closing = true;
            closingReason = reason;
            control.onClose(reason);
            reason = undefined;
          },
        },
        { content: () => control.content }
      );
    };
  },
  {
    name: "NuxtManagedPopover",
    inheritAttrs: false,
    props: {
      control: { type: Object as PropType<ManagedOverlayPanelProps> },
      className: { type: String as PropType<string | undefined> },
      onElement: {
        type: Function as PropType<ElementRef<HTMLElement> | undefined>,
      },
    },
  }
);
