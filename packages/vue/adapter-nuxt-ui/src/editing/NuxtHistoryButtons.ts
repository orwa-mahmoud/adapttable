import {
  HistoryButtonsChrome,
  type UndoRedoControlProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

import { nuxtButton } from "../controls/button";
export const NuxtHistoryButtons = defineComponent(
  (props: UndoRedoControlProps) => {
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
    props: {
      onUndo: { type: Function as PropType<UndoRedoControlProps["onUndo"]> },
      onRedo: { type: Function as PropType<UndoRedoControlProps["onRedo"]> },
      canUndo: {
        type: Boolean as PropType<UndoRedoControlProps["canUndo"]>,
        default: undefined,
      },
      canRedo: {
        type: Boolean as PropType<UndoRedoControlProps["canRedo"]>,
        default: undefined,
      },
      undoLabel: {
        type: String as PropType<UndoRedoControlProps["undoLabel"]>,
      },
      redoLabel: {
        type: String as PropType<UndoRedoControlProps["redoLabel"]>,
      },
      labels: { type: Object as PropType<UndoRedoControlProps["labels"]> },
      classNames: {
        type: Object as PropType<UndoRedoControlProps["classNames"]>,
      },
    },
  }
);
