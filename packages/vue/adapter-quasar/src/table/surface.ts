import type {
  DataTableSurfaceSlots,
  TableChromeSlots,
} from "@adapttable/vue/adapter";
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
    Search: ({ attrs, label, value, onChange }) =>
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
    Select: (control) => h(QuasarSelect, { control }),
    Button: ({ attrs, content }) =>
      h(QuasarButton, { attrs }, { default: () => content }),
    Loading: quasarLoading,
    Desktop: (props) => QuasarDesktop({ ...props, slots: controls }),
    Mobile: (props) => QuasarMobile({ ...props, slots: controls }),
  };
}
