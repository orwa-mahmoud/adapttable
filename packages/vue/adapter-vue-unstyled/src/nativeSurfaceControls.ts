import {
  type DataTableSurfaceSlots,
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { NativeLoadingState } from "./NativeLoadingState";

const liveStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

/** Native HTML is the Unstyled kit's required paint. */
export function nativeSurfaceControls<TRow>(
  table: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, classNames }) =>
      h(
        "label",
        {
          "data-adapttable-part": "search-field",
          class: classNames.searchWrapper,
        },
        [
          h("span", { style: liveStyle }, label),
          h(
            "svg",
            {
              "data-adapttable-part": "search-icon",
              class: classNames.searchIcon,
              viewBox: "0 0 24 24",
              width: "16",
              height: "16",
              "aria-hidden": "true",
              focusable: "false",
              fill: "none",
              stroke: "currentColor",
            },
            [
              h("circle", { cx: "10", cy: "10", r: "6" }),
              h("path", { d: "m15 15 5 5" }),
            ]
          ),
          h("input", attrs),
        ]
      ),
    Select: ({ attrs, value, options, onChange }) =>
      h(
        "select",
        {
          ...attrs,
          value,
          onChange: (event: Event) => {
            if (event.target instanceof HTMLSelectElement)
              onChange(event.target.value);
          },
        },
        options.map((option) =>
          h("option", { key: option.value, value: option.value }, option.label)
        )
      ),
    Button: ({ attrs, content }) => h("button", attrs, [content]),
    Loading: (props) => h(NativeLoadingState, props),
    Desktop: (props) => h(DesktopTableChrome<TRow>, { ...props, slots: table }),
    Mobile: (props) => h(MobileCardsChrome<TRow>, { ...props, slots: table }),
  };
}
