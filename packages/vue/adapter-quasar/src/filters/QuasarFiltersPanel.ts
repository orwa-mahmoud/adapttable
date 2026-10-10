import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  mergeVueAttrs,
  useDataTableClassNames,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { QBadge, QIcon } from "quasar";
import { defineComponent, h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarFilterField from "./QuasarFilterField.vue";
import QuasarFilterSurface from "./QuasarFilterSurface.vue";
import QuasarFilterTree from "./QuasarFilterTree.vue";
export const QuasarFiltersPanel = defineComponent({
  name: "QuasarFiltersPanel",
  setup() {
    const names = useDataTableClassNames();
    const model = useFeatureState(filterViewKey<unknown>());
    const controls: FilterPanelSlots<unknown> = {
      Trigger: (trigger) =>
        h(
          QuasarButton,
          {
            attrs: mergeVueAttrs(trigger.attrs, {
              class: names.value.filtersButton,
              onPointerdown: trigger.onPointerDown,
              onClick: trigger.onClick,
            }),
            focusRef: trigger.triggerRef,
          },
          () => [
            h(
              QIcon,
              {
                "data-adapttable-part": "filters-icon",
                class: names.value.filtersIcon,
                "aria-hidden": "true",
                size: "18px",
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
                  QBadge,
                  {
                    class: names.value.filtersCount,
                    "data-adapttable-part": "filters-count",
                  },
                  () => String(trigger.count)
                )
              : null,
          ]
        ),
      Button: (button) =>
        h(QuasarButton, {
          attrs: {
            "data-adapttable-part": button.part,
            disabled: button.disabled,
            class: {
              "filters-clear": names.value.filtersClear,
              "filters-close": names.value.filtersClose,
              "filters-done": names.value.filtersDone,
            }[button.part],
            onClick: button.onClick,
          },
          label: button.label,
        }),
      Tree: (tree) => h(QuasarFilterTree, { ...tree, classNames: names.value }),
      Field: (field) => h(QuasarFilterField, { ...field }),
      Popover: (surface) =>
        h(QuasarFilterSurface, { ...surface, modal: false }),
      Drawer: (surface) => h(QuasarFilterSurface, { ...surface, modal: true }),
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
