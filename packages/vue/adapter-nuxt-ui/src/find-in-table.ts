import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import NuxtButton from "./controls/NuxtButton.vue";
import { NuxtFindBar } from "./navigation/nuxtNavigation";

export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(NuxtFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            h(
              NuxtButton,
              {
                attrs: {
                  "aria-label": control.label,
                  "data-adapttable-part": "find-button",
                  className: control.className,
                  onClick: control.onClick,
                },
              },
              () => control.label
            )
          ),
        ]
      : []),
  ]);
}
