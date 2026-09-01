import {
  extendFeature,
  SAVED_VIEWS,
  slotRender,
  type StaticTableFeature,
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
export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsMenu {...props} />),
  ]);
}
