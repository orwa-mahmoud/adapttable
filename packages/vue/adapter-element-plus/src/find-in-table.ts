import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FIND_BAR,
  FIND_BUTTON,
  slotRender,
} from "@adapttable/vue/adapter";
import { findInTable as bindingFindInTable } from "@adapttable/vue/features";
import { h } from "vue";

import { elementButton } from "./controls/button";
import { ElementFindBar } from "./navigation/ElementFindBar";

/** Find the prepared table rows, with an optional Element Plus toolbar button. */
export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(ElementFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            elementButton(
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
