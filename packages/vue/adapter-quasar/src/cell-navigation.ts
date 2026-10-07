import type { StaticTableFeature } from "@adapttable/vue";
import {
  COLUMN_SELECT,
  ColumnSelectCheckboxChrome,
  extendFeature,
  FILL_HANDLE_CONTROL,
  FillHandleChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  cellNavigation as bindingCellNavigation,
  type CellNavigationOptions,
  columnSelectionCheckbox as bindingColumnSelectionCheckbox,
} from "@adapttable/vue/features";
import { QBadge } from "quasar";
import { h } from "vue";

import { quasarAttrs } from "./controls/controlAttrs";
import QuasarCheckbox from "./controls/QuasarCheckbox.vue";

/** The binding owns navigation, range selection, fill requests and announcements. */
export function cellNavigation(
  options: CellNavigationOptions = {}
): StaticTableFeature {
  return extendFeature(bindingCellNavigation(options), [
    slotRender(FILL_HANDLE_CONTROL, (props) =>
      FillHandleChrome({
        ...props,
        slots: {
          Handle: ({ handleProps, label, className }) =>
            h(QBadge, {
              ...quasarAttrs(handleProps),
              color: "primary",
              rounded: false,
              "data-adapttable-part": "fill-handle",
              "aria-hidden": true,
              title: label,
              class: className,
              style: {
                position: "absolute",
                width: "8px",
                height: "8px",
                minHeight: "8px",
                padding: 0,
                insetInlineEnd: "-4px",
                bottom: "-4px",
                cursor: "crosshair",
                zIndex: 1,
              },
            }),
        },
      })
    ),
  ]);
}
export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(bindingColumnSelectionCheckbox(), [
    slotRender(COLUMN_SELECT, (props) =>
      ColumnSelectCheckboxChrome({
        ...props,
        slots: {
          Checkbox: ({ label, checked, onToggle }) =>
            h(QuasarCheckbox, {
              control: {
                attrs: { "aria-label": label },
                checked,
                onChange: onToggle,
              },
            }),
        },
      })
    ),
  ]);
}
export type { CellEdit, GridCell } from "@adapttable/vue";
export type { CellRange } from "@adapttable/vue/adapter";
export type { CellNavigationOptions } from "@adapttable/vue/features";
