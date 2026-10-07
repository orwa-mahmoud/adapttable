import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
export const QuasarHistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: (control) => h(QuasarButton, { ...control }) },
      });
  },
  {
    name: "QuasarHistoryButtons",
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
