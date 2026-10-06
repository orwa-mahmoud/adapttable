import {
  elementRef,
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  useFeatureState,
} from "@adapttable/vue/adapter";
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
    const buttonClassName = (part: string): string | undefined => {
      if (part === "filters-clear") return names.value.filtersClear;
      if (part === "filters-close") return names.value.filtersClose;
      return names.value.filtersDone;
    };
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
          [
            h(
              "svg",
              {
                "data-adapttable-part": "filters-icon",
                class: names.value.filtersIcon,
                viewBox: "0 0 24 24",
                width: 16,
                height: 16,
                "aria-hidden": "true",
                focusable: "false",
              },
              [
                h("path", {
                  d: "M3 4h18l-7 8v7l-4 2v-9z",
                  fill: "none",
                  stroke: "currentColor",
                }),
              ]
            ),
            trigger.label,
            trigger.count
              ? h(
                  "span",
                  {
                    "data-adapttable-part": "filters-count",
                    class: names.value.filtersCount,
                  },
                  ` (${trigger.count})`
                )
              : null,
          ]
        ),
      Button: (button) =>
        h(
          "button",
          {
            type: "button",
            "data-adapttable-part": button.part,
            disabled: button.disabled,
            class: buttonClassName(button.part),
            onClick: button.onClick,
          },
          button.label
        ),
      Tree: (tree) => h(NativeFilterTree, { ...tree, classNames: names.value }),
      Field: (field) => h(NativeFilterField, { ...field }),
      Popover: (surface) =>
        h(NativeFilterSurface, { ...surface, modal: false }),
      Drawer: (surface) =>
        h(NativeFilterSurface, {
          ...surface,
          modal: true,
          backdropLabel: model.value?.labels.cancel,
        }),
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
