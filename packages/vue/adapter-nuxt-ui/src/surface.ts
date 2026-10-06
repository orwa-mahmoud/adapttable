import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { withoutAttrs } from "./controls/attrs";
import NuxtButton from "./controls/NuxtButton.vue";
import NuxtInput from "./controls/NuxtInput.vue";
import NuxtSelect from "./controls/NuxtSelect.vue";
import { nuxtLoading } from "./table/loading";
import { NuxtDesktopTable, NuxtMobileCards } from "./table/renderers";

export function nuxtSurface<TRow>(
  table: TableChromeSlots<TRow>
): DataTableSurfaceSlots<TRow> {
  return {
    Search: ({ attrs, label, value, onChange, classNames }) => {
      const input = withoutAttrs(attrs, ["onInput", "class"]);
      return h(
        "div",
        {
          class: classNames.searchWrapper,
          "data-adapttable-part": "search-field",
        },
        [
          h(NuxtInput, {
            control: { attrs: input, label, value, onChange, type: "search" },
            className: classNames.searchInput,
          }),
        ]
      );
    },
    Select: (control) => h(NuxtSelect, { control }),
    Button: ({ attrs, content }) => h(NuxtButton, { attrs }, () => content),
    Loading: nuxtLoading,
    Desktop: (props) => h(NuxtDesktopTable<TRow>, { ...props, slots: table }),
    Mobile: (props) => h(NuxtMobileCards<TRow>, { ...props, slots: table }),
  };
}
