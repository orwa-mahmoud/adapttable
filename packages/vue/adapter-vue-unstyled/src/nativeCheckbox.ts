import type { Attrs } from "@adapttable/vue/adapter";
import { h, mergeProps, type VNode } from "vue";

/** Restore a native toggle when its controlled request is rejected by the host. */
export function nativeCheckbox(attrs: Attrs): VNode {
  return h(
    "input",
    mergeProps(attrs, {
      onChange: (event: Event): void => {
        const target = event.currentTarget;
        if (target instanceof HTMLInputElement) {
          target.checked = attrs.checked === true;
          target.indeterminate = attrs.indeterminate === true;
        }
      },
    })
  );
}
