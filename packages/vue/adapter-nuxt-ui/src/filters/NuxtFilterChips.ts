import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
export const NuxtFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => h(NuxtButton, { attrs }, () => "×"),
          Clear: ({ attrs, label }) => h(NuxtButton, { attrs }, () => label),
        },
      });
  },
  { name: "NuxtFilterChips", props: ["chips", "labels", "onClearAll"] }
);
