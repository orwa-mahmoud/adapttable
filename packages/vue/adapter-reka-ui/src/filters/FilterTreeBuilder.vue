<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
  Label,
} from "reka-ui";
import { h, type VNodeChild } from "vue";

import { rekaButton, rekaInput } from "../controls/basic";
import { rekaSelect } from "../controls/select";

const props = withDefaults(
  defineProps<{
    defs: FilterTreeBuilderProps<TRow>["defs"];
    source: FilterTreeBuilderProps<TRow>["source"];
    labels?: NonNullable<FilterTreeBuilderProps<TRow>["labels"]>;
    classNames?: NonNullable<FilterTreeBuilderProps<TRow>["classNames"]>;
    registry?: NonNullable<FilterTreeBuilderProps<TRow>["registry"]>;
    defaultExpanded?: boolean;
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
      Label,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        default: () => [
          h(
            "span",
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            control.label
          ),
          rekaSelect({
            ...control,
            attrs: {
              "aria-label": control.label,
              class: control.className,
              "data-adapttable-part": control.part,
            },
          }),
        ],
      }
    ),
  Input: (control) =>
    h(
      Label,
      { class: control.fieldClassName, "data-adapttable-part": "filter-field" },
      {
        default: () => [
          h(
            "span",
            {
              class: control.labelClassName,
              "data-adapttable-part": "filter-label",
            },
            control.label
          ),
          rekaInput({
            ...control,
            attrs: {
              "aria-label": control.label,
              class: control.className,
              "data-adapttable-part": "filter-input",
            },
          }),
        ],
      }
    ),
  Button: (control) =>
    rekaButton(
      {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) =>
    h(
      CollapsibleRoot,
      {
        open: control.expanded,
        "onUpdate:open": control.onExpandedChange,
        "data-adapttable-part": "filter-tree",
        class: control.className,
      },
      {
        default: () => [
          h(
            CollapsibleTrigger,
            {
              "data-adapttable-part": "filter-tree-summary",
              class: ["at-reka-button", control.summaryClassName],
            },
            { default: () => control.label }
          ),
          h(CollapsibleContent, null, { default: () => control.children }),
        ],
      }
    ),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
