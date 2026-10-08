import {
  type DataTableClassNames,
  type GroupingPanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { Primitive } from "reka-ui";
import { h, type Ref } from "vue";

import { Checkbox } from "../components/checkbox";
import { shadcnSelect } from "../controls";
import { shadcnAction } from "../tableControls";

export function shadcnGroupingControls(
  names: Readonly<Ref<DataTableClassNames>>
): GroupingPanelSlots {
  return {
    Surface: ({ children, label, mobile, ...attrs }) =>
      h(
        "section",
        {
          ...toVueAttrs(attrs),
          class: [
            "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3",
            names.value.groupingPanel,
          ],
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
          class: [
            "inline-flex min-h-9 min-w-2 items-center rounded border border-dashed border-border px-2 text-muted-foreground data-active:bg-accent",
            names.value.groupingDropZone,
          ],
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
          class: [
            "inline-flex items-center gap-1 rounded-md border border-border bg-background p-1",
            names.value.groupingChip,
          ],
          "data-level": level,
        },
        [
          shadcnAction(
            {
              ...toVueAttrs({ ...dragProps }),
              ...toVueAttrs({ ...keyboardProps }),
              class: names.value.groupingChipHandle,
              "data-adapttable-part": "grouping-chip-handle",
            },
            [h("span", { "aria-hidden": true }, `${level} · `), label]
          ),
          shadcnAction(
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
      shadcnSelect({
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
          class: [
            "rounded-md border border-dashed border-destructive p-3 text-destructive data-active:bg-destructive/10",
            names.value.groupingRemoveZone,
          ],
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
            "inline-flex items-center gap-2 rounded-md border border-border p-2",
            names.value.groupingAggregationItem,
          ],
        },
        [h("strong", label), readOnly ? h("small", readOnlyLabel) : children]
      ),
    AggregationRemove: ({ label, onRemove, ...attrs }) =>
      shadcnAction(
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
            "flex flex-wrap items-center gap-3 rounded-md border border-border p-2",
            names.value.groupingAggregationAdd,
          ],
          disabled,
        },
        [
          h("legend", label),
          ...options.map((option) =>
            h("label", { key: option.value }, [
              h(Checkbox, {
                "aria-label": option.label,
                "data-adapttable-part": "grouping-aggregation-option",
                disabled,
                modelValue: option.checked,
                "onUpdate:modelValue": (checked: boolean | "indeterminate") =>
                  onToggle(option.value, checked === true),
              }),
              option.label,
            ])
          ),
        ]
      ),
    AggregationRestore: ({ label, disabled, onRestore, ...attrs }) =>
      shadcnAction(
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
