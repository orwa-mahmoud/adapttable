import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { naiveButton } from "../controls/button";

export const NaiveHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: ({ label, attrs }) => naiveButton(attrs, label) },
      });
  },
  {
    name: "NaiveHistoryButtons",
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
