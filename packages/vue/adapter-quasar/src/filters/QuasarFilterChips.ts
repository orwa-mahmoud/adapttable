import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
export const QuasarFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => h(QuasarButton, { attrs }, () => "×"),
          Clear: ({ attrs, label }) => h(QuasarButton, { attrs, label }),
        },
      });
  },
  {
    name: "QuasarFilterChips",
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
