import {
  extendFeature,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/core/features";

import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: SavedViewsSlotProps) {
  return <SavedViewsMenu {...props} />;
}

export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
