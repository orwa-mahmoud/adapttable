import { FindBarChrome, type FindBarProps } from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";
import { vuetifyButton } from "../controls";
import VuetifyInput from "../controls/VuetifyInput.vue";

export const VuetifyFindBar = defineComponent(
  (props: FindBarProps) => {
    const names = useClassNames();
    return () =>
      FindBarChrome({
        ...props,
        slots: {
          Search: (control) =>
            h(VuetifyInput, {
              attrs: {
                "aria-label": control.label,
                placeholder: control.placeholder,
                "data-adapttable-part": "find-input",
                class: names.value.findInput,
                ref: control.focusRef,
                onKeydown: control.onKeyDown,
              },
              type: "search",
              value: control.value,
              onChange: control.onChange,
            }),
          Button: (control) =>
            vuetifyButton(
              {
                "aria-label": control.label,
                "data-adapttable-part": control.part,
                class: names.value.findButton,
                disabled: control.disabled,
                onClick: control.onClick,
              },
              control.label
            ),
        },
      });
  },
  { props: ["find", "labels", "className"] }
);
