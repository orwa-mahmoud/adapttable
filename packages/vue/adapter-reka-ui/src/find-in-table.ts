import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import { rekaButton } from "./controls/basic";
import { RekaFindBar } from "./navigation/FindBar";

export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(RekaFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            rekaButton(
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
