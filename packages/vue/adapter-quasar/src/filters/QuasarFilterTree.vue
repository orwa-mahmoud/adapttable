<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import { QExpansionItem } from "quasar";
import { h, type VNodeChild } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";
const props = withDefaults(
  defineProps<{
    readonly defs: FilterTreeBuilderProps<TRow>["defs"];
    readonly source: FilterTreeBuilderProps<TRow>["source"];
    readonly labels?: Exclude<
      FilterTreeBuilderProps<TRow>["labels"],
      undefined
    >;
    readonly classNames?: Exclude<
      FilterTreeBuilderProps<TRow>["classNames"],
      undefined
    >;
    readonly registry?: Exclude<
      FilterTreeBuilderProps<TRow>["registry"],
      undefined
    >;
    readonly defaultExpanded?: Exclude<
      FilterTreeBuilderProps<TRow>["defaultExpanded"],
      undefined
    >;
  }>(),
  {
    defaultExpanded: undefined,
    labels: undefined,
    classNames: undefined,
    registry: undefined,
  }
);
const model = useFilterTreeModel(() => props);
const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      "div",
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        h(QuasarSelect, {
          control: {
            ...control,
            attrs: {
              class: control.className,
              "data-adapttable-part": control.part,
            },
          },
        }),
      ]
    ),
  Input: (control) =>
    h(
      "div",
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      [
        h(
          "span",
          {
            class: control.labelClassName,
            "data-adapttable-part": "filter-label",
          },
          control.label
        ),
        h(QuasarInput, {
          control: {
            ...control,
            attrs: {
              class: control.className,
              "data-adapttable-part": "filter-input",
            },
          },
        }),
      ]
    ),
  Button: (control) =>
    h(QuasarButton, {
      attrs: {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      label: control.label,
    }),
  Disclosure: (control) =>
    h(
      QExpansionItem,
      {
        modelValue: control.expanded,
        "onUpdate:modelValue": control.onExpandedChange,
        label: control.label,
        class: control.className,
        headerClass: control.summaryClassName,
        expandIcon: "M7 10l5 5 5-5z",
        "data-adapttable-part": "filter-tree",
      },
      () => control.children
    ),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
