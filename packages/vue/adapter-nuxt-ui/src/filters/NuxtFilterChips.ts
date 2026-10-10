import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

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
  {
    name: "NuxtFilterChips",
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
