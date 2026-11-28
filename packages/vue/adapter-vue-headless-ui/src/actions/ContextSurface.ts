import {
  type ContextMenuSlots,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Menu, MenuItems } from "@headlessui/vue";
import { defineComponent, h, nextTick, type PropType, shallowRef } from "vue";

import { elementOf, useDismissLayer, usePlacement } from "../controls/overlay";
import { headlessPortal } from "../controls/portal";

type Props = Parameters<ContextMenuSlots["Surface"]>[0] & {
  readonly dir: "ltr" | "rtl";
};

/**
 * The binding supplies the point as an anchor host. The items are a Headless
 * UI Menu list; the binding owns whether it is open, so the list is shown
 * statically and dismissed by the layer.
 */
export const HeadlessContextSurface = defineComponent(
  (props: Props) => {
    const active = useScopeActivity();
    const items = shallowRef<HTMLElement | null>(null);
    usePlacement(
      () => items.value,
      () => props.anchorRef.current,
      () => props.dir,
      "start"
    );
    useDismissLayer({
      open: () => active.value && props.anchorRef.current !== null,
      panel: () => items.value,
      anchor: () => null,
      onDismiss: () => props.onClose(),
    });
    // Headless UI stops Escape at the list, so the layer never sees it; the
    // binding owns closing.
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") props.onClose();
    };
    const capture = (component: unknown): void => {
      const element = elementOf(component);
      if (element && element !== items.value)
        void nextTick(() => element.focus({ preventScroll: true }));
      items.value = element;
    };
    const children = () => props.children;
    return () => {
      if (!active.value || !props.anchorRef.current) return null;
      return headlessPortal(
        () =>
          h(
            Menu,
            { as: "template" },
            {
              default: () =>
                h(
                  MenuItems,
                  {
                    static: true,
                    class: ["at-headless-menu", props.className],
                    dir: props.dir,
                    "data-adapttable-part": "context-menu",
                    "aria-label": props.label,
                    onKeydown,
                    ref: capture,
                  },
                  { default: children }
                ),
            }
          ),
        props.container ?? undefined
      );
    };
  },
  {
    name: "HeadlessContextSurface",
    props: {
      at: { type: Object as PropType<Props["at"]> },
      anchorRef: { type: Object as PropType<Props["anchorRef"]> },
      label: { type: String as PropType<Props["label"]> },
      onClose: { type: Function as PropType<Props["onClose"]> },
      container: { type: Object as PropType<Props["container"]> },
      children: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          Props["children"]
        >,
        default: undefined,
      },
      className: { type: String as PropType<Props["className"]> },
      dir: { type: String as PropType<Props["dir"]> },
    },
  }
);
