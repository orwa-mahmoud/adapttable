import { FindBarChrome, type FindBarProps } from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";

export const ElementFindBar = defineComponent(
  (props: FindBarProps) => {
    const names = useClassNames();
    return () =>
      FindBarChrome({
        ...props,
        slots: {
          Search: (control) =>
            h(ElementInput, {
              type: "search",
              value: control.value,
              "aria-label": control.label,
              placeholder: control.placeholder,
              class: [
                "adapttable-element-plus-find-input",
                names.value.findInput,
              ],
              "data-adapttable-part": "find-input",
              inputRef: control.focusRef,
              onChange: control.onChange,
              onKeydown: control.onKeyDown,
            }),
          Button: (control) =>
            elementButton(
              {
                type: "button",
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
  {
    name: "ElementFindBar",
    props: {
      find: { type: Object as PropType<FindBarProps["find"]> },
      labels: { type: Object as PropType<FindBarProps["labels"]> },
      className: { type: String as PropType<FindBarProps["className"]> },
    },
  }
);
