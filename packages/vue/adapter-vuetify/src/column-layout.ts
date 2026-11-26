/**
 * The column-layout family — `@adapttable/vuetify/column-layout`.
 *
 * Its own entry, so a table that imports one member alone loads that member
 * alone.
 */
import type { StaticTableFeature } from "@adapttable/vue";
import { columnLayoutFamilyList } from "@adapttable/vue/adapter";

import { columnMenu } from "./column-menu";
import { fitColumns } from "./fit-columns";
import { resizableColumns } from "./resizable-columns";

/**
 * All of column layout — the columns menu, resizing and fitting — with this
 * kit's controls, passed to `features` as one entry.
 *
 * @public
 */
export function columnLayoutFamily(): readonly StaticTableFeature[] {
  return columnLayoutFamilyList({ columnMenu, resizableColumns, fitColumns });
}
