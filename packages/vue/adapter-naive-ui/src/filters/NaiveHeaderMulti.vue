<script setup lang="ts">
import {
  type FilterHeaderMultiProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NPopover } from "naive-ui";
import {
  computed,
  h,
  type HTMLAttributes,
  nextTick,
  shallowRef,
  watch,
} from "vue";

import { naiveButton } from "../controls/button";
import { naiveFilterCheckbox } from "./controls";

defineOptions({ name: "NaiveHeaderMulti" });
const props = defineProps<{ readonly control: FilterHeaderMultiProps }>();
const active = useScopeActivity();
const open = shallowRef(false);
const trigger = shallowRef<HTMLElement | null>(null);
const receiveTrigger = (element: HTMLElement | null) => {
  trigger.value = element;
};
watch(
  active,
  (enabled) => {
    if (!enabled) open.value = false;
  },
  { flush: "sync" }
);
function keydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value || event.defaultPrevented) return;
  event.preventDefault();
  event.stopPropagation();
  open.value = false;
  const anchor = trigger.value;
  void nextTick(() => {
    if (active.value && !open.value && trigger.value === anchor)
      anchor?.focus();
  });
}
const surfaceAttrs = computed<HTMLAttributes>(() => ({
  role: "dialog",
  "aria-label": props.control.label,
  "data-adapttable-part": "filter-header-menu",
  class: props.control.menuClassName,
  onKeydown: keydown,
}));
const Trigger = () =>
  naiveButton(
    {
      ref: receiveTrigger,
      "data-adapttable-part": "filter-header-input",
      "aria-label": props.control.label,
      "aria-haspopup": "dialog",
      "aria-expanded": open.value,
      class: props.control.className,
      onKeydown: keydown,
    },
    props.control.summary
  );
const Options = () =>
  h(
    "div",
    { role: "group", "aria-label": props.control.label },
    props.control.options.map((option) =>
      naiveFilterCheckbox({
        label: option.label,
        checked: props.control.selected.includes(option.value),
        attrs: { key: option.value, "data-adapttable-part": "filter-checkbox" },
        onChange: (checked) => props.control.onToggle(option.value, checked),
      })
    )
  );
</script>

<template>
  <NPopover
    v-bind="surfaceAttrs"
    :show="active && open"
    trigger="click"
    :to="false"
    :show-arrow="false"
    @update:show="open = $event"
  >
    <template #trigger><Trigger /></template>
    <Options />
  </NPopover>
</template>
