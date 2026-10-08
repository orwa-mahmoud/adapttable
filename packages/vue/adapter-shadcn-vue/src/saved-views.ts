import type { StaticTableFeature, UseSavedViewsOptions } from "@adapttable/vue";
import {
  type DataTableClassNames,
  extendFeature,
  SAVED_VIEWS_CONTROL,
  type SavedViewsControlProps,
  SavedViewsMenuChrome,
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  slotRender,
} from "@adapttable/vue/adapter";
import { savedViews as bindingSavedViews } from "@adapttable/vue/features";
import { defineComponent, h, type MaybeRefOrGetter } from "vue";

import {
  shadcnSavedPanelSlots,
  useShadcnSavedMenuSlots,
} from "./views/controls";

export interface SavedViewsPanelProps extends Omit<
  SavedViewsPanelChromeProps,
  "slots"
> {
  readonly classNames?: DataTableClassNames;
}
export const SavedViewsPanel = defineComponent(
  (props: SavedViewsPanelProps) => {
    const slots = shadcnSavedPanelSlots(() => props.classNames ?? {});
    return () =>
      h(SavedViewsPanelChrome, {
        ...props,
        className: [props.className, props.classNames?.viewsPanel]
          .filter(Boolean)
          .join(" "),
        slots,
      });
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

const SavedViewsControl = defineComponent(
  (props: SavedViewsControlProps) => {
    const slots = useShadcnSavedMenuSlots();
    return () => h(SavedViewsMenuChrome, { ...props, slots });
  },
  {
    name: "ShadcnSavedViewsControl",
    props: ["savedViews", "labels", "dir", "container", "classNames"],
  }
);

export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsControl, { ...props })
    ),
  ]);
}
export type {
  SavedView,
  SavedViewsStore,
  UseSavedViewsOptions,
} from "@adapttable/vue";
export type { DataTableClassNames } from "@adapttable/vue/adapter";
