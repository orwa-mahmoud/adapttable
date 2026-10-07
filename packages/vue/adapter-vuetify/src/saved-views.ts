import type { StaticTableFeature, UseSavedViewsOptions } from "@adapttable/vue";
import {
  extendFeature,
  SAVED_VIEWS_CONTROL,
  SavedViewsMenuChrome,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  slotRender,
} from "@adapttable/vue/adapter";
import { savedViews as bindingSavedViews } from "@adapttable/vue/features";
import { type FunctionalComponent, h, type MaybeRefOrGetter } from "vue";

import type { DataTableClassNames } from "./types";
import {
  vuetifySavedViewsMenuSlots,
  vuetifySavedViewsPanelSlots,
} from "./views/savedViewControls";

export type { DataTableClassNames } from "./types";
export type {
  SavedView,
  SavedViewsStore,
  UseSavedViewsOptions,
} from "@adapttable/vue";
export interface SavedViewsPanelProps extends Omit<
  SavedViewsPanelChromeProps,
  "slots"
> {
  readonly classNames?: DataTableClassNames;
}

/** Vuetify presentation over the binding's controlled management panel. */
export const SavedViewsPanel: FunctionalComponent<SavedViewsPanelProps> = (
  props
) => {
  const { classNames, ...panelProps } = props;
  return h(SavedViewsPanelChrome, {
    ...panelProps,
    className: [props.className, classNames?.viewsPanel]
      .filter(Boolean)
      .join(" "),
    slots: vuetifySavedViewsPanelSlots(() => props.classNames ?? {}),
  });
};

/** The binding creates and retires the model; this feature fills its controls. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: vuetifySavedViewsMenuSlots })
    ),
  ]);
}
