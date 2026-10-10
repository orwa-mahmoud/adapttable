<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import UCollapsible from "@nuxt/ui/components/Collapsible.vue";
import { h, type VNodeChild } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtInput from "../controls/NuxtInput.vue";
import NuxtSelect from "../controls/NuxtSelect.vue";
const props = withDefaults(
  defineProps<{
    defs: FilterTreeBuilderProps<TRow>["defs"];
    source: FilterTreeBuilderProps<TRow>["source"];
    labels?: Exclude<FilterTreeBuilderProps<TRow>["labels"], undefined>;
    classNames?: Exclude<FilterTreeBuilderProps<TRow>["classNames"], undefined>;
    registry?: Exclude<FilterTreeBuilderProps<TRow>["registry"], undefined>;
    defaultExpanded?: Exclude<
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
        h(NuxtSelect, {
          control: {
            ...control,
            attrs: { "data-adapttable-part": control.part },
          },
          className: control.className,
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
        h(NuxtInput, {
          control: {
            ...control,
            attrs: { "data-adapttable-part": "filter-input" },
          },
          className: control.className,
        }),
      ]
    ),
  Button: (control) =>
    h(
      NuxtButton,
      {
        attrs: {
          class: control.className,
          "data-adapttable-part": control.part,
          onClick: control.onClick,
        },
      },
      () => control.label
    ),
  Disclosure: (control) =>
    h(
      UCollapsible,
      {
        open: control.expanded,
        "onUpdate:open": control.onExpandedChange,
        class: control.className,
        "data-adapttable-part": "filter-tree",
      },
      {
        default: () =>
          h(
            NuxtButton,
            {
              attrs: {
                class: control.summaryClassName,
                "data-adapttable-part": "filter-tree-summary",
              },
            },
            () => control.label
          ),
        content: () => control.children,
      }
    ),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
