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
import { defineComponent, h, type MaybeRefOrGetter } from "vue";

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
export const SavedViewsPanel = defineComponent(
  (props: SavedViewsPanelProps) => {
    // Keep the same presentation owner across parent styling and label updates.
    const slots = vuetifySavedViewsPanelSlots(() => props.classNames ?? {});
    return () => {
      const { classNames, ...panelProps } = props;
      return h(SavedViewsPanelChrome, {
        ...panelProps,
        className: [props.className, classNames?.viewsPanel]
          .filter(Boolean)
          .join(" "),
        slots,
      });
    };
  },
  {
    name: "VuetifySavedViewsPanel",
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
      "classNames",
    ],
  }
);

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
