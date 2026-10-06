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
import { rekaSavedMenuSlots, rekaSavedPanelSlots } from "./views/controls";

export interface SavedViewsPanelProps extends Omit<
  SavedViewsPanelChromeProps,
  "slots"
> {
  readonly classNames?: DataTableClassNames;
}
export const SavedViewsPanel = defineComponent(
  (props: SavedViewsPanelProps) => {
    const slots = rekaSavedPanelSlots(() => props.classNames ?? {});
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

export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: rekaSavedMenuSlots })
    ),
  ]);
}
export type {
  SavedView,
  SavedViewsStore,
  UseSavedViewsOptions,
} from "@adapttable/vue";
