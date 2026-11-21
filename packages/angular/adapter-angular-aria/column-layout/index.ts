/**
 * The column-layout family — `@adapttable/angular-aria/column-layout`.
 *
 * Its own entry, so a table that imports one member alone loads that member
 * alone.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import { columnLayoutFamilyList } from "@adapttable/angular/adapter";
import { columnMenu } from "@adapttable/angular-aria/column-menu";
import { fitColumns } from "@adapttable/angular-aria/fit-columns";
import { resizableColumns } from "@adapttable/angular-aria/resizable-columns";

/**
 * All of column layout — the columns menu, resizing and fitting — with this
 * kit's controls, passed to `features` as one entry.
 *
 * @public
 */
export function columnLayoutFamily(): readonly AdaptTableFeature[] {
  return columnLayoutFamilyList({ columnMenu, resizableColumns, fitColumns });
}
