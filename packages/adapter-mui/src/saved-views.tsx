import {
  extendFeature,
  SAVED_VIEWS,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/core/features";

import { SavedViewsMenu } from "./components/SavedViewsMenu";

/**
 * Named snapshots of the table's URL state, drawn with MUI's own menu.
 *
 * The menu calls `useSavedViews`; a table that never imports this entry
 * never carries that hook.
 *
 * @public
 */
export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsMenu {...props} />),
  ]);
}
