/**
 * The Columns menu — `@adapttable/spartan/column-menu`.
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
import { AdaptColumnMenu } from "@adapttable/spartan";

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
