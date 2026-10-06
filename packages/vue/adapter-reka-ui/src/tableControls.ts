import type { ColumnGroupToggleProps } from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { rekaButton } from "./controls/basic";

const glyph = (expanded: boolean) =>
  h("span", { "aria-hidden": true }, expanded ? "−" : "+");

export function rekaColumnGroupToggle(props: ColumnGroupToggleProps) {
  return ColumnGroupToggleChrome({
    ...props,
    slots: {
      Button: ({ label, expanded, className, onClick }) =>
        rekaButton(
          {
            "data-adapttable-part": "column-group-toggle",
            "aria-expanded": expanded,
            "aria-label": label,
            title: label,
            class: className,
            onClick,
          },
          glyph(expanded)
        ),
    },
  });
}

export function rekaHierarchyControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  "TreeToggle" | "RowDetailToggle"
> {
  return {
    TreeToggle: ({ attrs, expanded, loading }) =>
      rekaButton(
        attrs,
        loading ? h("span", { "aria-hidden": true }, "…") : glyph(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      rekaButton(attrs, glyph(expanded)),
  };
}
