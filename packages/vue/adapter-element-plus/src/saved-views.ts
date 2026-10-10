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
import { defineComponent, h, type MaybeRefOrGetter, type PropType } from "vue";

import type { DataTableClassNames } from "./types";
import {
  elementSavedViewsMenuSlots,
  elementSavedViewsPanelSlots,
} from "./views/elementSavedViewsControls";

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

/** Element Plus management surface over the binding's rename and ordering model. */
export const SavedViewsPanel = defineComponent(
  (props: SavedViewsPanelProps) => {
    const slots = elementSavedViewsPanelSlots(() => props.classNames ?? {});
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
    props: {
      views: { type: Array as PropType<SavedViewsPanelProps["views"]> },
      onApply: { type: Function as PropType<SavedViewsPanelProps["onApply"]> },
      onRename: {
        type: Function as PropType<SavedViewsPanelProps["onRename"]>,
      },
      onMove: { type: Function as PropType<SavedViewsPanelProps["onMove"]> },
      onSetDefault: {
        type: Function as PropType<SavedViewsPanelProps["onSetDefault"]>,
      },
      onRemove: {
        type: Function as PropType<SavedViewsPanelProps["onRemove"]>,
      },
      labels: { type: Object as PropType<SavedViewsPanelProps["labels"]> },
      footer: {
        type: [String, Number, Boolean, Array, Object] as PropType<
          SavedViewsPanelProps["footer"]
        >,
        default: undefined,
      },
      className: {
        type: String as PropType<SavedViewsPanelProps["className"]>,
      },
      classNames: {
        type: Object as PropType<SavedViewsPanelProps["classNames"]>,
      },
    },
  }
);

/** The table creates the saved-view model once; this fill only renders it. */
export function savedViews(
  options: MaybeRefOrGetter<UseSavedViewsOptions>
): StaticTableFeature {
  return extendFeature(bindingSavedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, (props) =>
      h(SavedViewsMenuChrome, { ...props, slots: elementSavedViewsMenuSlots })
    ),
  ]);
}
