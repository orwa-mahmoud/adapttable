import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  COLUMN_HEADER_RENAME,
  COLUMN_MENU,
  ColumnHeaderRenameChrome,
  columnMenu as bindingColumnMenu,
} from "@adapttable/vue/column-menu";
import { h } from "vue";

import ColumnMenu from "../columns/ColumnMenu.vue";
import { nativeColumnMenuSlots } from "../columns/nativeColumnMenuControls";

/** Add the native Columns menu and direct header rename controls. */
export function columnMenu(): StaticTableFeature {
  return extendFeature(bindingColumnMenu(), [
    slotRender(COLUMN_MENU, (props) => h(ColumnMenu<never>, { ...props })),
    slotRender(COLUMN_HEADER_RENAME, (props) =>
      h(ColumnHeaderRenameChrome, { ...props, slots: nativeColumnMenuSlots })
    ),
  ]);
}
