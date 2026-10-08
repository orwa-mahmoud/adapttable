import type { RowReorderControlSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import { NuxtRowMoveMenu } from "./NuxtRowMoveMenu";

export const nuxtReorderControls: RowReorderControlSlots = {
  Handle: ({
    label,
    pressed,
    dragging,
    disabled,
    dragProps,
    onKeyDown,
    className,
  }) =>
    h(
      NuxtButton,
      {
        attrs: {
          "aria-label": label,
          "aria-pressed": pressed,
          "data-dragging": dragging ? "" : undefined,
          "data-adapttable-part": "row-reorder-handle",
          "data-adapttable-grip": "",
          class: className,
          disabled,
          draggable: dragProps.draggable,
          onDragstart: (event: DragEvent) => {
            if (event.dataTransfer)
              dragProps.onDragStart({
                dataTransfer: event.dataTransfer,
                clientY: event.clientY,
                currentTarget:
                  event.currentTarget instanceof HTMLElement
                    ? event.currentTarget
                    : null,
                preventDefault: () => event.preventDefault(),
              });
          },
          onDragend: dragProps.onDragEnd,
          onKeydown: (event: KeyboardEvent) =>
            onKeyDown({
              key: event.key,
              currentTarget:
                event.currentTarget instanceof HTMLElement
                  ? event.currentTarget
                  : null,
              preventDefault: () => event.preventDefault(),
            }),
        },
      },
      () => h("span", { "aria-hidden": true }, "↕")
    ),
  Button: ({ label, part, disabled, onClick, className }) =>
    h(
      NuxtButton,
      {
        attrs: {
          "aria-label": label,
          "data-adapttable-part": part,
          class: className,
          disabled,
          onClick,
        },
      },
      () => label
    ),
  Menu: (props) => h(NuxtRowMoveMenu, props),
};
