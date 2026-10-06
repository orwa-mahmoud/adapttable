import { type GroupingPanelSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { type ComputedRef, h } from "vue";

import type { DataTableClassNames } from "../types";

export function nativeGroupingControls(
  names: ComputedRef<DataTableClassNames>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        "div",
        {
          ...toVueAttrs(attrs),
          class: names.value.groupingPanel,
          role: "group",
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        [children]
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
        "span",
        { ...attrs, class: names.value.groupingChip, "data-level": level },
        [
          h(
            "button",
            {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              type: "button",
              class: names.value.groupingChipHandle,
              "data-adapttable-part": "grouping-chip-handle",
            },
            `${level}. ${label}`
          ),
          h(
            "button",
            {
              type: "button",
              class: names.value.groupingChipRemove,
              "aria-label": removeLabel,
              "data-adapttable-part": "grouping-chip-remove",
              onClick: onRemove,
            },
            "×"
          ),
        ]
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      h(
        "select",
        {
          ...attrs,
          class:
            attrs["data-adapttable-part"] === "grouping-add"
              ? names.value.groupingAdd
              : names.value.groupingAggregationOperation,
          value,
          disabled,
          "aria-label": label,
          onChange: (event: Event) => {
            const target = event.target;
            if (target instanceof HTMLSelectElement) {
              onChange(target.value);
              target.value = value;
            }
          },
        },
        [
          value === "" ? h("option", { value: "" }, label) : null,
          ...options.map((option) =>
            h(
              "option",
              { value: option.value, key: option.value },
              option.label
            )
          ),
        ]
      ),
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
      h(
        "button",
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
            h(
              "label",
              {
                key: option.value,
              },
              [
                h("input", {
                  type: "checkbox",
                  "data-adapttable-part": "grouping-aggregation-option",
                  checked: option.checked,
                  onChange: (event: Event) => {
                    if (event.target instanceof HTMLInputElement)
                      onToggle(option.value, event.target.checked);
                  },
                }),
                option.label,
              ]
            )
          ),
        ]
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      h(
        "button",
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
