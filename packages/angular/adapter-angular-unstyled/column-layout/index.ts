/**
 * The column-layout family — `@adapttable/angular-unstyled/column-layout`.
 *
 * Its own entry, so a table that imports one member alone loads that member
 * alone.
 */
import type { AdaptTableFeature } from "@adapttable/angular";
import { columnLayoutFamilyList } from "@adapttable/angular/adapter";
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { fitColumns } from "@adapttable/angular-unstyled/fit-columns";
import { resizableColumns } from "@adapttable/angular-unstyled/resizable-columns";

/**
 * All of column layout — the columns menu, resizing and fitting — with this
 * kit's controls, passed to `features` as one entry.
 *
 * @public
 */
export function columnLayoutFamily(): readonly AdaptTableFeature[] {
  return columnLayoutFamilyList({ columnMenu, resizableColumns, fitColumns });
}
