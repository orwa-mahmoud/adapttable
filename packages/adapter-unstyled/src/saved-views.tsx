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
import { useClassNames } from "./components/classNamesContext";

import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: SavedViewsSlotProps) {
  const classNames = useClassNames();
  return <SavedViewsMenu {...props} classNames={classNames} />;
}

export function savedViews<TRow>(
  options: UseSavedViewsOptions
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
