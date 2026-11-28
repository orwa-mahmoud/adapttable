import type { Attrs, ColumnGroupToggleProps } from "@adapttable/vue";
import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton } from "./controls/basic";
import { HeadlessPrimitive } from "./controls/primitive";
import { headlessTarget } from "./controls/target";

const glyph = (expanded: boolean) =>
  h("span", { "aria-hidden": true }, expanded ? "−" : "+");

export function headlessColumnGroupToggle(props: ColumnGroupToggleProps) {
  return ColumnGroupToggleChrome({
    ...props,
    slots: {
      Button: ({ label, expanded, className, onClick }) =>
        headlessButton(
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

export function headlessHierarchyControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  "TreeToggle" | "RowDetailToggle"
> {
  return {
    TreeToggle: ({ attrs, expanded, loading }) =>
      headlessButton(
        attrs,
        loading ? h("span", { "aria-hidden": true }, "…") : glyph(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      headlessButton(attrs, glyph(expanded)),
  };
}

/** Headless delegates column resizing to a semantic primitive and the binding's handlers. */
export function headlessResizeHandle({ attrs }: { readonly attrs: Attrs }) {
  return headlessTarget(HeadlessPrimitive, {
    ...attrs,
    as: "span",
    class: ["at-headless-resize-handle", attrs.class],
  });
}
