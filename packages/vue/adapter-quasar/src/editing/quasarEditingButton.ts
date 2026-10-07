import {
  type EditingActionButtonProps,
  mergeVueAttrs,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
export function quasarEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return h(
    QuasarButton,
    {
      attrs: mergeVueAttrs(control.attrs, {
        class: className,
        onClick: control.onClick,
      }),
    },
    () => [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
