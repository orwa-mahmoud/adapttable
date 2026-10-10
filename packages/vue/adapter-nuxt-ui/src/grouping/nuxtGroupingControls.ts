import {
  type DataTableClassNames,
  type GroupingPanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import UCard from "@nuxt/ui/components/Card.vue";
import { h } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtCheckbox from "../controls/NuxtCheckbox.vue";
import NuxtSelect from "../controls/NuxtSelect.vue";

export function nuxtGroupingControls(
  names: () => DataTableClassNames
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        UCard,
        {
          ...toVueAttrs(attrs),
          as: "section",
          role: "group",
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
          class: names().groupingPanel,
          ui: { body: "adapttable-nuxt-grouping-body" },
        },
        () => children
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          "aria-label": label,
          "data-empty": empty ? "" : undefined,
          "data-active": active ? "" : undefined,
          "data-dragging": dragging ? "" : undefined,
          class: ["adapttable-nuxt-grouping-drop", names().groupingDropZone],
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
        UBadge,
        {
          ...attrs,
          color: "neutral",
          variant: "subtle",
          class: names().groupingChip,
          "data-level": level,
        },
        () => [
          h(
            NuxtButton,
            {
              attrs: {
                ...dragProps,
                ...keyboardProps,
                className: names().groupingChipHandle,
                "data-adapttable-part": "grouping-chip-handle",
              },
            },
            () => level + ". " + label
          ),
          h(
            NuxtButton,
            {
              attrs: {
                className: names().groupingChipRemove,
                "aria-label": removeLabel,
                "data-adapttable-part": "grouping-chip-remove",
                onClick: onRemove,
              },
            },
            () => "×"
          ),
        ]
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      h(NuxtSelect, {
        portal: true,
        control: {
          label,
          value,
          onChange,
          attrs: { ...attrs, disabled },
          options:
            value === "" && !options.some((option) => option.value === "")
              ? [{ value: "", label }, ...options]
              : options,
        },
        className:
          attrs["data-adapttable-part"] === "grouping-add"
            ? names().groupingAdd
            : names().groupingAggregationOperation,
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        "span",
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          "aria-label": label,
          "data-active": active ? "" : undefined,
          class: names().groupingRemoveZone,
        },
        label
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(
        UBadge,
        {
          ...attrs,
          color: "neutral",
          variant: "soft",
          class: names().groupingAggregationItem,
          "data-read-only": readOnly ? "" : undefined,
        },
        () => [
          h("span", label),
          readOnly ? h("span", readOnlyLabel) : null,
          children,
        ]
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      h(
        NuxtButton,
        {
          attrs: {
            ...attrs,
            className: names().groupingAggregationRemove,
            "aria-label": label,
            onClick: onRemove,
          },
        },
        () => "×"
      ),
    AggregationPicker: ({ label, options, onToggle, disabled, ...attrs }) =>
      h(
        "fieldset",
        {
          ...attrs,
          class: names().groupingAggregationAdd,
          disabled,
        },
        [
          h("legend", label),
          ...options.map((option) =>
            h(NuxtCheckbox, {
              key: option.value,
              control: {
                attrs: {
                  disabled,
                  "data-adapttable-part": "grouping-aggregation-option",
                },
                label: option.label,
                checked: option.checked,
                onChange: (checked: boolean) => onToggle(option.value, checked),
              },
            })
          ),
        ]
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      h(
        NuxtButton,
        {
          attrs: {
            ...attrs,
            className: names().groupingAggregationsRestore,
            disabled,
            onClick: onRestore,
          },
        },
        () => label
      ),
  };
}
