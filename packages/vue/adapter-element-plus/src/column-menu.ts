import type { StaticTableFeature } from "@adapttable/vue";
import {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  ColumnHeaderRenameChrome,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import {
  columnMenu as bindingColumnMenu,
  type ColumnMenuOptions,
} from "@adapttable/vue/features";
import { h } from "vue";

import { ColumnMenu } from "./columns/ColumnMenu";
import { elementColumnMenuSlots } from "./columns/elementColumnMenuControls";

export function columnMenu(options?: ColumnMenuOptions): StaticTableFeature {
  return extendFeature(bindingColumnMenu(options), [
    slotRender(COLUMN_MENU, (props) => h(ColumnMenu<never>, { ...props })),
    slotRender(COLUMN_HEADER_RENAME, (props) =>
      h(ColumnHeaderRenameChrome, { ...props, slots: elementColumnMenuSlots })
    ),
  ]);
}
export { ColumnMenu } from "./columns/ColumnMenu";
export type { ColumnMenuSlotProps } from "@adapttable/vue/adapter";
