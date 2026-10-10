import { type StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import { naiveButton } from "./controls/button";
import { NaiveFindBar } from "./navigation/controls";
export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(NaiveFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            naiveButton(
              {
                type: "button",
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
