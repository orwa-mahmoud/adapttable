/**
 * Collapsible column groups — `@adapttable/ngx-bootstrap/column-groups`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { COLUMN_GROUP_TOGGLE } from "@adapttable/angular/adapter";
import { collapsibleColumnGroups as bindingCollapsibleColumnGroups } from "@adapttable/angular/features";
import { AdaptColumnGroupToggle } from "@adapttable/ngx-bootstrap";

export type { ColumnGroup, ColumnInput } from "@adapttable/angular";

/**
 * Let a column group collapse to one column, with a native button on its
 * header cell. Declare groups in `columns` —
 * `{ header: "Place", collapsedKey: "country", children: [...] }`.
 *
 * @returns The feature.
 *
 * @public
 */
export function collapsibleColumnGroups(): AdaptTableFeature {
  return extendFeature(bindingCollapsibleColumnGroups(), [
    slotRender(COLUMN_GROUP_TOGGLE, () => AdaptColumnGroupToggle),
  ]);
}
