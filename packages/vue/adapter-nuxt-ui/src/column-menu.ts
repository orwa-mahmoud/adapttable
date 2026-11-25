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
import { nuxtColumnMenuSlots } from "./columns/nuxtColumnMenuSlots";

/** Nuxt controls for the binding-owned column layout and rename lifecycle. */
export function columnMenu(options?: ColumnMenuOptions): StaticTableFeature {
  return extendFeature(bindingColumnMenu(options), [
    slotRender(COLUMN_MENU, (props) => h(ColumnMenu<never>, { ...props })),
    slotRender(COLUMN_HEADER_RENAME, (props) =>
      h(ColumnHeaderRenameChrome, { ...props, slots: nuxtColumnMenuSlots })
    ),
  ]);
}
export { default as ColumnMenu } from "./columns/ColumnMenu.vue";
export type { ColumnMenuSlotProps } from "@adapttable/vue/adapter";
