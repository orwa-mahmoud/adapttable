import {
  extendFeature,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/core/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/core/features";

import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: Readonly<SavedViewsSlotProps>) {
  return <SavedViewsMenu {...props} />;
}

/**
 * Named snapshots of the table's URL state, drawn with Base UI's own menu.
 *
 * The menu calls `useSavedViews`; a table that never imports this entry
 * never carries that hook.
 *
 * @public
 */
export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
