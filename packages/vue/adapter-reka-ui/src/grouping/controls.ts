import { type GroupingPanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { h, type Ref } from "vue";

import { rekaButton } from "../controls/basic";
import { rekaCheckbox } from "../controls/checkbox";
import { rekaSelect } from "../controls/select";
import type { DataTableClassNames } from "../types";

export function rekaGroupingControls(
  names: Readonly<Ref<DataTableClassNames>>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        "section",
        {
          ...toVueAttrs(attrs),
          class: ["at-reka-grouping", names.value.groupingPanel],
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        [children]
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        Primitive,
        {
          as: "span",
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          "aria-label": label,
          class: ["at-reka-group-drop", names.value.groupingDropZone],
          "data-active": active ? "" : undefined,
          "data-dragging": dragging ? "" : undefined,
        },
        { default: () => (empty ? label : null) }
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
        "span",
        {
          ...attrs,
          class: ["at-reka-group-chip", names.value.groupingChip],
          "data-level": level,
        },
        [
          rekaButton(
            {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              class: names.value.groupingChipHandle,
              "data-adapttable-part": "grouping-chip-handle",
            },
            [h("span", { "aria-hidden": true }, `${level} · `), label]
          ),
          rekaButton(
            {
              class: names.value.groupingChipRemove,
              "data-adapttable-part": "grouping-chip-remove",
              "aria-label": removeLabel,
              onClick: onRemove,
            },
            "×"
          ),
        ]
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      rekaSelect({
        value,
        onChange,
        options: [{ value: "", label }, ...options],
        attrs: {
          ...attrs,
          "aria-label": label,
          disabled,
          class:
            attrs["data-adapttable-part"] === "grouping-add"
              ? names.value.groupingAdd
              : names.value.groupingAggregationOperation,
        },
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        Primitive,
        {
          as: "div",
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: ["at-reka-group-remove", names.value.groupingRemoveZone],
          "data-active": active ? "" : undefined,
        },
        { default: () => label }
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          class: ["at-reka-aggregation", names.value.groupingAggregationItem],
        },
        [h("strong", label), readOnly ? h("small", readOnlyLabel) : children]
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      rekaButton(
        {
          ...attrs,
          class: names.value.groupingAggregationRemove,
          "aria-label": label,
          onClick: onRemove,
        },
        "×"
      ),
    AggregationPicker: ({ label, options, onToggle, disabled, ...attrs }) =>
      h(
        "fieldset",
        {
          ...attrs,
          class: [
            "at-reka-aggregate-picker",
            names.value.groupingAggregationAdd,
          ],
          disabled,
        },
        [
          h("legend", label),
          ...options.map((option) =>
            h("label", { key: option.value }, [
              rekaCheckbox({
                attrs: {
                  "aria-label": option.label,
                  "data-adapttable-part": "grouping-aggregation-option",
                  disabled,
                },
                checked: option.checked,
                onChange: (checked) => onToggle(option.value, checked),
              }),
              option.label,
            ])
          ),
        ]
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      rekaButton(
        {
          ...attrs,
          class: names.value.groupingAggregationsRestore,
          disabled,
          onClick: onRestore,
        },
        label
      ),
  };
}
