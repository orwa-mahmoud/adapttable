import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import { useRekaClasses } from "../context";
import { rekaButton } from "../controls/basic";
import { RekaSurface } from "../controls/RekaSurface";
import FilterField from "./FilterField.vue";
import FilterTreeBuilder from "./FilterTreeBuilder.vue";

export const RekaFiltersPanel = defineComponent({
  name: "RekaFiltersPanel",
  setup() {
    const names = useRekaClasses();
    const model = useFeatureState(filterViewKey<unknown>());
    const buttonClass = (part: string) => {
      if (part === "filters-clear") return names.value.filtersClear;
      if (part === "filters-close") return names.value.filtersClose;
      return names.value.filtersDone;
    };
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (control) =>
        rekaButton(
          {
            ...control.attrs,
            ref: control.triggerRef,
            class: names.value.filtersButton,
            onPointerdown: control.onPointerDown,
            onClick: control.onClick,
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
                "aria-hidden": true,
              },
              [
                h("path", {
                  d: "M3 4h18l-7 8v7l-4 2v-9z",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": 1.5,
                }),
              ]
            ),
            control.label,
            control.count
              ? h(
                  "span",
                  {
                    "data-adapttable-part": "filters-count",
                    class: names.value.filtersCount,
                  },
                  String(control.count)
                )
              : null,
          ]
        ),
      Button: (control) =>
        rekaButton(
          {
            "data-adapttable-part": control.part,
            disabled: control.disabled,
            onClick: control.onClick,
            class: buttonClass(control.part),
          },
          control.label
        ),
      Field: (control) => h(FilterField, control),
      Tree: (control) =>
        h(FilterTreeBuilder, { ...control, classNames: names.value }),
      Popover: (control) => h(RekaSurface, { ...control, modal: false }),
      Drawer: (control) =>
        h(RekaSurface, {
          ...control,
          modal: true,
          backdropClassName: names.value.filtersBackdrop,
          drawerClassName: names.value.filtersDrawer,
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
