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

import ColumnMenu from "./columns/ColumnMenu.vue";
import { headlessColumnMenuSlots } from "./columns/controls";

export function columnMenu(options?: ColumnMenuOptions): StaticTableFeature {
  return extendFeature(bindingColumnMenu(options), [
    slotRender(COLUMN_MENU, (props) => h(ColumnMenu<never>, { ...props })),
    slotRender(COLUMN_HEADER_RENAME, (props) =>
      h(ColumnHeaderRenameChrome, { ...props, slots: headlessColumnMenuSlots })
    ),
  ]);
}
export { default as ColumnMenu } from "./columns/ColumnMenu.vue";
export type { ColumnMenuSlotProps } from "@adapttable/vue/adapter";
