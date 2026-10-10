import {
  type ActionButton,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";

import NuxtButton from "./NuxtButton.vue";

export function nuxtButton(
  control: ViewControlButtonProps | ActionButton
): VNode {
  return h(NuxtButton, { attrs: control.attrs }, () => [
    "icon" in control ? control.icon : null,
    control.label,
  ]);
}
