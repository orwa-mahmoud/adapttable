<script setup lang="ts">
import type { FilterTreeDisclosureProps } from "@adapttable/vue/adapter";
import { NCollapse, NCollapseItem } from "naive-ui";
import { useId, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";

defineOptions({ name: "NaiveFilterDisclosure" });
const props = defineProps<{
  readonly control: FilterTreeDisclosureProps<VNodeChild>;
}>();
const contentId = `adapttable-naive-filter-tree-${useId()}`;
const Trigger = () =>
  naiveButton(
    {
      "data-adapttable-part": "filter-tree-summary",
      "aria-expanded": props.control.expanded,
      "aria-controls": contentId,
      class: props.control.summaryClassName,
      onClick: () => props.control.onExpandedChange(!props.control.expanded),
    },
    props.control.label
  );
const Content = () => props.control.children;
</script>

<template>
  <NCollapse
    data-adapttable-part="filter-tree"
    :class="control.className"
    :expanded-names="control.expanded ? ['advanced'] : []"
    :trigger-areas="[]"
  >
    <template #arrow><span aria-hidden="true" /></template>
    <NCollapseItem name="advanced">
      <template #header><Trigger /></template>
      <div :id="contentId"><Content /></div>
    </NCollapseItem>
  </NCollapse>
</template>
