import type { Attrs, ColumnGroupToggleProps } from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { h } from "vue";

import { rekaButton } from "./controls/basic";
import { rekaTarget } from "./controls/target";

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

/** Reka delegates column resizing to a semantic primitive and the binding's handlers. */
export function rekaResizeHandle({ attrs }: { readonly attrs: Attrs }) {
  return rekaTarget(Primitive, {
    ...attrs,
    as: "span",
    class: ["at-reka-resize-handle", attrs.class],
  });
}
