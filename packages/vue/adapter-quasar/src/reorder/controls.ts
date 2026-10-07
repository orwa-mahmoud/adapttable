import type { RowReorderControlSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import { QuasarMoveMenu } from "./QuasarMoveMenu";

export const quasarReorderSlots: RowReorderControlSlots = {
  Handle: ({
    label,
    pressed,
    dragging,
    disabled,
    dragProps,
    onKeyDown,
    className,
  }) =>
    h(QuasarButton, {
      label: "↕",
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
        onKeydown: (event: KeyboardEvent) => {
          if (!event.defaultPrevented && !event.isComposing)
            onKeyDown({
              key: event.key,
              currentTarget:
                event.currentTarget instanceof HTMLElement
                  ? event.currentTarget
                  : null,
              preventDefault: () => event.preventDefault(),
            });
        },
      },
    }),
  Button: ({ label, part, disabled, onClick, className }) =>
    h(QuasarButton, {
      label,
      attrs: {
        "aria-label": label,
        "data-adapttable-part": part,
        class: className,
        disabled,
        onClick,
      },
    }),
  Menu: (control) => h(QuasarMoveMenu, { control }),
};
