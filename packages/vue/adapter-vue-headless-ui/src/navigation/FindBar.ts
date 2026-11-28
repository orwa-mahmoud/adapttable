import {
  FindBarChrome,
  type FindBarChromeProps,
  type FindBarSlots,
} from "@adapttable/vue/adapter";
import { defineComponent, type PropType } from "vue";

import { useHeadlessClasses } from "../context";
import { headlessButton, headlessInput } from "../controls/basic";

export const HeadlessFindBar = defineComponent(
  (props: Omit<FindBarChromeProps, "slots">) => {
    const names = useHeadlessClasses();
    const slots: FindBarSlots = {
      Search: (control) =>
        headlessInput({
          value: control.value,
          type: "search",
          onChange: control.onChange,
          attrs: {
            "aria-label": control.label,
            placeholder: control.placeholder,
            "data-adapttable-part": "find-input",
            class: names.value.findInput,
            ref: control.focusRef,
            onKeydown: control.onKeyDown,
          },
        }),
      Button: (control) =>
        headlessButton(
          {
            "aria-label": control.label,
            "data-adapttable-part": control.part,
            disabled: control.disabled,
            onClick: control.onClick,
            class: names.value.findButton,
          },
          control.label
        ),
    };
    return () => FindBarChrome({ ...props, slots });
  },
  {
    name: "HeadlessFindBar",
    props: {
      find: {
        type: Object as PropType<Omit<FindBarChromeProps, "slots">["find"]>,
      },
      labels: {
        type: Object as PropType<Omit<FindBarChromeProps, "slots">["labels"]>,
      },
      className: {
        type: String as PropType<
          Omit<FindBarChromeProps, "slots">["className"]
        >,
      },
    },
  }
);
