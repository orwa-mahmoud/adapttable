import type { EditingActionButtonProps } from "@adapttable/vue/adapter";
import { Fragment, h, mergeProps, type VNodeChild } from "vue";

import { vuetifyButton } from "../controls";

/** Binding controls own save/cancel/validation; this supplies the kit button. */
export function vuetifyEditingButton(
  control: EditingActionButtonProps,
  className?: string
) {
  return vuetifyButton(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    h(Fragment, [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ])
  );
}
