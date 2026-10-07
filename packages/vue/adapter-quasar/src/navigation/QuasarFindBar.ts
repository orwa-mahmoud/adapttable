import {
  FindBarChrome,
  type FindBarChromeProps,
  type FindBarSlots,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarInput from "../controls/QuasarInput.vue";

export const QuasarFindBar = defineComponent(
  (props: Omit<FindBarChromeProps, "slots">) => {
    const names = useDataTableClassNames();
    const slots: FindBarSlots = {
      Search: (control) =>
        h(QuasarInput, {
          control: {
            label: control.label,
            value: control.value,
            type: "search",
            onChange: control.onChange,
            focusRef: control.focusRef,
            attrs: {
              placeholder: control.placeholder,
              class: names.value.findInput,
              "data-adapttable-part": "find-input",
              onKeydown: control.onKeyDown,
            },
          },
        }),
      Button: (control) =>
        h(QuasarButton, {
          label: control.label,
          attrs: {
            class: names.value.findButton,
            "aria-label": control.label,
            "data-adapttable-part": control.part,
            disabled: control.disabled,
            onClick: control.onClick,
          },
        }),
    };
    return () => FindBarChrome({ ...props, slots });
  },
  { name: "QuasarFindBar", props: ["find", "labels", "className"] }
);
