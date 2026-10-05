import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/filters";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";

export const NativeFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => h("button", attrs, "×"),
          Clear: ({ attrs, label }) => h("button", attrs, label),
        },
      });
  },
  { name: "NativeFilterChips", props: ["chips", "labels", "onClearAll"] }
);
