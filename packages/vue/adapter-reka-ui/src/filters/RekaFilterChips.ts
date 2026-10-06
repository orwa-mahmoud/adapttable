import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { defineComponent } from "vue";

import { useRekaClasses } from "../context";
import { rekaButton } from "../controls/basic";

export const RekaFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useRekaClasses();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => rekaButton(attrs, "×"),
          Clear: ({ attrs, label }) => rekaButton(attrs, label),
        },
      });
  },
  { name: "RekaFilterChips", props: ["chips", "labels", "onClearAll"] }
);
