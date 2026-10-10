import {
  type DataTableClassNames,
  type GroupingPanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { h, type Ref } from "vue";
import { VCard } from "vuetify/components/VCard";
import { VChip } from "vuetify/components/VChip";

import { vuetifyButton } from "../controls";
import VuetifyCheckbox from "../controls/VuetifyCheckbox.vue";
import VuetifySelect from "../controls/VuetifySelect.vue";

export function vuetifyGroupingSlots(
  names: Readonly<Ref<DataTableClassNames>>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        VCard,
        {
          ...toVueAttrs(attrs),
          tag: "section",
          class: names.value.groupingPanel,
          variant: "outlined",
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        () => children
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        VCard,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          tag: "span",
          class: names.value.groupingDropZone,
          variant: "outlined",
          "aria-label": label,
          "data-active": active ? "" : undefined,
          "data-dragging": dragging ? "" : undefined,
        },
        () => (empty ? label : null)
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
        VChip,
        { ...attrs, class: names.value.groupingChip, "data-level": level },
        () => [
          vuetifyButton(
            {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              "data-adapttable-part": "grouping-chip-handle",
              class: names.value.groupingChipHandle,
            },
            `${level} · ${label}`
          ),
          vuetifyButton(
            {
              "aria-label": removeLabel,
              "data-adapttable-part": "grouping-chip-remove",
              class: names.value.groupingChipRemove,
              onClick: onRemove,
            },
            "×"
          ),
        ]
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      h(VuetifySelect, {
        value,
        options: [{ value: "", label }, ...options],
        onChange,
        attrs: {
          ...attrs,
          disabled,
          "aria-label": label,
          class:
            attrs["data-adapttable-part"] === "grouping-add"
              ? names.value.groupingAdd
              : names.value.groupingAggregationOperation,
        },
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        VCard,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingRemoveZone,
          variant: "outlined",
          "data-active": active ? "" : undefined,
        },
        () => label
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(VChip, { ...attrs, class: names.value.groupingAggregationItem }, () => [
        h("strong", label),
        readOnly ? h("small", readOnlyLabel) : children,
      ]),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      vuetifyButton(
        {
          ...attrs,
          class: names.value.groupingAggregationRemove,
          "aria-label": label,
          onClick: onRemove,
        },
        "×"
      ),
    AggregationPicker: ({ label, options, onToggle, disabled, ...attrs }) => {
      const choices = options.map((option) =>
        h("label", { key: option.value }, [
          h(VuetifyCheckbox, {
            checked: option.checked,
            onChange: (checked) => onToggle(option.value, checked),
            attrs: {
              "aria-label": option.label,
              "data-adapttable-part": "grouping-aggregation-option",
              disabled,
            },
          }),
          option.label,
        ])
      );
      return h(
        VCard,
        {
          ...attrs,
          tag: "fieldset",
          class: names.value.groupingAggregationAdd,
          variant: "outlined",
          disabled,
        },
        () => [h("legend", label), ...choices]
      );
    },
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      vuetifyButton(
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
