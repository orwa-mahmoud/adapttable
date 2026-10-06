import {
  type DataTableSurfaceSlots,
  DesktopTableChrome,
  type TableChromeSlots,
} from "@adapttable/vue/adapter";
import { Search } from "@lucide/vue";
import { h } from "vue";

import { shadcnInput, shadcnSelect } from "./controls";
import { ShadcnLoadingState } from "./LoadingState";
import { ShadcnMobileCards } from "./MobileCards";
import { shadcnAction } from "./tableControls";

export function shadcnSurfaceControls<TRow>(
  controls: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) =>
      h(
        "div",
        {
          class: classNames.searchWrapper,
          "data-adapttable-part": "search-field",
        },
        [
          h(Search, {
            class: classNames.searchIcon,
            "aria-hidden": true,
            "data-adapttable-part": "search-icon",
          }),
          shadcnInput({
            attrs: {
              ...Object.fromEntries(
                Object.entries(attrs).filter(
                  ([key]) => !["value", "onInput", "type"].includes(key)
                )
              ),
              type: "search",
              "aria-label": label,
            },
            value,
            onChange,
          }),
        ]
      ),
    Select: shadcnSelect,
    Button: ({ attrs, content }) => shadcnAction(attrs, content),
    Loading: (props) => h(ShadcnLoadingState, props),
    Desktop: ({ model, classNames }) =>
      DesktopTableChrome({ model, slots: controls, classNames }),
    Mobile: (props) => h(ShadcnMobileCards<TRow>, { ...props, controls }),
  };
}
