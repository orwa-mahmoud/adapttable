import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  mergeVueAttrs,
  useDataTableClassNames,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { NIcon } from "naive-ui";
import { defineComponent, h } from "vue";

import { naiveButton } from "../controls/button";
import NaiveFilterField from "./NaiveFilterField.vue";
import { NaiveFilterSurface } from "./NaiveFilterSurface";
import NaiveFilterTree from "./NaiveFilterTree.vue";

export const NaiveFiltersPanel = defineComponent({
  name: "NaiveFiltersPanel",
  setup() {
    const names = useDataTableClassNames();
    const model = useFeatureState(filterViewKey<unknown>());
    const buttonClass = (part: string) => {
      if (part === "filters-clear") return names.value.filtersClear;
      if (part === "filters-close") return names.value.filtersClose;
      return names.value.filtersDone;
    };
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (trigger) =>
        naiveButton(
          mergeVueAttrs(trigger.attrs, {
            ref: trigger.triggerRef,
            class: names.value.filtersButton,
            onPointerdown: trigger.onPointerDown,
            onClick: trigger.onClick,
          }),
          [
            h(
              NIcon,
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
        naiveButton(
          {
            "data-adapttable-part": button.part,
            class: buttonClass(button.part),
            disabled: button.disabled,
            onClick: button.onClick,
          },
          button.label
        ),
      Tree: (tree) => h(NaiveFilterTree, { ...tree, classNames: names.value }),
      Field: (field) => h(NaiveFilterField, { ...field }),
      Popover: (surface) => h(NaiveFilterSurface, { ...surface, modal: false }),
      Drawer: (surface) => h(NaiveFilterSurface, { ...surface, modal: true }),
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
