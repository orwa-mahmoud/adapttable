<script setup lang="ts">
import {
  type FilterHeaderMultiProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QMenu } from "quasar";
import { computed, onScopeDispose, ref, watch } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
const props = defineProps<
  {
    readonly label: FilterHeaderMultiProps["label"];
    readonly summary: FilterHeaderMultiProps["summary"];
    readonly options: FilterHeaderMultiProps["options"];
    readonly selected: FilterHeaderMultiProps["selected"];
    readonly onToggle: FilterHeaderMultiProps["onToggle"];
    readonly className?: Exclude<
      FilterHeaderMultiProps["className"],
      undefined
    >;
    readonly menuClassName?: Exclude<
      FilterHeaderMultiProps["menuClassName"],
      undefined
    >;
  } & { dir?: "ltr" | "rtl" }
>();
const active = useScopeActivity();
const open = ref(false);
const visibility = computed({
  get: () => active.value && open.value,
  set: (value: boolean) => {
    open.value = active.value && value;
  },
});
watch(
  active,
  (enabled) => {
    if (!enabled) open.value = false;
  },
  { flush: "sync" }
);
onScopeDispose(() => {
  open.value = false;
});
</script>
<template>
  <QuasarButton
    :attrs="{
      class: className,
      'data-adapttable-part': 'filter-header-input',
      'aria-label': label,
      'aria-haspopup': 'dialog',
      'aria-expanded': visibility,
      dir,
    }"
    :label="summary"
  >
    <!-- Suspension unmounts QMenu so Quasar releases its portal and focus resources. -->
    <QMenu
      v-if="active"
      v-model="visibility"
      v-bind="{ role: 'dialog', 'aria-label': label, dir }"
      :class="['adapttable-quasar-filter-popover', menuClassName]"
      data-adapttable-part="filter-header-menu"
    >
      <QuasarCheckbox
        v-for="option in options"
        :key="option.value"
        :control="{
          label: option.label,
          checked: selected.includes(option.value),
          attrs: { 'aria-label': option.label },
          onChange: (checked) => props.onToggle(option.value, checked),
        }"
      />
    </QMenu>
  </QuasarButton>
</template>
