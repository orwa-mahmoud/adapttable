import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

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
  {
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
