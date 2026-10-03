import {
  type AdaptTableFeature,
  coreSavedViews,
  extendFeature,
  SAVED_VIEWS,
  type SavedViewsControllerOptions,
  slotRender,
} from "@adapttable/angular";
import {
  AdaptSavedViewsMenu,
  AdaptSavedViewsPanel,
} from "@adapttable/taiga-ui";

/**
 * Named view snapshots — `@adapttable/taiga-ui/saved-views`.
 *
 * @packageDocumentation
 */

export { AdaptSavedViewsPanel };

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
