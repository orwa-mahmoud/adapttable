import type { StaticTableFeature } from "@adapttable/vue";
import {
  COLUMN_SELECT,
  ColumnSelectCheckboxChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { columnSelectionCheckbox as bindingColumnSelection } from "@adapttable/vue/features";

import { rekaCheckbox } from "./controls/checkbox";

export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(bindingColumnSelection(), [
    slotRender(COLUMN_SELECT, (props) =>
      ColumnSelectCheckboxChrome({
        ...props,
        slots: {
          Checkbox: (control) =>
            rekaCheckbox({
              attrs: { "aria-label": control.label },
              checked: control.checked,
              onChange: control.onToggle,
            }),
        },
      })
    ),
  ]);
}
export type { ColumnSelectCheckboxProps } from "@adapttable/vue/adapter";
