import {
  type AdaptTableFeature,
  type NestedTableFor,
  type Renderer,
  type RowDetailContext,
} from "@adapttable/angular";
import { coreNestedTable, coreRowDetail } from "@adapttable/core/binding";

/**
 * Render a panel under an expanded row.
 *
 * @param renderRowDetail - An `ng-template` or standalone component, handed
 *   the row.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function rowDetail<TRow>(
  renderRowDetail: Renderer<RowDetailContext<TRow>>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return coreRowDetail(renderRowDetail, defaultExpandedRowIds);
}

/**
 * Render the kit's own table inside a row's detail panel.
 *
 * @param nested - The nested table for a row, or nothing for a row without.
 * @param defaultExpandedRowIds - Rows whose panel starts open.
 * @returns The feature.
 *
 * @public
 */
export function nestedTable<TRow>(
  nested: NestedTableFor<TRow>,
  defaultExpandedRowIds?: readonly string[]
): AdaptTableFeature {
  return coreNestedTable(nested, defaultExpandedRowIds);
}
