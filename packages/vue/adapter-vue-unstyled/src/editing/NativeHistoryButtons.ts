import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

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
    props: {
      onUndo: { type: Function as PropType<ToolbarExtrasSlotProps["onUndo"]> },
      onRedo: { type: Function as PropType<ToolbarExtrasSlotProps["onRedo"]> },
      canUndo: {
        type: Boolean as PropType<ToolbarExtrasSlotProps["canUndo"]>,
        default: undefined,
      },
      canRedo: {
        type: Boolean as PropType<ToolbarExtrasSlotProps["canRedo"]>,
        default: undefined,
      },
      undoLabel: {
        type: String as PropType<ToolbarExtrasSlotProps["undoLabel"]>,
      },
      redoLabel: {
        type: String as PropType<ToolbarExtrasSlotProps["redoLabel"]>,
      },
      density: { type: String as PropType<ToolbarExtrasSlotProps["density"]> },
      onDensityChange: {
        type: Function as PropType<ToolbarExtrasSlotProps["onDensityChange"]>,
      },
      labels: { type: Object as PropType<ToolbarExtrasSlotProps["labels"]> },
      classNames: {
        type: Object as PropType<ToolbarExtrasSlotProps["classNames"]>,
      },
    },
  }
);
