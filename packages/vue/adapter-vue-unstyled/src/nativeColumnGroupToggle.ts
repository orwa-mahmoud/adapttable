import {
  ColumnGroupToggleChrome,
  type ColumnGroupToggleProps,
} from "@adapttable/vue/adapter";
import { h, type VNode } from "vue";

/** Native button semantics supply Enter/Space activation without a second handler. */
export function nativeColumnGroupToggle(props: ColumnGroupToggleProps): VNode {
  return ColumnGroupToggleChrome({
    ...props,
    slots: {
      Button: ({ label, expanded, className, onClick }) =>
        h(
          "button",
          {
            type: "button",
            "data-adapttable-part": "column-group-toggle",
            "aria-expanded": expanded,
            "aria-label": label,
            title: label,
            class: className,
            onClick,
          },
          [h("span", { "aria-hidden": "true" }, expanded ? "−" : "+")]
        ),
    },
  });
}
