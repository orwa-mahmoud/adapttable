import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FILL_HANDLE_CONTROL,
  FillHandleChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  cellNavigation as bindingNavigation,
  type CellNavigationOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { HeadlessPrimitive } from "./controls/primitive";

export function cellNavigation<TRow = unknown>(
  options: CellNavigationOptions<TRow> = {}
): StaticTableFeature {
  return extendFeature(bindingNavigation(options), [
    slotRender(FILL_HANDLE_CONTROL, (props) =>
      FillHandleChrome({
        ...props,
        slots: {
          Handle: (control) =>
            h(
              "span",
              {
                "data-adapttable-part": "fill-handle-anchor",
                style: { position: "relative", display: "block", height: 0 },
              },
              [
                h(HeadlessPrimitive, {
                  ...control.handleProps,
                  as: "span",
                  title: control.label,
                  "data-adapttable-part": "fill-handle",
                  class: ["at-headless-fill-handle", control.className],
                }),
              ]
            ),
        },
      })
    ),
  ]);
}
export { columnSelectionCheckbox } from "./column-selection";
export type { CellEdit, GridCell, GridFocusState } from "@adapttable/vue";
export type { CellRange } from "@adapttable/vue/adapter";
export type { CellNavigationOptions } from "@adapttable/vue/features";
