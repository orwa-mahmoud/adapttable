import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { mergeProps, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";

export function naiveEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return naiveButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
