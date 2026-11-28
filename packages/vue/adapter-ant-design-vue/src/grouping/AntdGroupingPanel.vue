<script setup lang="ts" generic="TRow">
import { type GroupingPanelProps } from "@adapttable/vue";
import { GroupingPanelChrome } from "@adapttable/vue/adapter";

import { useClassNames } from "../classNamesContext";
import { antdGroupingControls } from "./antdGroupingControls";

defineOptions({ name: "AntdGroupingPanel" });
const props = defineProps<GroupingPanelProps<TRow>>();
const names = useClassNames();
const controls = antdGroupingControls(names);
const Render = () =>
  GroupingPanelChrome({
    ...props,
    classNames: names.value,
    slots: controls,
  });

// Declare no props so Vue forwards all root attributes, including id and data-*.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>

<style>
.adapttable-ant-design-vue-grouping > .ant-card-body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}
.adapttable-ant-design-vue-grouping-label,
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregations"]::before {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--adapttable-ant-design-vue-text-secondary);
  margin-inline-end: 0.5rem;
}
.adapttable-ant-design-vue-grouping [data-adapttable-part="grouping-add"] {
  inline-size: 15rem;
  max-inline-size: 100%;
}
.adapttable-ant-design-vue-grouping [data-adapttable-part="grouping-chip"] {
  display: inline-flex;
  align-items: center;
  block-size: auto;
  padding: 0.125rem 0.25rem;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregations"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  flex-basis: 100%;
  min-inline-size: 0;
  margin: 0.25rem 0 0;
  padding: 0.75rem 0 0;
  border: 0;
  border-block-start: 1px solid
    var(--adapttable-ant-design-vue-border-secondary);
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregations"]::before {
  content: attr(aria-label);
}
.adapttable-ant-design-vue-grouping [data-adapttable-aggregation],
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-item"] {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-inline-size: 0;
  max-inline-size: 100%;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-operation"] {
  inline-size: 8rem;
  max-inline-size: 100%;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-add"] {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-add"]
  legend {
  float: inline-start;
  padding: 0;
  font-size: 0.8125rem;
  color: var(--adapttable-ant-design-vue-text-secondary);
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-add"]
  .ant-checkbox-wrapper {
  margin: 0;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-chip-remove"],
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-aggregation-remove"] {
  margin: 0;
  min-inline-size: 1.75rem;
  padding-inline: 0.375rem;
}

/* Keep insertion boundaries stable so the target never moves under the pointer. */
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-drop-zone"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  flex: 0 0 auto;
  min-inline-size: 10px;
  min-block-size: 32px;
  block-size: auto;
  margin-inline: 2px;
  padding: 0;
  border: 1px dashed color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 4px;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-drop-zone"][data-empty] {
  min-inline-size: 9rem;
  min-block-size: 44px;
  padding: 0.5rem;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-drop-zone"][data-dragging] {
  opacity: 1;
  border-color: var(--adapttable-ant-design-vue-primary);
  background: color-mix(
    in srgb,
    var(--adapttable-ant-design-vue-primary) 8%,
    transparent
  );
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-drop-zone"][data-active] {
  border-style: solid;
  border-color: var(--adapttable-ant-design-vue-primary);
  background: color-mix(
    in srgb,
    var(--adapttable-ant-design-vue-primary) 22%,
    transparent
  );
  outline: 2px solid var(--adapttable-ant-design-vue-primary);
  outline-offset: 1px;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-chip-handle"] {
  cursor: grab;
}
.adapttable-ant-design-vue-grouping [data-grouping-dragging] {
  opacity: 0.5;
  cursor: grabbing;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-remove-zone"] {
  display: flex;
  flex: 1 1 100%;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-block-size: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px dashed var(--adapttable-ant-design-vue-danger);
  border-radius: 6px;
  color: var(--adapttable-ant-design-vue-danger);
  font-size: 0.8125rem;
}
.adapttable-ant-design-vue-grouping
  [data-adapttable-part="grouping-remove-zone"][data-active] {
  background: color-mix(
    in srgb,
    var(--adapttable-ant-design-vue-danger) 12%,
    transparent
  );
  border-style: solid;
  outline: 2px solid var(--adapttable-ant-design-vue-danger);
}
</style>
