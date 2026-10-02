/**
 * Collapsible column groups — `@adapttable/angular-unstyled/column-groups`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  collapsibleColumnGroups as bindingCollapsibleColumnGroups,
  COLUMN_GROUP_TOGGLE,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { AdaptColumnGroupToggle } from "@adapttable/angular-unstyled";

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
