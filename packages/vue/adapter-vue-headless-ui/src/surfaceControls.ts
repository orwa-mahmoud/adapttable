import {
  type DataTableSurfaceSlots,
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton, headlessInput } from "./controls/basic";
import { HeadlessLabel } from "./controls/primitive";
import { headlessSelect } from "./controls/select";
import { HeadlessLoading } from "./HeadlessLoading";

/** Headless has no table/card widget: semantic Chrome renders both kit-owned fills. */
export function headlessSurfaceControls<TRow>(
  table: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) => {
      // The model callback replaces the Chrome native input listener exactly once.
      const inputAttrs = { ...attrs };
      delete inputAttrs.onInput;
      return h(
        HeadlessLabel,
        {
          "data-adapttable-part": "search-field",
          class: ["at-headless-search", classNames.searchWrapper],
        },
        {
          default: () => [
            h("span", { class: "at-headless-visually-hidden" }, label),
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
            headlessInput({
              attrs: inputAttrs,
              type: "search",
              value,
              onChange,
            }),
          ],
        }
      );
    },
    Select: headlessSelect,
    Button: ({ attrs, content }) => headlessButton(attrs, content),
    Loading: (props) => h(HeadlessLoading, props),
    Desktop: (props) => h(DesktopTableChrome<TRow>, { ...props, slots: table }),
    Mobile: (props) => h(MobileCardsChrome<TRow>, { ...props, slots: table }),
  };
}
