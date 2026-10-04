import type { ToolbarExtrasSlotProps } from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";

export const NativeHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useClassNames();
    return () =>
      props.onUndo || props.onRedo
        ? h(
            "span",
            {
              "data-adapttable-part": "edit-history",
              class: names.value.editHistory,
            },
            [
              props.onUndo
                ? h(
                    "button",
                    {
                      type: "button",
                      class: names.value.undoButton,
                      "data-adapttable-part": "undo",
                      "aria-label": props.undoLabel,
                      disabled: !props.canUndo,
                      onClick: props.onUndo,
                    },
                    props.undoLabel
                  )
                : null,
              props.onRedo
                ? h(
                    "button",
                    {
                      type: "button",
                      class: names.value.redoButton,
                      "data-adapttable-part": "redo",
                      "aria-label": props.redoLabel,
                      disabled: !props.canRedo,
                      onClick: props.onRedo,
                    },
                    props.redoLabel
                  )
                : null,
            ]
          )
        : null;
  },
  {
    name: "NativeHistoryButtons",
    props: [
      "onUndo",
      "onRedo",
      "canUndo",
      "canRedo",
      "undoLabel",
      "redoLabel",
      "density",
      "onDensityChange",
      "labels",
      "classNames",
    ],
  }
);
