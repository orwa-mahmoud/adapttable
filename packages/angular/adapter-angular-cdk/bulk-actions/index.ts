/**
 * Actions that run against the selected rows — `@adapttable/angular-cdk/bulk-actions`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  BULK_BAR,
  type BulkAction,
  coreBulkActions,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { AdaptBulkBar } from "@adapttable/angular-cdk";

/**
 * Actions that run against the selected rows. Composing it makes the rows
 * selectable and shows the selection bar while any row is selected.
 *
 * @param actions - The bulk actions.
 *
 * @public
 */
export function bulkActions(actions: readonly BulkAction[]): AdaptTableFeature {
  return extendFeature(coreBulkActions(actions), [
    slotRender(BULK_BAR, () => AdaptBulkBar),
  ]);
}
