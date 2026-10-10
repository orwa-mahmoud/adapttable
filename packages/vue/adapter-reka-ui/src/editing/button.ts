import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { mergeProps, type VNodeChild } from "vue";

import { rekaButton } from "../controls/basic";

export function rekaEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return rekaButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
