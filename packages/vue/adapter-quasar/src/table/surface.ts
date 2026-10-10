import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
import { QIcon } from "quasar";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";
import { QuasarDesktop } from "./desktop";
import { quasarLoading } from "./loading";
import { QuasarMobile } from "./mobile";

/** Optional ready-to-assemble surface; consumers can use the headless binding alone. */
export function quasarSurfaceControls<TRow>(
  controls: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) =>
      h(
        "div",
        {
          "data-adapttable-part": "search-field",
          class: classNames.searchWrapper,
        },
        [
          h(
            QIcon,
            {
              "aria-hidden": "true",
              "data-adapttable-part": "search-icon",
              class: classNames.searchIcon,
              size: "20px",
            },
            {
              default: () =>
                h(
                  "svg",
                  {
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    "stroke-width": 2,
                    "stroke-linecap": "round",
                  },
                  [
                    h("circle", { cx: 10, cy: 10, r: 6 }),
                    h("path", { d: "m15 15 5 5" }),
                  ]
                ),
            }
          ),
          h(QuasarInput, {
            control: {
              attrs: Object.fromEntries(
                Object.entries(attrs).filter(([key]) => key !== "onInput")
              ),
              label,
              value,
              type: "search",
              onChange,
            },
          }),
        ]
      ),
    Select: (control) => h(QuasarSelect, { control }),
    Button: ({ attrs, content }) =>
      h(QuasarButton, { attrs }, { default: () => content }),
    Loading: quasarLoading,
    Desktop: (props) => QuasarDesktop({ ...props, slots: controls }),
    Mobile: (props) => QuasarMobile({ ...props, slots: controls }),
  };
}
