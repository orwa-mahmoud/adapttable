/**
 * The Columns menu — `@adapttable/spartan/column-menu`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import {
  COLUMN_MENU,
  type ColumnMenuOptions,
  coreColumnMenu,
} from "@adapttable/angular/adapter";
import { COLUMN_MENU_ENTRY } from "@adapttable/angular/toolbar";
import { AdaptColumnMenu } from "@adapttable/spartan";

/**
 * The Columns menu: show, hide, reorder, pin, rename and auto-size columns,
 * drawn with a native button and popover.
 *
 * @public
 */
export function columnMenu(options?: ColumnMenuOptions): AdaptTableFeature {
  return extendFeature(coreColumnMenu(options), [
    COLUMN_MENU_ENTRY,
    slotRender(COLUMN_MENU, () => AdaptColumnMenu),
  ]);
}
