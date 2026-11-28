import type { ColumnGroupToggleProps } from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { antdButton } from "./controls/button";

const indicator = (expanded: boolean) =>
  h("span", { "aria-hidden": "true" }, expanded ? "−" : "+");
export function antdColumnGroupToggle(props: ColumnGroupToggleProps) {
  return ColumnGroupToggleChrome({
    ...props,
    slots: {
      Button: ({ label, expanded, className, onClick }) =>
        antdButton(
          {
            "data-adapttable-part": "column-group-toggle",
            "aria-expanded": expanded,
            "aria-label": label,
            title: label,
            class: className,
            onClick,
          },
          indicator(expanded)
        ),
    },
  });
}
export function antdHierarchyControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  "TreeToggle" | "RowDetailToggle"
> {
  return {
    TreeToggle: ({ attrs, expanded, loading }) =>
      antdButton(
        attrs,
        loading
          ? h("span", { "aria-hidden": "true" }, "…")
          : indicator(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      antdButton(attrs, indicator(expanded)),
  };
}
