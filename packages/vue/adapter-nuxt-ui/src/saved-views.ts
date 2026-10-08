import type { StaticTableFeature, UseSavedViewsOptions } from "@adapttable/vue";
import {
  type DataTableClassNames,
  extendFeature,
  SAVED_VIEWS_CONTROL,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  slotRender,
} from "@adapttable/vue/adapter";
import { savedViews as bindingSavedViews } from "@adapttable/vue/features";
import { defineComponent, h, type MaybeRefOrGetter } from "vue";

import { nuxtSavedViewsPanelSlots } from "./viewControls/nuxtSavedViewsControls";
import NuxtSavedViewsMenu from "./viewControls/NuxtSavedViewsMenu.vue";

export type {
  SavedView,
  SavedViewsStore,
  UseSavedViewsOptions,
} from "@adapttable/vue";
export type { DataTableClassNames } from "@adapttable/vue/adapter";
export interface SavedViewsPanelProps extends Omit<
  SavedViewsPanelChromeProps,
  "slots"
> {
  readonly classNames?: DataTableClassNames;
}

/** Native Nuxt controls over the binding's rename and ordering model. */
export const SavedViewsPanel = /*#__PURE__*/ defineComponent(
  (props: SavedViewsPanelProps) => {
    const slots = nuxtSavedViewsPanelSlots(() => props.classNames ?? {});
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
      "classNames",
    ],
  }
);

/** The feature mounts the shared model once; Nuxt only fills its controls. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(NuxtSavedViewsMenu, { ...props })
    ),
  ]);
}
