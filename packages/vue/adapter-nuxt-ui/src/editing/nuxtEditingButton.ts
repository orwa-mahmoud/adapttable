import {
  type EditingActionButtonProps,
  mergeVueAttrs,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
export function nuxtEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return h(
    NuxtButton,
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
