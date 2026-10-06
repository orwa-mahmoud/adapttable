/**
 * Named view snapshots — `@adapttable/ng-bootstrap/saved-views`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  type SavedViewsControllerOptions,
  slotRender,
} from "@adapttable/angular";
import { coreSavedViews, SAVED_VIEWS } from "@adapttable/angular/adapter";
import { AdaptSavedViewsMenu } from "@adapttable/ng-bootstrap";

export { AdaptSavedViewsPanel } from "@adapttable/ng-bootstrap";

/**
 * Named snapshots of the table's view — search, sort, filters, paging and
 * layout — from a toolbar menu. `AdaptSavedViewsPanel` is the card that
 * renames, reorders and deletes that same list.
 *
 * @param options - Where the views are kept: a storage key, and optionally
 *   a storage or a server store. The table supplies its URL backend.
 *
 * @public
 */
export function savedViews(
  options: SavedViewsControllerOptions
): AdaptTableFeature {
  return extendFeature(coreSavedViews(options), [
    slotRender(SAVED_VIEWS, () => AdaptSavedViewsMenu),
  ]);
}
