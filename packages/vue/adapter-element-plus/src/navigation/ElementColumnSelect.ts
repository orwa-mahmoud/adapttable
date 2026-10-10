import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

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
    props: {
      label: {
        type: String as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["label"]
        >,
      },
      checked: {
        type: Boolean as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["checked"]
        >,
        default: undefined,
      },
      onToggle: {
        type: Function as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["onToggle"]
        >,
      },
      className: {
        type: String as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["className"]
        >,
      },
    },
  }
);
