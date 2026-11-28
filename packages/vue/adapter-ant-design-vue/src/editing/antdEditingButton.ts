import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { mergeProps, type VNodeChild } from "vue";

import { antdButton } from "../controls/button";

export function antdEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return antdButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
