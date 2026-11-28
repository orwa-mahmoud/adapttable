<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import { headlessButton, headlessInput } from "../controls/basic";
import { headlessDisclosure } from "../controls/disclosure";
import { HeadlessLabel } from "../controls/primitive";
import { headlessSelect } from "../controls/select";

const {
  defaultExpanded = undefined,
  labels = undefined,
  classNames = undefined,
  registry = undefined,
  ...props
} = defineProps<{
  defs: FilterTreeBuilderProps<TRow>["defs"];
  source: FilterTreeBuilderProps<TRow>["source"];
  labels?: NonNullable<FilterTreeBuilderProps<TRow>["labels"]>;
  classNames?: NonNullable<FilterTreeBuilderProps<TRow>["classNames"]>;
  registry?: NonNullable<FilterTreeBuilderProps<TRow>["registry"]>;
  defaultExpanded?: boolean;
}>();
const model = useFilterTreeModel(() => ({
  ...props,
  defaultExpanded,
  labels,
  classNames,
  registry,
}));
const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    h(
      HeadlessLabel,
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
          headlessSelect({
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
      HeadlessLabel,
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
          headlessInput({
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
    headlessButton(
      {
        class: control.className,
        "data-adapttable-part": control.part,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) => headlessDisclosure(control),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
