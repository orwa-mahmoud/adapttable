import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
import { ElIcon } from "element-plus";
import { h } from "vue";

import { elementButton } from "./controls/button";
import ElementInput from "./controls/ElementInput.vue";
import ElementSelect from "./controls/ElementSelect.vue";
import { ElementLoadingState } from "./ElementLoadingState";
import { ElementDesktopTable } from "./presentation/ElementDesktopTable";
import { ElementMobileCards } from "./presentation/ElementMobileCards";

/** Kit-owned renderers over the binding's optional outer assembly. */
export function elementSurfaceControls<TRow>(
  controls: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) => {
      const inputAttrs = Object.fromEntries(
        Object.entries(attrs).filter(
          ([key]) => !["value", "type", "onInput"].includes(key)
        )
      );
      return h(
        "div",
        {
          "data-adapttable-part": "search-field",
          class: classNames.searchWrapper,
        },
        [
          h(
            ElIcon,
            {
              "aria-hidden": "true",
              "data-adapttable-part": "search-icon",
              class: classNames.searchIcon,
            },
            {
              default: () =>
                h(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                  },
                  [
                    h("circle", { cx: 10, cy: 10, r: 6 }),
                    h("path", { d: "m15 15 5 5" }),
                  ]
                ),
            }
          ),
          h(ElementInput, {
            ...inputAttrs,
            type: "search",
            value,
            "aria-label": label,
            onChange,
          }),
        ]
      );
    },
    Select: ({ attrs, value, options, onChange }) =>
      h(ElementSelect, { ...attrs, value, options, onChange }),
    Button: ({ attrs, content }) => elementButton(attrs, content),
    Loading: (props) => h(ElementLoadingState, props),
    Desktop: (props) => h(ElementDesktopTable<TRow>, { ...props, controls }),
    Mobile: (props) => h(ElementMobileCards<TRow>, { ...props, controls }),
  };
}
