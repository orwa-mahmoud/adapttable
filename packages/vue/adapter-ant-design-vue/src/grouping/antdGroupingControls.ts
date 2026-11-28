import { type GroupingPanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { Tag } from "ant-design-vue";
import { type ComputedRef, h } from "vue";

import AntdCheckbox from "../controls/AntdCheckbox.vue";
import AntdSelect from "../controls/AntdSelect.vue";
import { antdButton } from "../controls/button";
import { AntdCard } from "../presentation/AntdCard";
import type { DataTableClassNames } from "../types";

export function antdGroupingControls(
  names: ComputedRef<DataTableClassNames>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        AntdCard,
        {
          attrs: {
            ...toVueAttrs(attrs),
            class: [
              "adapttable-ant-design-vue-grouping",
              names.value.groupingPanel,
            ],
            role: "group",
            "aria-label": label,
            "data-mobile": mobile ? "" : undefined,
          },
        },
        {
          default: () => [
            h(
              "span",
              { class: "adapttable-ant-design-vue-grouping-label" },
              label
            ),
            children,
          ],
        }
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingDropZone,
          "aria-label": label,
          "data-empty": empty ? "" : undefined,
          "data-active": active ? "" : undefined,
          "data-dragging": dragging ? "" : undefined,
        },
        empty ? label : ""
      ),
    Chip: ({
      label,
      level,
      dragProps,
      keyboardProps,
      onRemove,
      removeLabel,
      ...attrs
    }) =>
      h(
        Tag,
        {
          ...attrs,
          class: names.value.groupingChip,
          "data-level": level,
        },
        {
          default: () => [
            antdButton(
              {
                ...toVueAttrs({ ...dragProps }),
                ...toVueAttrs({ ...keyboardProps }),
                type: "button",
                text: true,
                size: "small",
                class: names.value.groupingChipHandle,
                "data-adapttable-part": "grouping-chip-handle",
              },
              `${level}. ${label}`
            ),
            antdButton(
              {
                type: "button",
                text: true,
                size: "small",
                class: names.value.groupingChipRemove,
                "aria-label": removeLabel,
                "data-adapttable-part": "grouping-chip-remove",
                onClick: onRemove,
              },
              "×"
            ),
          ],
        }
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      h(AntdSelect, {
        ...attrs,
        value,
        options,
        disabled,
        placeholder: label,
        "aria-label": label,
        class:
          attrs["data-adapttable-part"] === "grouping-add"
            ? names.value.groupingAdd
            : names.value.groupingAggregationOperation,
        onChange,
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingRemoveZone,
          "aria-label": label,
          "data-active": active ? "" : undefined,
        },
        label
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          class: names.value.groupingAggregationItem,
          "data-read-only": readOnly ? "" : undefined,
        },
        [h("span", label), readOnly ? h("span", readOnlyLabel) : null, children]
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      antdButton(
        {
          ...attrs,
          type: "button",
          text: true,
          size: "small",
          class: names.value.groupingAggregationRemove,
          "aria-label": label,
          onClick: onRemove,
        },
        "×"
      ),
    AggregationPicker: ({ label, options, onToggle, disabled, ...attrs }) =>
      h(
        "fieldset",
        { ...attrs, class: names.value.groupingAggregationAdd, disabled },
        [
          h("legend", label),
          ...options.map((option) =>
            h(AntdCheckbox, {
              key: option.value,
              checked: option.checked,
              label: option.label,
              labelVisible: true,
              disabled,
              "data-adapttable-part": "grouping-aggregation-option",
              onChange: (checked: boolean) => onToggle(option.value, checked),
            })
          ),
        ]
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      antdButton(
        {
          ...attrs,
          type: "button",
          class: names.value.groupingAggregationsRestore,
          disabled,
          onClick: onRestore,
        },
        label
      ),
  };
}
