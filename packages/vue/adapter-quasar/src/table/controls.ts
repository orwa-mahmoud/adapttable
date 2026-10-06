import {
  ColumnGroupToggleChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { QSpinner } from "quasar";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import { part } from "./parts";

export function quasarTableControls<TRow>(): Pick<
  TableChromeSlots<TRow>,
  | "SortButton"
  | "SelectionCheckbox"
  | "ColumnGroupToggle"
  | "TreeToggle"
  | "RowDetailToggle"
  | "ResizeHandle"
> {
  const glyph = (expanded: boolean) =>
    h("span", { "aria-hidden": "true" }, expanded ? "−" : "+");
  return {
    SortButton: ({ attrs, content }) =>
      h(QuasarButton, { attrs }, { default: () => content }),
    SelectionCheckbox: (control) =>
      h(QuasarCheckbox, {
        control: { ...control, onChange: control.onToggle },
      }),
    ColumnGroupToggle: (props) =>
      ColumnGroupToggleChrome({
        ...props,
        slots: {
          Button: ({ label, expanded, className, onClick }) =>
            h(
              QuasarButton,
              {
                attrs: {
                  "data-adapttable-part": "column-group-toggle",
                  "aria-label": label,
                  "aria-expanded": expanded,
                  title: label,
                  class: className,
                  onClick,
                },
              },
              { default: () => glyph(expanded) }
            ),
        },
      }),
    TreeToggle: ({ attrs, expanded, loading }) =>
      h(
        QuasarButton,
        { attrs },
        {
          default: () =>
            loading
              ? h(QSpinner, { size: "1em", "aria-hidden": "true" })
              : glyph(expanded),
        }
      ),
    RowDetailToggle: ({ attrs, expanded }) =>
      h(QuasarButton, { attrs }, { default: () => glyph(expanded) }),
    ResizeHandle: ({ attrs }) =>
      part("separator", { ...attrs, vertical: true }),
  };
}
