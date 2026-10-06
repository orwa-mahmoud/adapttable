/**
 * Actions that run against the selected rows — `@adapttable/angular-material/bulk-actions`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  type BulkAction,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { BULK_BAR, coreBulkActions } from "@adapttable/angular/adapter";
import { AdaptBulkBar } from "@adapttable/angular-material";

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
