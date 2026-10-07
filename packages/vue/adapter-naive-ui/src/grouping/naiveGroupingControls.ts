import {
  type DataTableClassNames,
  type GroupingPanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { NCard, NCheckbox, NFlex, NTag, NText } from "naive-ui";
import { type ComputedRef, h } from "vue";

import { naiveButton } from "../controls/button";
import { naiveSelect } from "../controls/select";
function aggregationOption(
  option: { value: string; label: string; checked: boolean },
  disabled: boolean | undefined,
  onToggle: (value: string, checked: boolean) => void
) {
  return h(
    NCheckbox,
    {
      key: option.value,
      checked: option.checked,
      disabled,
      "data-adapttable-part": "grouping-aggregation-option",
      "onUpdate:checked": (checked: boolean) => onToggle(option.value, checked),
    },
    { default: () => option.label }
  );
}
export function naiveGroupingControls(
  names: ComputedRef<DataTableClassNames>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        NCard,
        {
          ...toVueAttrs(attrs),
          size: "small",
          class: names.value.groupingPanel,
          role: "group",
          "aria-label": label,
          "data-mobile": mobile ? "" : undefined,
        },
        { default: () => children }
      ),
    DropZone: ({ label, empty, active, dragging, dropProps, ...attrs }) =>
      h(
        NTag,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingDropZone,
          "aria-label": label,
          "data-empty": empty ? "" : undefined,
          "data-active": active ? "" : undefined,
          "data-dragging": dragging ? "" : undefined,
          style: { minInlineSize: empty ? "8em" : ".6em" },
        },
        { default: () => (empty ? label : "") }
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
        NFlex,
        {
          ...attrs,
          inline: true,
          align: "center",
          size: 4,
          class: names.value.groupingChip,
          "data-level": level,
        },
        {
          default: () => [
            naiveButton(
              {
                ...toVueAttrs({ ...dragProps }),
                ...toVueAttrs({ ...keyboardProps }),
                class: names.value.groupingChipHandle,
                "data-adapttable-part": "grouping-chip-handle",
              },
              `${level}. ${label}`
            ),
            naiveButton(
              {
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
      naiveSelect({
        value,
        options,
        onChange,
        attrs: {
          ...attrs,
          class:
            attrs["data-adapttable-part"] === "grouping-add"
              ? names.value.groupingAdd
              : names.value.groupingAggregationOperation,
          disabled,
          "aria-label": label,
          placeholder: label,
        },
      }),
    RemoveZone: ({ label, active, dropProps, ...attrs }) =>
      h(
        NTag,
        {
          ...attrs,
          ...toVueAttrs({ ...dropProps }),
          class: names.value.groupingRemoveZone,
          "aria-label": label,
          "data-active": active ? "" : undefined,
        },
        { default: () => label }
      ),
    AggregationItem: ({ label, readOnly, readOnlyLabel, children, ...attrs }) =>
      h(
        NFlex,
        {
          ...attrs,
          inline: true,
          align: "center",
          class: names.value.groupingAggregationItem,
          "data-read-only": readOnly ? "" : undefined,
        },
        {
          default: () => [
            h(NText, null, { default: () => label }),
            readOnly ? h(NTag, null, { default: () => readOnlyLabel }) : null,
            children,
          ],
        }
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      naiveButton(
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
        NFlex,
        {
          ...attrs,
          role: "group",
          "aria-label": label,
          class: names.value.groupingAggregationAdd,
        },
        {
          default: () =>
            options.map((option) =>
              aggregationOption(option, disabled, onToggle)
            ),
        }
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      naiveButton(
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
