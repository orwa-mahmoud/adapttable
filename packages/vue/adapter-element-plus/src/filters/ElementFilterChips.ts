import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";

export const ElementFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => elementButton(attrs, "×"),
          Clear: ({ attrs, label }) => elementButton(attrs, label),
        },
      });
  },
  { name: "ElementFilterChips", props: ["chips", "labels", "onClearAll"] }
);
