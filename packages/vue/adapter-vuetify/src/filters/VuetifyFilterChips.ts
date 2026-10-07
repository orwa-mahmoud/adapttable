import {
  type ActiveFilterChipsSlotProps,
  FilterChipsChrome,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";
import { VBtn } from "vuetify/components/VBtn";
import { VIcon } from "vuetify/components/VIcon";

import { useClassNames } from "../classNamesContext";
import { VuetifySurface } from "../table/VuetifySurface";

export const VuetifyFilterChips = defineComponent(
  (props: ActiveFilterChipsSlotProps) => {
    const names = useClassNames();
    return () =>
      FilterChipsChrome({
        ...props,
        classNames: names.value,
        slots: {
          Remove: ({ attrs }) =>
            h(
              VuetifySurface,
              {
                component: VBtn,
                attrs: {
                  ...attrs,
                  icon: true,
                  size: "x-small",
                  variant: "text",
                },
              },
              () => h(VIcon, { icon: "$close", size: 14, "aria-hidden": true })
            ),
          Clear: ({ attrs, label }) =>
            h(
              VuetifySurface,
              {
                component: VBtn,
                attrs: { ...attrs, size: "small", variant: "text" },
              },
              () => label
            ),
        },
      });
  },
  { name: "VuetifyFilterChips", props: ["chips", "labels", "onClearAll"] }
);
