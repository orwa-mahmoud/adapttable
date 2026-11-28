import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { AntdLoadingState } from "./AntdLoadingState";
import AntdInput from "./controls/AntdInput.vue";
import AntdSelect from "./controls/AntdSelect.vue";
import { antdButton } from "./controls/button";
import { antdIcon } from "./controls/icon";
import { AntdDesktopTable } from "./presentation/AntdDesktopTable";
import { AntdMobileCards } from "./presentation/AntdMobileCards";

/** Kit-owned renderers over the binding's optional outer assembly. */
export function antdSurfaceControls<TRow>(
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
          antdIcon(
            {
              "aria-hidden": "true",
              "data-adapttable-part": "search-icon",
              class: classNames.searchIcon,
            },
            h(
              "svg",
              {
                viewBox: "0 0 24 24",
                width: "1em",
                height: "1em",
                fill: "none",
                stroke: "currentColor",
              },
              [
                h("circle", { cx: 10, cy: 10, r: 6 }),
                h("path", { d: "m15 15 5 5" }),
              ]
            )
          ),
          h(AntdInput, {
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
      h(AntdSelect, { ...attrs, value, options, onChange }),
    Button: ({ attrs, content }) => antdButton(attrs, content),
    Loading: (props) => h(AntdLoadingState, props),
    Desktop: (props) => h(AntdDesktopTable<TRow>, { ...props, controls }),
    Mobile: (props) => h(AntdMobileCards<TRow>, { ...props, controls }),
  };
}
