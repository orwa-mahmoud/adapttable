import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

import { useClassNames } from "../classNamesContext";
import { antdButton } from "../controls/button";

export const AntdFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) =>
            antdButton({ ...attrs, text: true, size: "small" }, "×"),
          Clear: ({ attrs, label }) =>
            antdButton({ ...attrs, text: true, size: "small" }, label),
        },
      });
  },
  {
    name: "AntdFilterChips",
    props: {
      chips: { type: Array as PropType<ActiveFilterChipsSlotProps["chips"]> },
      labels: {
        type: Object as PropType<ActiveFilterChipsSlotProps["labels"]>,
      },
      onClearAll: {
        type: Function as PropType<ActiveFilterChipsSlotProps["onClearAll"]>,
      },
    },
  }
);
