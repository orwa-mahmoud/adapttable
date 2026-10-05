import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  FIND_BAR,
  FIND_BUTTON,
  findInTable as bindingFindInTable,
} from "@adapttable/vue/find-in-table";
import { h } from "vue";

import { NativeFindBar } from "./navigation/nativeNavigation";
export function findInTable(
  options: { readonly button?: boolean } = {}
): StaticTableFeature {
  return extendFeature(bindingFindInTable(), [
    slotRender(FIND_BAR, (props) => h(NativeFindBar, props)),
    ...(options.button
      ? [
          slotRender(FIND_BUTTON, (control) =>
            h(
              "button",
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
