import {
  type CommandPaletteSurfaceProps,
  elementRef,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, shallowRef, type VNodeChild, watch } from "vue";
/** The native dialog joins the top layer, including within a native filter popover. */
export const NativePaletteSurface = defineComponent(
  (props: CommandPaletteSurfaceProps<VNodeChild>) => {
    const root = shallowRef<HTMLDialogElement | null>(null);
    const active = useScopeActivity();
    watch(
      [root, active],
      ([element, live], _previous, onCleanup) => {
        if (!element || !live) return;
        if (typeof element.showModal === "function") element.showModal();
        else element.setAttribute("open", "");
        onCleanup(() => {
          if (typeof element.close === "function" && element.open)
            element.close();
        });
      },
      { flush: "post" }
    );
    const cancel = (event: Event) => {
      event.preventDefault();
      if (active.value) props.onClose();
    };
    return () =>
      h(
        "dialog",
        {
          ref: elementRef<HTMLDialogElement>((element) => {
            root.value = element;
          }),
          role: "dialog",
          "aria-modal": true,
          "aria-label": props.label,
          "data-adapttable-part": "command-palette",
          class: props.className,
          onCancel: cancel,
          style: {
            position: "fixed",
            insetBlockStart: "12vh",
            insetBlockEnd: "auto",
            background: "Canvas",
            color: "CanvasText",
            padding: "1rem",
            maxWidth: "min(40rem,90vw)",
            width: "100%",
            maxHeight: "75vh",
            overflow: "auto",
            zIndex: 1000,
          },
        },
        [props.children]
      );
  },
  {
    name: "NativePaletteSurface",
    props: ["label", "onClose", "children", "className"],
  }
);
