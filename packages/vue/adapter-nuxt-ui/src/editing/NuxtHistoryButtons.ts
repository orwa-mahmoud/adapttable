import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { nuxtButton } from "../controls/button";
export const NuxtHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: nuxtButton },
      });
  },
  {
    name: "NuxtHistoryButtons",
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
