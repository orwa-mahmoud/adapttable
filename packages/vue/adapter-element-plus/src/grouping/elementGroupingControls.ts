import { type GroupingPanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { ElTag } from "element-plus";
import { type ComputedRef, h } from "vue";

import { elementButton } from "../controls/button";
import ElementCheckbox from "../controls/ElementCheckbox.vue";
import ElementSelect from "../controls/ElementSelect.vue";
import { ElementCard } from "../presentation/ElementCard";
import type { DataTableClassNames } from "../types";

export function elementGroupingControls(
  names: ComputedRef<DataTableClassNames>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        ElementCard,
        {
          attrs: {
            ...toVueAttrs(attrs),
            class: names.value.groupingPanel,
            role: "group",
            "aria-label": label,
            "data-mobile": mobile ? "" : undefined,
          },
        },
        { default: () => children }
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
          style: {
            display: "inline-block",
            minInlineSize: empty ? "8em" : "0.6em",
          },
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
        ElTag,
        {
          ...attrs,
          class: names.value.groupingChip,
          "data-level": level,
          size: "large",
        },
        {
          default: () => [
            elementButton(
              {
                ...toVueAttrs({ ...dragProps }),
                ...toVueAttrs({ ...keyboardProps }),
                type: "button",
                class: names.value.groupingChipHandle,
                "data-adapttable-part": "grouping-chip-handle",
              },
              `${level}. ${label}`
            ),
            elementButton(
              {
                type: "button",
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
      h(ElementSelect, {
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
      elementButton(
        {
          ...attrs,
          type: "button",
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
            h(ElementCheckbox, {
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
      elementButton(
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
