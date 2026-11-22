/**
 * The Columns menu — `@adapttable/ng-zorro/column-menu`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { COLUMN_MENU, coreColumnMenu } from "@adapttable/angular/adapter";
import { COLUMN_MENU_ENTRY } from "@adapttable/angular/toolbar";
import { AdaptColumnMenu } from "@adapttable/ng-zorro";

/**
 * The Columns menu: show, hide, reorder, pin, rename and auto-size columns,
 * drawn with a NG-ZORRO button and popover.
 *
 * @public
 */
export function columnMenu(): AdaptTableFeature {
  return extendFeature(coreColumnMenu(), [
    COLUMN_MENU_ENTRY,
    slotRender(COLUMN_MENU, () => AdaptColumnMenu),
  ]);
}
