import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import { vuetifyButton } from "./controls";
import { VuetifyFindBar } from "./navigation/findBar";

export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(VuetifyFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            vuetifyButton(
              {
                "aria-label": control.label,
                "data-adapttable-part": "find-button",
                class: control.className,
                onClick: control.onClick,
              },
              control.label
            )
          ),
        ]
      : []),
  ]);
}
