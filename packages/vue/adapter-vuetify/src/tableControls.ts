import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Fragment, h } from "vue";
import { VDivider } from "vuetify/components/VDivider";
import { VIcon } from "vuetify/components/VIcon";
import { VProgressCircular } from "vuetify/components/VProgressCircular";

import { vuetifyButton, vuetifySelectionCheckbox } from "./controls";
import { VuetifySurface } from "./table/VuetifySurface";

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
  | "ResizeHandle"
> {
  return {
    SortButton: ({ attrs, content, context }) =>
      vuetifyButton(
        attrs,
        h(Fragment, [
          content,
          h(VIcon, {
            icon: context.sortDir === "desc" ? "$sortDesc" : "$sortAsc",
            size: 16,
            "aria-hidden": "true",
            style: { opacity: context.sortDir ? 1 : 0.45 },
          }),
        ])
      ),
    SelectionCheckbox: vuetifySelectionCheckbox,
    ResizeHandle: ({ attrs }) =>
      h(VuetifySurface, {
        component: VDivider,
        attrs: {
          ...attrs,
          vertical: true,
          class: ["adapttable-vuetify-resize-handle", attrs.class],
        },
      }),
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
