import { elementRef, useFeatureState } from "@adapttable/vue/adapter";
import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
} from "@adapttable/vue/filters";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";
import { NativeFilterField } from "./NativeFilterField";
import { NativeFilterSurface } from "./NativeFilterSurface";
import { NativeFilterTree } from "./NativeFilterTree";

export const NativeFiltersPanel = defineComponent({
  name: "NativeFiltersPanel",
  setup() {
    const names = useClassNames();
    const model = useFeatureState(filterViewKey<unknown>());
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (trigger) =>
        h(
          "button",
          {
            ...trigger.attrs,
            type: "button",
            ref: elementRef(trigger.triggerRef),
            class: names.value.filtersButton,
            onPointerdown: trigger.onPointerDown,
            onClick: trigger.onClick,
          },
          [trigger.label, trigger.count ? ` (${trigger.count})` : null]
        ),
      Button: (button) =>
        h(
          "button",
          {
            type: "button",
            "data-adapttable-part": button.part,
            class:
              button.part === "filters-clear"
                ? names.value.filtersClear
                : names.value.filtersDone,
            onClick: button.onClick,
          },
          button.label
        ),
      Tree: (tree) => h(NativeFilterTree, { ...tree, classNames: names.value }),
      Field: (field) => h(NativeFilterField, { ...field }),
      Popover: (surface) =>
        h(NativeFilterSurface, { ...surface, modal: false }),
      Drawer: (surface) => h(NativeFilterSurface, { ...surface, modal: true }),
    };
    return () =>
      model.value
        ? FilterPanelChrome({
            model: model.value,
            controls,
            classNames: names.value,
          })
        : null;
  },
});
