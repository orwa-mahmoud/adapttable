import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { ElIcon, ElTag } from "element-plus";
import { defineComponent, h } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";
import ElementFilterField from "./ElementFilterField.vue";
import { ElementFilterSurface } from "./ElementFilterSurface";
import { ElementFilterTree } from "./ElementFilterTree";

export const ElementFiltersPanel = defineComponent({
  name: "ElementFiltersPanel",
  setup() {
    const names = useClassNames();
    const model = useFeatureState(filterViewKey<unknown>());
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (control) =>
        elementButton(
          {
            ...control.attrs,
            ref: control.triggerRef,
            class: names.value.filtersButton,
            onPointerdown: control.onPointerDown,
            onClick: control.onClick,
          },
          [
            h(
              ElIcon,
              {
                "data-adapttable-part": "filters-icon",
                class: names.value.filtersIcon,
                "aria-hidden": "true",
              },
              {
                default: () =>
                  h("svg", { viewBox: "0 0 24 24", focusable: "false" }, [
                    h("path", {
                      d: "M3 4h18l-7 8v7l-4 2v-9z",
                      fill: "none",
                      stroke: "currentColor",
                    }),
                  ]),
              }
            ),
            control.label,
            control.count
              ? h(
                  ElTag,
                  {
                    "data-adapttable-part": "filters-count",
                    class: names.value.filtersCount,
                    size: "small",
                    round: true,
                  },
                  { default: () => control.count }
                )
              : null,
          ]
        ),
      Button: (control) =>
        elementButton(
          {
            "data-adapttable-part": control.part,
            class: {
              "filters-clear": names.value.filtersClear,
              "filters-close": names.value.filtersClose,
              "filters-done": names.value.filtersDone,
            }[control.part],
            disabled: control.disabled,
            onClick: control.onClick,
          },
          control.label
        ),
      Field: (field) =>
        h(ElementFilterField<unknown>, { ...field, classNames: names.value }),
      Tree: (tree) =>
        h(ElementFilterTree, { ...tree, classNames: names.value }),
      Popover: (surface) =>
        h(ElementFilterSurface, { ...surface, modal: false }),
      Drawer: (surface) =>
        h(ElementFilterSurface, {
          ...surface,
          modal: true,
          backdropClassName: names.value.filtersBackdrop,
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
