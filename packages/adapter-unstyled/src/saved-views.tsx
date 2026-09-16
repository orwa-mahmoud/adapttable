import {
  extendFeature,
  SAVED_VIEWS,
  type SavedViewsSlotProps,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/react/adapter";
import {
  savedViews as core,
  type UseSavedViewsOptions,
} from "@adapttable/react/features";

import { useClassNames } from "./components/classNamesContext";
import { SavedViewsMenu } from "./components/SavedViewsMenu";

function SavedViewsSlot(props: Readonly<SavedViewsSlotProps>) {
  const classNames = useClassNames();
  return <SavedViewsMenu {...props} classNames={classNames} />;
}

/**
 * Named snapshots of the table's URL state, drawn with native controls menu.
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
