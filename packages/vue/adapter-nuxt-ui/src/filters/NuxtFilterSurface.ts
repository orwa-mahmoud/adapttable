import "./nuxtFilterSurface.css";

import {
  type FilterPanelSurfaceProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UPopover from "@nuxt/ui/components/Popover.vue";
import USlideover from "@nuxt/ui/components/Slideover.vue";
import { defineComponent, h, nextTick, watch } from "vue";

type Props = FilterPanelSurfaceProps & {
  readonly modal: boolean;
  readonly part?: string;
  /** Class for USlideover's overlay, through its `ui.overlay` hook. */
  readonly backdropClassName?: string;
};
export default defineComponent(
  (props: Props) => {
    const active = useScopeActivity();
    let reason: "escape" | "outside" | undefined;
    let closingReason: typeof reason;
    let lifetime = 0;
    watch(
      [active, () => props.open, () => props.anchor, () => props.onClose],
      ([enabled, open, anchor, owner], previous) => {
        if (!enabled || open || anchor !== previous[2] || owner !== previous[3])
          lifetime++;
        if (open) {
          reason = undefined;
          closingReason = undefined;
        }
      },
      { flush: "sync" }
    );
    const update = (open: boolean) => {
      if (!open && active.value && props.open) {
        closingReason = reason;
        props.onClose(reason);
      }
      reason = undefined;
    };
    return () => {
      if (!active.value) return null;
      const ticket = lifetime;
      const anchor = props.anchor;
      const owner = props.onClose;
      const content = {
        dir: props.dir,
        role: "dialog",
        "aria-label": props.label,
        "data-adapttable-part":
          props.part ?? (props.modal ? "filters-panel" : "filters-popover"),
        onEscapeKeyDown: () => {
          reason = "escape";
        },
        onInteractOutside: (event: CustomEvent<{ originalEvent: Event }>) => {
          const target = event.detail.originalEvent.target;
          if (target instanceof Node && props.anchor?.contains(target)) {
            event.preventDefault();
            return;
          }
          reason = "outside";
        },
        onCloseAutoFocus: (event: Event) => {
          // The trigger is external to UPopover/USlideover, so their native
          // teardown cannot restore it after releasing a modal focus trap.
          event.preventDefault();
          void nextTick(() => {
            if (
              ticket === lifetime &&
              active.value &&
              !props.open &&
              props.anchor === anchor &&
              props.onClose === owner &&
              closingReason !== "outside" &&
              anchor?.isConnected &&
              !anchor.closest('[hidden], [inert], [aria-hidden="true"]')
            )
              anchor.focus({ preventScroll: true });
          });
        },
      };
      const children = { content: () => props.children };
      if (props.modal)
        return h(
          USlideover,
          {
            open: props.open,
            title: props.label,
            side: props.dir === "rtl" ? "left" : "right",
            portal: props.container ?? true,
            content,
            transition: false,
            close: false,
            ui: {
              content: ["adapttable-nuxt-filter-drawer", props.className],
              overlay: props.backdropClassName,
            },
            "onUpdate:open": update,
          },
          children
        );
      return h(
        UPopover,
        {
          open: props.open,
          reference: props.anchor ?? undefined,
          portal: props.container ?? true,
          content: { ...content, align: "start" },
          ui: { content: ["adapttable-nuxt-filter-popover", props.className] },
          "onUpdate:open": update,
        },
        children
      );
    };
  },
  {
    name: "NuxtFilterSurface",
    inheritAttrs: false,
    props: [
      "open",
      "label",
      "dir",
      "anchor",
      "container",
      "children",
      "onClose",
      "className",
      "modal",
      "part",
      "backdropClassName",
    ],
  }
);
