import {
  HistoryButtonsChrome,
  type UndoRedoControlProps,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";

export const ElementHistoryButtons = defineComponent(
  (props: UndoRedoControlProps) => {
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
