import type { Attrs } from "@adapttable/vue";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue";
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  type PropType,
  shallowRef,
  watch,
} from "vue";

import { useHeadlessDirection } from "./direction";
import { closeList, elementOf, focusChoice, usePlacement } from "./overlay";
import { headlessPortal } from "./portal";
import { OpenSignal } from "./signal";
import { headlessTarget, singleHandlers } from "./target";

/** A Headless UI MenuItem rendered as a button, with the host's attrs on it. */
export function headlessMenuItem(
  attrs: Attrs,
  children: () => unknown,
  disabled?: boolean
) {
  return headlessTarget(
    MenuItem,
    mergeProps(attrs, {
      as: "button",
      type: "button",
      ...(disabled === undefined ? {} : { disabled }),
      class: "at-headless-menu-item",
    }),
    { default: children as never }
  );
}

/**
 * A Headless UI Menu: a trigger button and a floating list of items. Focus,
 * arrow keys, type-ahead, Escape and outside presses are Headless UI's; this
 * only places the list beside its trigger, in the table's portal.
 */
export const HeadlessMenu = defineComponent(
  (
    props: {
      readonly triggerAttrs: Attrs;
      readonly itemsAttrs?: Attrs;
      readonly dir?: "ltr" | "rtl";
      readonly onOpen?: (open: boolean) => void;
      /** A new value closes an open menu, as when its items or owner changed. */
      readonly epoch?: number;
    },
    { slots }
  ) => {
    const button = shallowRef<HTMLElement | null>(null);
    const items = shallowRef<HTMLElement | null>(null);
    const inheritedDir = useHeadlessDirection();
    const direction = () => props.dir ?? inheritedDir() ?? "ltr";
    const captureButton = (instance: unknown) => {
      button.value = elementOf(instance);
    };
    const captureItems = (instance: unknown) => {
      const element = elementOf(instance);
      if (element && element !== items.value)
        void nextTick(() =>
          focusChoice(element, '[role="menuitem"]:not([aria-disabled="true"])')
        );
      items.value = element;
    };
    watch(
      () => props.epoch,
      () => closeList(items.value, button.value),
      { flush: "post" }
    );
    usePlacement(
      () => items.value,
      () => button.value,
      direction
    );
    const listItems = () => slots.default?.();
    const list = () =>
      h(
        MenuItems,
        singleHandlers(
          mergeProps(props.itemsAttrs ?? {}, {
            class: "at-headless-menu",
            dir: direction(),
            ref: captureItems,
          })
        ),
        { default: listItems }
      );
    return () =>
      h(
        Menu,
        { as: "template" },
        {
          default: ({ open }: { open: boolean }) => [
            h(OpenSignal, { open, onOpen: props.onOpen }),
            h(
              MenuButton,
              singleHandlers(
                mergeProps(props.triggerAttrs, { ref: captureButton })
              ),
              { default: () => slots.trigger?.() }
            ),
            open ? headlessPortal(list) : null,
          ],
        }
      );
  },
  {
    name: "HeadlessMenu",
    inheritAttrs: false,
    props: {
      triggerAttrs: { type: Object as PropType<Attrs> },
      itemsAttrs: { type: Object as PropType<Attrs> },
      dir: { type: String as PropType<"ltr" | "rtl"> },
      onOpen: { type: Function as PropType<(open: boolean) => void> },
      epoch: { type: Number },
    },
  }
);
