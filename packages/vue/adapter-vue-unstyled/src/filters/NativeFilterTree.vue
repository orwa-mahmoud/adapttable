<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

/** The binding owns recursive layout and tree writes; this kit supplies native controls. */
defineOptions({ name: "NativeFilterTree" });
const props = withDefaults(defineProps<FilterTreeBuilderProps<TRow>>(), {
  defaultExpanded: undefined,
});
const model = useFilterTreeModel(() => props);
const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      "label",
      {
        class: control.fieldClassName,
        "data-adapttable-part": "filter-field",
      },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        h(
          "select",
          {
            class: control.className,
            value: control.value,
            "data-adapttable-part": control.part,
            onChange: (event: Event) => {
              const element = event.currentTarget as HTMLSelectElement;
              control.onChange(element.value);
              element.value = control.value;
            },
          },
          control.options.map((option) =>
            h(
              "option",
              { key: option.value, value: option.value },
              option.label
            )
          )
        ),
      ]
    ),
  Input: (control) =>
    h(
      "label",
      {
        class: control.fieldClassName,
        "data-adapttable-part": "filter-field",
      },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        h("input", {
          type: control.type,
          value: control.value,
          class: control.className,
          "data-adapttable-part": "filter-input",
          onInput: (event: Event) => {
            const element = event.currentTarget as HTMLInputElement;
            control.onChange(element.value);
            element.value = control.value;
          },
        }),
      ]
    ),
  Button: (control) =>
    h(
      "button",
      {
        type: "button",
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) =>
    h(
      "details",
      {
        open: control.expanded,
        class: control.className,
        "data-adapttable-part": "filter-tree",
        onToggle: (event: Event) => {
          control.onExpandedChange(
            (event.currentTarget as HTMLDetailsElement).open
          );
        },
      },
      [
        h(
          "summary",
          {
            class: control.summaryClassName,
            "data-adapttable-part": "filter-tree-summary",
          },
          control.label
        ),
        control.children,
      ]
    ),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
