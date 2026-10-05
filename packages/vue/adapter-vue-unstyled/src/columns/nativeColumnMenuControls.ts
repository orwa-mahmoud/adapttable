import type {
  ColumnMenuButtonProps,
  ColumnMenuSlots,
} from "@adapttable/vue/column-menu";
import { h, mergeProps, type VNode } from "vue";

import { NativeColumnMenuPanel } from "./NativeColumnMenuPanel";

function button({ attrs, label, icon }: ColumnMenuButtonProps): VNode {
  const icons = {
    grip: "⠿",
    visible: "◉",
    hidden: "○",
    pin: "⌖",
    more: "⋯",
    rename: "✎",
  };
  return h(
    "button",
    attrs,
    icon ? [h("span", { "aria-hidden": true }, icons[icon])] : label
  );
}
/** Native controls forward every semantic attribute to its actual element. */
export const nativeColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) =>
    h(
      "input",
      mergeProps(attrs, {
        value,
        onInput: (event: Event): void => {
          const target = event.currentTarget;
          if (target instanceof HTMLInputElement) onChange(target.value);
        },
      })
    ),
  Choice: ({ attrs, value, options, onChange }) =>
    h(
      "select",
      mergeProps(attrs, {
        value,
        onChange: (event: Event): void => {
          const target = event.currentTarget;
          if (!(target instanceof HTMLSelectElement)) return;
          onChange(target.value);
          target.value = value;
        },
      }),
      options.map((option) =>
        h(
          "option",
          {
            key: option.value,
            value: option.value,
            selected: option.value === value,
          },
          option.label
        )
      )
    ),
  Panel: (control) => h(NativeColumnMenuPanel, { control }),
};
