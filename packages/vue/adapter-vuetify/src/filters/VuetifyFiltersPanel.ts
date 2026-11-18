import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  type FilterWidget,
  filterWidgetComponent,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType } from "vue";
import { VChip } from "vuetify/components/VChip";
import { VIcon } from "vuetify/components/VIcon";

import { useClassNames } from "../classNamesContext";
import VuetifyButton from "../controls/VuetifyButton.vue";
import VuetifyFilterDrawer from "./VuetifyFilterDrawer.vue";
import VuetifyFilterPopover from "./VuetifyFilterPopover.vue";
import { VuetifyFilterTree } from "./VuetifyFilterTree";

function useVuetifyFiltersPanel(widgets: readonly FilterWidget[]) {
  const names = useClassNames();
  const model = useFeatureState(filterViewKey<unknown>());
  const buttonClass = (part: string) => {
    if (part === "filters-clear") return names.value.filtersClear;
    if (part === "filters-close") return names.value.filtersClose;
    return names.value.filtersDone;
  };
  const controls: FilterPanelSlots<unknown> = {
    Trigger: (trigger) =>
      h(VuetifyButton, {
        attrs: {
          ...trigger.attrs,
          "aria-label": trigger.label,
          ref: trigger.triggerRef,
          class: names.value.filtersButton,
          onPointerdown: trigger.onPointerDown,
          onClick: trigger.onClick,
        },
        content: [
          h(VIcon, {
            icon: "M3 4h18l-7 8v7l-4 2v-9z",
            size: 16,
            "aria-hidden": true,
            "data-adapttable-part": "filters-icon",
            class: names.value.filtersIcon,
          }),
          trigger.label,
          trigger.count
            ? h(
                VChip,
                {
                  size: "x-small",
                  variant: "tonal",
                  "data-adapttable-part": "filters-count",
                  class: names.value.filtersCount,
                },
                () => String(trigger.count)
              )
            : null,
        ],
      }),
    Button: (button) =>
      h(VuetifyButton, {
        attrs: {
          "data-adapttable-part": button.part,
          disabled: button.disabled,
          onClick: button.onClick,
          class: buttonClass(button.part),
        },
        content: button.label,
      }),
    Tree: (tree) => h(VuetifyFilterTree, { ...tree, classNames: names.value }),
    Field: (field) =>
      h(filterWidgetComponent(field.def, field.registry, widgets), {
        ...field,
      }),
    Popover: (surface) => h(VuetifyFilterPopover, { ...surface }),
    Drawer: (surface) => h(VuetifyFilterDrawer, { ...surface }),
  };
  return () =>
    model.value
      ? FilterPanelChrome({
          model: model.value,
          controls,
          classNames: names.value,
        })
      : null;
}

export const VuetifyFiltersPanel = defineComponent({
  name: "VuetifyFiltersPanel",
  props: {
    /** The widgets the panel draws its fields with. */
    widgets: {
      type: Array as PropType<readonly FilterWidget[]>,
      required: true,
    },
  },
  setup: (props) => useVuetifyFiltersPanel(props.widgets),
});
