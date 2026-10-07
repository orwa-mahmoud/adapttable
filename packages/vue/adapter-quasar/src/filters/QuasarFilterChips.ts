import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

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
  { name: "QuasarFilterChips", props: ["chips", "labels", "onClearAll"] }
);
