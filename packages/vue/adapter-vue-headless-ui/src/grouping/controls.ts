import { type GroupingPanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { h, type Ref } from "vue";

import { headlessButton } from "../controls/basic";
import { headlessCheckbox } from "../controls/checkbox";
import { HeadlessPrimitive } from "../controls/primitive";
import { headlessSelect } from "../controls/select";
import type { DataTableClassNames } from "../types";

export function headlessGroupingControls(
  names: Readonly<Ref<DataTableClassNames>>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        "section",
        {
          ...toVueAttrs(attrs),
          class: [
            "at-headless-grouping",
            "adapttable-headless-ui-grouping-layout",
            names.value.groupingPanel,
          ],
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        [
          h(
            "span",
            { class: "adapttable-headless-ui-grouping-layout-label" },
            label
          ),
          children,
        ]
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        HeadlessPrimitive,
        {
          as: "span",
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          "aria-label": label,
          class: ["at-headless-group-drop", names.value.groupingDropZone],
          "data-empty": empty ? "" : undefined,
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
          class: ["at-headless-group-chip", names.value.groupingChip],
          "data-level": level,
        },
        [
          headlessButton(
            {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              class: names.value.groupingChipHandle,
              "data-adapttable-part": "grouping-chip-handle",
            },
            [h("span", { "aria-hidden": true }, `${level} · `), label]
          ),
          headlessButton(
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
      headlessSelect({
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
        HeadlessPrimitive,
        {
          as: "div",
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: ["at-headless-group-remove", names.value.groupingRemoveZone],
          "data-active": active ? "" : undefined,
        },
        { default: () => label }
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          class: [
            "at-headless-aggregation",
            names.value.groupingAggregationItem,
          ],
        },
        [h("strong", label), readOnly ? h("small", readOnlyLabel) : children]
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      headlessButton(
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
            "at-headless-aggregate-picker",
            names.value.groupingAggregationAdd,
          ],
          disabled,
        },
        [
          h("legend", label),
          ...options.map((option) =>
            h("label", { key: option.value }, [
              headlessCheckbox({
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
      headlessButton(
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
