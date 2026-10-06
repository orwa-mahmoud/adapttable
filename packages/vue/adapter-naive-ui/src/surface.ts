import type { TableDensity } from "@adapttable/vue";
import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
import { NIcon } from "naive-ui";
import { h } from "vue";

import { naiveClassNames } from "./classNames";
import { naiveButton } from "./controls/button";
import { naiveInput } from "./controls/input";
import { naiveSelect } from "./controls/select";
import { naiveLoadingState } from "./NaiveLoadingState";
import { NaiveDesktopTable } from "./renderers/desktop";
import { NaiveMobileCards } from "./renderers/mobile";

/** This optional outer layout accepts the same kit renderers exposed for headless use. */
export function naiveSurfaceControls<TRow>(
  controls: TableChromeSlots<TRow>,
  density: TableDensity
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, value, onChange, classNames: names }) =>
      h(
        "div",
        { class: names.searchWrapper, "data-adapttable-part": "search-field" },
        [
          naiveInput({
            attrs,
            value,
            onChange,
            prefix: () =>
              h(
                NIcon,
                { "aria-hidden": "true" },
                {
                  default: () =>
                    h(
                      "svg",
                      {
                        "data-adapttable-part": "search-icon",
                        class: names.searchIcon,
                        viewBox: "0 0 24 24",
                        focusable: "false",
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
          }),
        ]
      ),
    Select: naiveSelect,
    Button: ({ attrs, content }) => naiveButton(attrs, content),
    Loading: naiveLoadingState,
    Desktop: ({ model, classNames }) =>
      h(NaiveDesktopTable<TRow>, {
        model,
        controls,
        classNames: naiveClassNames(classNames),
        density,
      }),
    Mobile: ({ model, classNames }) =>
      h(NaiveMobileCards<TRow>, {
        model,
        controls,
        classNames: naiveClassNames(classNames),
      }),
  };
}
