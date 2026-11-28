import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filterViewKey,
  type FilterWidget,
  filterWidgetComponent,
  useFeatureState,
} from "@adapttable/vue/adapter";
import { Tag } from "ant-design-vue";
import { defineComponent, h, type PropType } from "vue";

import { useClassNames } from "../classNamesContext";
import { antdButton } from "../controls/button";
import { antdIcon } from "../controls/icon";
import { AntdFilterSurface } from "./AntdFilterSurface";
import { AntdFilterTree } from "./AntdFilterTree";

function useAntdFiltersPanel(props: {
  readonly widgets: readonly FilterWidget[];
}) {
  const widgets = props.widgets;
  const names = useClassNames();
  const model = useFeatureState(filterViewKey<unknown>());
  const controls: FilterPanelSlots<unknown> = {
    Trigger: (control) =>
      antdButton(
        {
          ...control.attrs,
          ref: control.triggerRef,
          class: names.value.filtersButton,
          onPointerdown: control.onPointerDown,
          onClick: control.onClick,
        },
        [
          antdIcon(
            {
              "data-adapttable-part": "filters-icon",
              class: names.value.filtersIcon,
              "aria-hidden": "true",
            },
            h(
              "svg",
              {
                viewBox: "0 0 24 24",
                width: "1em",
                height: "1em",
                focusable: "false",
              },
              [
                h("path", {
                  d: "M3 4h18l-7 8v7l-4 2v-9z",
                  fill: "none",
                  stroke: "currentColor",
                }),
              ]
            )
          ),
          control.label,
          control.count
            ? h(
                Tag,
                {
                  "data-adapttable-part": "filters-count",
                  class: names.value.filtersCount,
                },
                { default: () => control.count }
              )
            : null,
        ]
      ),
    Button: (control) =>
      antdButton(
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
      h(filterWidgetComponent(field.def, field.registry, widgets), {
        ...field,
        classNames: names.value,
      }),
    Tree: (tree) => h(AntdFilterTree, { ...tree, classNames: names.value }),
    Popover: (surface) => h(AntdFilterSurface, { ...surface, modal: false }),
    Drawer: (surface) =>
      h(AntdFilterSurface, {
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
}

export const AntdFiltersPanel = defineComponent({
  name: "AntdFiltersPanel",
  props: {
    /** The widgets the panel draws its fields with. */
    widgets: {
      type: Array as PropType<readonly FilterWidget[]>,
      required: true,
    },
  },
  setup: useAntdFiltersPanel,
});
