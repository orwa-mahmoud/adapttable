import {
  type DataTableClassNames,
  type GroupingPanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { QCard, QChip } from "quasar";
import { h, type Ref } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";

export function quasarGroupingSlots(
  names: Readonly<Ref<DataTableClassNames>>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        QCard,
        {
          ...toVueAttrs(attrs),
          tag: "section",
          class: names.value.groupingPanel,
          flat: true,
          bordered: true,
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        () => children
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        QCard,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          tag: "span",
          class: names.value.groupingDropZone,
          flat: true,
          bordered: true,
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
        QChip,
        { ...attrs, class: names.value.groupingChip, "data-level": level },
        () => [
          h(QuasarButton, {
            label: `${level} · ${label}`,
            attrs: {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              "data-adapttable-part": "grouping-chip-handle",
              class: names.value.groupingChipHandle,
            },
          }),
          h(QuasarButton, {
            label: "×",
            attrs: {
              "aria-label": removeLabel,
              "data-adapttable-part": "grouping-chip-remove",
              class: names.value.groupingChipRemove,
              onClick: onRemove,
            },
          }),
        ]
      ),
    Select: ({ label, value, options, onChange, disabled, ...attrs }) =>
      h(QuasarSelect, {
        control: {
          label,
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
        },
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        QCard,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingRemoveZone,
          flat: true,
          bordered: true,
          "data-active": active ? "" : undefined,
        },
        () => label
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(QChip, { ...attrs, class: names.value.groupingAggregationItem }, () => [
        h("strong", label),
        readOnly ? h("small", readOnlyLabel) : children,
      ]),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      h(QuasarButton, {
        label: "×",
        attrs: {
          ...attrs,
          class: names.value.groupingAggregationRemove,
          "aria-label": label,
          onClick: onRemove,
        },
      }),
    AggregationPicker: ({ label, options, onToggle, disabled, ...attrs }) => {
      const choices = options.map((option) =>
        h(QuasarCheckbox, {
          key: option.value,
          control: {
            label: option.label,
            checked: option.checked,
            onChange: (checked) => onToggle(option.value, checked),
            attrs: {
              "aria-label": option.label,
              "data-adapttable-part": "grouping-aggregation-option",
              disabled,
            },
          },
        })
      );
      return h(
        QCard,
        {
          ...attrs,
          tag: "fieldset",
          class: names.value.groupingAggregationAdd,
          flat: true,
          bordered: true,
          disabled,
        },
        () => [h("legend", label), ...choices]
      );
    },
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      h(QuasarButton, {
        label,
        attrs: {
          ...attrs,
          class: names.value.groupingAggregationsRestore,
          disabled,
          onClick: onRestore,
        },
      }),
  };
}
