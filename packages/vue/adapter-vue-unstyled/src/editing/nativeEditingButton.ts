import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { h, mergeProps, type VNodeChild } from "vue";

export function nativeEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return h(
    "button",
    mergeProps(control.attrs, {
      type: "button",
      class: className,
      onClick: control.onClick,
    }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
