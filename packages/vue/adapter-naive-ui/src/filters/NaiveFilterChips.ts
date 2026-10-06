import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { naiveButton } from "../controls/button";

export const NaiveFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => naiveButton(attrs, "×", { text: true }),
          Clear: ({ attrs, label }) => naiveButton(attrs, label),
        },
      });
  },
  { name: "NaiveFilterChips", props: ["chips", "labels", "onClearAll"] }
);
