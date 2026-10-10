import {
  type DataTableSurfaceSlots,
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Label } from "reka-ui";
import { h } from "vue";

import { rekaButton, rekaInput } from "./controls/basic";
import { rekaSelect } from "./controls/select";
import { RekaLoading } from "./RekaLoading";

/** Reka has no table/card widget: semantic Chrome renders both kit-owned fills. */
export function rekaSurfaceControls<TRow>(
  table: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) => {
      // The model callback replaces the Chrome native input listener exactly once.
      const inputAttrs = { ...attrs };
      delete inputAttrs.onInput;
      return h(
        Label,
        {
          "data-adapttable-part": "search-field",
          class: ["at-reka-search", classNames.searchWrapper],
        },
        {
          default: () => [
            h("span", { class: "at-reka-visually-hidden" }, label),
            h(
              "svg",
              {
                "data-adapttable-part": "search-icon",
                class: classNames.searchIcon,
                viewBox: "0 0 24 24",
                width: 16,
                height: 16,
                "aria-hidden": true,
                fill: "none",
                stroke: "currentColor",
              },
              [
                h("circle", { cx: 10, cy: 10, r: 6 }),
                h("path", { d: "m15 15 5 5" }),
              ]
            ),
            rekaInput({ attrs: inputAttrs, type: "search", value, onChange }),
          ],
        }
      );
    },
    Select: rekaSelect,
    Button: ({ attrs, content }) => rekaButton(attrs, content),
    Loading: (props) => h(RekaLoading, props),
    Desktop: (props) => h(DesktopTableChrome<TRow>, { ...props, slots: table }),
    Mobile: (props) => h(MobileCardsChrome<TRow>, { ...props, slots: table }),
  };
}
