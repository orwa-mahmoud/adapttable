import type { RowReorderControlSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton } from "../controls/basic";
import { HeadlessMoveMenu } from "./MoveMenu";

export const headlessReorderControls: RowReorderControlSlots = {
  Handle: ({
    label,
    pressed,
    dragging,
    disabled,
    dragProps,
    onKeyDown,
    className,
  }) =>
    headlessButton(
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
      "↕"
    ),
  Button: ({ label, part, disabled, onClick, className }) =>
    headlessButton(
      {
        "aria-label": label,
        "data-adapttable-part": part,
        class: className,
        disabled,
        onClick,
      },
      label
    ),
  Menu: (props) => h(HeadlessMoveMenu, props),
};
