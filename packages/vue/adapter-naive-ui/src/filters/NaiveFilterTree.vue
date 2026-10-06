<script setup lang="ts" generic="TRow">
import {
  type FilterTreeBuilderProps,
  FilterTreeChrome,
  type FilterTreeSlots,
  useFilterTreeModel,
} from "@adapttable/vue/adapter";
import { NFormItem } from "naive-ui";
import { h, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";
import { naiveInput } from "../controls/input";
import { naiveSelect } from "../controls/select";
import NaiveFilterDisclosure from "./NaiveFilterDisclosure.vue";

defineOptions({ name: "NaiveFilterTree" });
const props = withDefaults(
  defineProps<{
    readonly defs: FilterTreeBuilderProps<TRow>["defs"];
    readonly source: FilterTreeBuilderProps<TRow>["source"];
    readonly labels?: NonNullable<FilterTreeBuilderProps<TRow>["labels"]>;
    readonly classNames?: NonNullable<
      FilterTreeBuilderProps<TRow>["classNames"]
    >;
    readonly registry?: NonNullable<FilterTreeBuilderProps<TRow>["registry"]>;
    readonly defaultExpanded?: boolean;
  }>(),
  {
    defaultExpanded: undefined,
    labels: undefined,
    classNames: undefined,
    registry: undefined,
  }
);
const model = useFilterTreeModel(() => props);
function field(
  control: { label: string; fieldClassName?: string; labelClassName?: string },
  content: () => VNodeChild
) {
  return h(
    NFormItem,
    {
      "data-adapttable-part": "filter-field",
      class: control.fieldClassName,
      showFeedback: false,
      size: "small",
    },
    {
      label: () =>
        h(
          "span",
          {
            "data-adapttable-part": "filter-label",
            class: control.labelClassName,
          },
          control.label
        ),
      default: content,
    }
  );
}
const controls: FilterTreeSlots<VNodeChild> = {
  Select: (control) =>
    field(control, () =>
      naiveSelect({
        ...control,
        attrs: {
          "data-adapttable-part": control.part,
          "aria-label": control.label,
          class: control.className,
        },
      })
    ),
  Input: (control) =>
    field(control, () =>
      naiveInput({
        ...control,
        attrs: {
          "data-adapttable-part": "filter-input",
          "aria-label": control.label,
          class: control.className,
        },
      })
    ),
  Button: (control) =>
    naiveButton(
      {
        "data-adapttable-part": control.part,
        class: control.className,
        onClick: control.onClick,
      },
      control.label
    ),
  Disclosure: (control) => h(NaiveFilterDisclosure, { control }),
};
const Render = () => FilterTreeChrome({ model: model.value, controls });
Render.props = [] as string[];
</script>

<template><Render /></template>
