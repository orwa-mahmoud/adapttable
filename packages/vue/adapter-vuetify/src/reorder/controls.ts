import type { RowReorderControlSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import { vuetifyButton } from "../controls";
import { VuetifyMoveMenu } from "./VuetifyMoveMenu";

export const vuetifyReorderSlots: RowReorderControlSlots = {
  Handle: ({
    label,
    pressed,
    dragging,
    disabled,
    dragProps,
    onKeyDown,
    className,
  }) =>
    vuetifyButton(
      {
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
      "↕"
    ),
  Button: ({ label, part, disabled, onClick, className }) =>
    vuetifyButton(
      {
        "aria-label": label,
        "data-adapttable-part": part,
        class: className,
        disabled,
        onClick,
      },
      label
    ),
  Menu: (control) => h(VuetifyMoveMenu, { control }),
};
