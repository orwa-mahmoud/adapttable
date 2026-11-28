import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";

export const AntdColumnSelect = defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h(AntdCheckbox, {
            checked: control.checked,
            label: control.label,
            onChange: control.onToggle,
          }),
      },
    }),
  {
    name: "AntdColumnSelect",
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
