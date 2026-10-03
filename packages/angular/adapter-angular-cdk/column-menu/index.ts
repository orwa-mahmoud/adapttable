/**
 * The Columns menu — `@adapttable/angular-cdk/column-menu`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  COLUMN_MENU,
  coreColumnMenu,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { AdaptColumnMenu } from "@adapttable/angular-cdk";

/**
 * The Columns menu: show, hide, reorder, pin, rename and auto-size columns,
 * drawn with a native button and popover.
 *
 * @public
 */
export function columnMenu(): AdaptTableFeature {
  return extendFeature(coreColumnMenu(), [
    slotRender(COLUMN_MENU, () => AdaptColumnMenu),
  ]);
}
