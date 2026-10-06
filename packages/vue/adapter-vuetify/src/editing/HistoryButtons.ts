import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { useClassNames } from "../classNamesContext";
import { vuetifyButton } from "../controls";

export const VuetifyHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: ({ attrs, label }) => vuetifyButton(attrs, label) },
      });
  },
  {
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
