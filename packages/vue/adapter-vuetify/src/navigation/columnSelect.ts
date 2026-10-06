import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import VuetifyCheckbox from "../controls/VuetifyCheckbox.vue";

export const VuetifyColumnSelect = defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h(VuetifyCheckbox, {
            attrs: { "aria-label": control.label },
            checked: control.checked,
            onChange: control.onToggle,
          }),
      },
    }),
  { props: ["label", "checked", "onToggle", "className"] }
);
