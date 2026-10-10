import {
  HistoryButtonsChrome,
  type ToolbarExtrasSlotProps,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

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
