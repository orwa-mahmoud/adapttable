import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  SAVED_VIEWS_CONTROL,
  savedViews as bindingSavedViews,
  SavedViewsMenuChrome,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type UseSavedViewsOptions,
} from "@adapttable/vue/saved-views";
import { defineComponent, h, type MaybeRefOrGetter } from "vue";

import {
  nativeSavedViewsMenuSlots,
  nativeSavedViewsPanelSlots,
} from "./viewControls/nativeControls";

export type {
  SavedView,
  SavedViewsStore,
  UseSavedViewsOptions,
} from "@adapttable/vue/saved-views";
export type SavedViewsPanelProps = Omit<SavedViewsPanelChromeProps, "slots">;

/** Native management surface over the binding's rename and ordering model. */
export const SavedViewsPanel = defineComponent(
  (props: SavedViewsPanelProps) => () =>
    h(SavedViewsPanelChrome, { ...props, slots: nativeSavedViewsPanelSlots }),
  {
    name: "SavedViewsPanel",
    props: [
      "views",
      "onApply",
      "onRename",
      "onMove",
      "onSetDefault",
      "onRemove",
      "labels",
      "footer",
      "className",
    ],
  }
);

/** The table creates the saved-view model once; this fill only renders it. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: nativeSavedViewsMenuSlots })
    ),
  ]);
}
