import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

import { useHeadlessClasses } from "../context";
import { headlessButton } from "../controls/basic";

export const HeadlessFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useHeadlessClasses();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) => headlessButton(attrs, "×"),
          Clear: ({ attrs, label }) => headlessButton(attrs, label),
        },
      });
  },
  {
    name: "HeadlessFilterChips",
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
