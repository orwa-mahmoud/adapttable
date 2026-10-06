import {
  FillHandleChrome,
  type FillHandleChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, mergeProps } from "vue";
import { VSheet } from "vuetify/components/VSheet";

import { VuetifySurface } from "../table/VuetifySurface";

export const VuetifyFillHandle = defineComponent(
  (props: Omit<FillHandleChromeProps, "slots">) => () =>
    FillHandleChrome({
      ...props,
      slots: {
        Handle: (control) =>
          h(
            "span",
            {
              "data-adapttable-part": "fill-handle-anchor",
            },
            [
              h(VuetifySurface, {
                component: VSheet,
                attrs: mergeProps(control.handleProps, {
                  tag: "span",
                  color: "primary",
                  "data-adapttable-part": "fill-handle",
                  "aria-hidden": "true",
                  title: control.label,
                  class: control.className,
                }),
              }),
            ]
          ),
      },
    }),
  { props: ["focus", "windowIndex", "col", "firstRowIndex", "className"] }
);
