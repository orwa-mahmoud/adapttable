import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { mergeProps, type VNodeChild } from "vue";

import { elementButton } from "../controls/button";

export function elementEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return elementButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
