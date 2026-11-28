import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { mergeProps, type VNodeChild } from "vue";

import { headlessButton } from "../controls/basic";

export function headlessEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return headlessButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
