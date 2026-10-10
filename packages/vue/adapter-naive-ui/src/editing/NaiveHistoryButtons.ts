import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

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
