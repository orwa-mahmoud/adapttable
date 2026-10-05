import type { ToolbarExtrasSlotProps } from "@adapttable/vue/adapter";
import { HistoryButtonsChrome } from "@adapttable/vue/editing";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";

export const NativeHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: ({ label, attrs }) => h("button", attrs, label) },
      });
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
