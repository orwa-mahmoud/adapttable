import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";
import { VIcon } from "vuetify/components/VIcon";
import { VProgressCircular } from "vuetify/components/VProgressCircular";

import { vuetifyButton, vuetifySelectionCheckbox } from "./controls";

function expandIcon(expanded: boolean) {
  return h(VIcon, {
    icon: [expanded ? "M5 11h14v2H5z" : "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"],
    size: 18,
    "aria-hidden": "true",
  });
}

/** All actions and attributes come from the binding's table Chrome. */
export function vuetifyTableControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  | "SortButton"
  | "SelectionCheckbox"
  | "ColumnGroupToggle"
  | "TreeToggle"
  | "RowDetailToggle"
> {
  return {
    SortButton: ({ attrs, content }) => vuetifyButton(attrs, content),
    SelectionCheckbox: vuetifySelectionCheckbox,
    ColumnGroupToggle: (props) =>
      ColumnGroupToggleChrome({
        ...props,
        slots: {
          Button: ({ label, expanded, className, onClick }) =>
            vuetifyButton(
              {
                type: "button",
                "data-adapttable-part": "column-group-toggle",
                "aria-label": label,
                "aria-expanded": expanded,
                title: label,
                class: className,
                onClick,
              },
              expandIcon(expanded)
            ),
        },
      }),
    TreeToggle: ({ attrs, expanded, loading }) =>
      vuetifyButton(
        attrs,
        loading
          ? h(VProgressCircular, {
              indeterminate: true,
              size: 18,
              width: 2,
              "aria-hidden": "true",
            })
          : expandIcon(expanded)
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      vuetifyButton(attrs, expandIcon(expanded)),
  };
}
