import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";

export const ElementHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: ({ label, attrs }) => elementButton(attrs, label) },
      });
  },
  {
    name: "ElementHistoryButtons",
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
