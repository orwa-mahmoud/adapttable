import {
  type ContextMenuSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  ContextMenuContent,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
} from "reka-ui";
import { defineComponent, h, Teleport } from "vue";

type Props = Parameters<ContextMenuSlots["Surface"]>[0] & {
  readonly dir: "ltr" | "rtl";
};

/** The binding supplies the anchor host; the documented trigger owns vendor positioning. */
export const RekaContextSurface = defineComponent(
  (props: Props) => {
    const active = useScopeActivity();
    const content = () =>
      h(
        ContextMenuContent,
        {
          class: ["at-reka-menu", props.className],
          "data-adapttable-part": "context-menu",
          "aria-label": props.label,
          collisionPadding: 8,
          // The binding closes before running an action and owns return focus.
          onCloseAutoFocus: (event: Event) => event.preventDefault(),
        },
        { default: () => props.children }
      );
    const trigger = () =>
      h(ContextMenuTrigger, {
        as: "span",
        "aria-hidden": true,
        tabindex: -1,
        style: {
          position: "absolute",
          inset: 0,
          width: 0,
          height: 0,
          pointerEvents: "none",
        },
      });
    return () => {
      const live = active.value;
      const anchor = props.anchorRef.current;
      if (!live || !anchor) return null;
      const point = props.at;
      const changed = (open: boolean) => {
        if (!open && active.value && props.at === point) props.onClose();
      };
      return h(
        ContextMenuRoot,
        {
          open: live,
          modal: false,
          dir: props.dir,
          "onUpdate:open": changed,
        },
        {
          default: () => [
            h(Teleport, { to: anchor }, [trigger()]),
            h(
              ContextMenuPortal,
              { to: props.container ?? "body" },
              { default: content }
            ),
          ],
        }
      );
    };
  },
  {
    name: "RekaContextSurface",
    props: [
      "at",
      "anchorRef",
      "label",
      "onClose",
      "container",
      "children",
      "className",
      "dir",
    ],
  }
);
