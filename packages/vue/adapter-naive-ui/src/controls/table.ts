import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { naiveButton } from "./button";
import { naiveCheckbox } from "./checkbox";

/** Required table controls are Naive components; structure remains in Chrome. */
export function naiveTableControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  | "SortButton"
  | "SelectionCheckbox"
  | "ColumnGroupToggle"
  | "ResizeHandle"
  | "TreeToggle"
  | "RowDetailToggle"
> {
  const icon = (expanded: boolean) =>
    h("span", { "aria-hidden": "true" }, expanded ? "−" : "+");
  return {
    SortButton: ({ attrs, content }) => naiveButton(attrs, content),
    SelectionCheckbox: naiveCheckbox,
    ColumnGroupToggle: (props) =>
      ColumnGroupToggleChrome({
        ...props,
        slots: {
          Button: ({ label, expanded, className, onClick }) =>
            naiveButton(
              {
                "data-adapttable-part": "column-group-toggle",
                "aria-expanded": expanded,
                "aria-label": label,
                title: label,
                class: className,
                onClick,
              },
              icon(expanded)
            ),
        },
      }),
    ResizeHandle: ({ attrs }) =>
      naiveButton(attrs, null, { tag: "span", text: true }),
    TreeToggle: ({ attrs, expanded, loading }) =>
      naiveButton(
        attrs,
        loading ? h("span", { "aria-hidden": "true" }, "…") : icon(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      naiveButton(attrs, icon(expanded)),
  };
}
