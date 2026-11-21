/**
 * The column-layout family — `@adapttable/ng-zorro/column-layout`.
 *
 * Its own entry, so a table that imports one member alone loads that member
 * alone.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import { columnLayoutFamilyList } from "@adapttable/angular/adapter";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { fitColumns } from "@adapttable/ng-zorro/fit-columns";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";

/**
 * All of column layout — the columns menu, resizing and fitting — with this
 * kit's controls, passed to `features` as one entry.
 *
 * @public
 */
export function columnLayoutFamily(): readonly AdaptTableFeature[] {
  return columnLayoutFamilyList({ columnMenu, resizableColumns, fitColumns });
}
