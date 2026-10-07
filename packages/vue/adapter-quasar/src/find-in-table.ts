import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import QuasarButton from "./controls/QuasarButton.vue";
import { QuasarFindBar } from "./navigation/QuasarFindBar";

export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(QuasarFindBar, { ...props })),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            h(QuasarButton, {
              label: control.label,
              attrs: {
                "aria-label": control.label,
                "data-adapttable-part": "find-button",
                class: control.className,
                onClick: control.onClick,
              },
            })
          ),
        ]
      : []),
  ]);
}
export { QuasarFindBar as FindBar } from "./navigation/QuasarFindBar";
export type { FindBarProps } from "@adapttable/vue/adapter";
