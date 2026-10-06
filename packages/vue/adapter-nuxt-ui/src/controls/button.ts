import {
  type ActionButton,
  toVueAttrs,
  type ViewControlButtonProps,
} from "@adapttable/vue/adapter";
import UButton from "@nuxt/ui/components/Button.vue";
import { h, type VNode } from "vue";

export function nuxtButton(
  control: ViewControlButtonProps | ActionButton
): VNode {
  return h(
    UButton,
    {
      type: "button",
      color: "neutral",
      variant: "outline",
      ...toVueAttrs(control.attrs),
    },
    () => ["icon" in control ? control.icon : null, control.label]
  );
}
