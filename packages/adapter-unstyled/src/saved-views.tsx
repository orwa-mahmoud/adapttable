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

import { useClassNames } from "./components/classNamesContext";
import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: Readonly<SavedViewsSlotProps>) {
  const classNames = useClassNames();
  return <SavedViewsMenu {...props} classNames={classNames} />;
}

export function savedViews(options: UseSavedViewsOptions): StaticTableFeature {
  return extendFeature(core(options), [
    slotRender(SAVED_VIEWS, (props) => <SavedViewsSlot {...props} />),
  ]);
}
