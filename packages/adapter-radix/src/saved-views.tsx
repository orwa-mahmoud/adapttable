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

export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
