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
  naiveSavedViewsMenuSlots,
  naiveSavedViewsPanelSlots,
} from "./views/controls";

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

/** Naive management surface over the binding's rename and ordering model. */
export const SavedViewsPanel = /*#__PURE__*/ defineComponent(
  (props: SavedViewsPanelProps) => {
    const slots = naiveSavedViewsPanelSlots(() => props.classNames ?? {});
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

/** The table creates the saved-view model once; this fill only renders it. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: naiveSavedViewsMenuSlots })
    ),
  ]);
}
