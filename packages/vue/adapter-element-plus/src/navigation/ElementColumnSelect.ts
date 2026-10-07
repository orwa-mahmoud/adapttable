import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import ElementCheckbox from "../controls/ElementCheckbox.vue";

export const ElementColumnSelect = defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h(ElementCheckbox, {
            checked: control.checked,
            label: control.label,
            onChange: control.onToggle,
          }),
      },
    }),
  {
    name: "ElementColumnSelect",
    props: ["label", "checked", "onToggle", "className"],
  }
);
