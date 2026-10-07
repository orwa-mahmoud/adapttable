import type {
  ContextMenuChromeProps as NeutralProps,
  ContextMenuSlots as NeutralSlots,
} from "@adapttable/core/binding";
import { defineComponent, Fragment, h, nextTick, type VNodeChild } from "vue";

import { elementRef } from "../attrs";
import { useScopeActivity } from "../store";
export type ContextMenuSlots = NeutralSlots<VNodeChild>;
export type ContextMenuChromeProps = NeutralProps<VNodeChild>;
export const ContextMenuChrome = /*#__PURE__*/ defineComponent(
  (props: ContextMenuChromeProps) => {
    const active = useScopeActivity();
    const anchorRef: { current: HTMLElement | null } = { current: null };
    const select = (item: ContextMenuChromeProps["items"][number]) => {
      if (!active.value || item.disabled) return;
      props.onClose();
      void nextTick(() => {
        if (active.value) item.onSelect();
      });
    };
    return () => {
      for (const name of ["Surface", "Item", "Separator"] as const)
        if (typeof props.slots[name] !== "function")
          throw new Error(
            `AdaptTable: ContextMenuChrome requires the ${name} control slot.`
          );
      if (!active.value || !props.at || props.items.length === 0) return null;
      return h(Fragment, null, [
        h("span", {
          ref: elementRef<HTMLElement>((element) => {
            anchorRef.current = element;
          }),
          "aria-hidden": true,
          "data-adapttable-part": "context-menu-anchor",
          style: {
            position: "fixed",
            left: `${props.at.x}px`,
            top: `${props.at.y}px`,
            width: 0,
            height: 0,
            pointerEvents: "none",
          },
        }),
        props.slots.Surface({
          at: props.at,
          anchorRef,
          label: props.labels?.contextMenu ?? "Table actions",
          onClose: props.onClose,
          container: props.container,
          className: props.className,
          children: props.items.map((item) =>
            h(Fragment, { key: item.key }, [
              item.separatorBefore ? props.slots.Separator() : null,
              props.slots.Item({
                item,
                onSelect: () => select(item),
              }),
            ])
          ),
        }),
      ]);
    };
  },
  {
    name: "ContextMenuChrome",
    props: [
      "items",
      "at",
      "onClose",
      "labels",
      "className",
      "container",
      "slots",
    ],
  }
);
