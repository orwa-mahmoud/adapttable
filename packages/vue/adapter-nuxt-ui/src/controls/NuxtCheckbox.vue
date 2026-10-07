<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs } from "@adapttable/vue/adapter";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";
import { computed, shallowRef } from "vue";

import { useNuxtControlSize } from "../densityContext";
import { controlRef, withoutAttrs } from "./attrs";
import { useControlElementRef } from "./useControlElementRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: {
    readonly attrs: Attrs;
    readonly checked: boolean | "indeterminate";
    readonly label?: string;
    readonly onChange: (checked: boolean) => void;
    readonly focusRef?: ElementRef<HTMLButtonElement>;
  };
  className?: string;
}>();
const host = shallowRef<HTMLElement | null>(null);
const size = useNuxtControlSize();
const attrs = computed(() =>
  toVueAttrs(withoutAttrs(props.control.attrs, ["ref"]))
);
useControlElementRef(
  // UCheckbox has no public native ref. This adapter-owned host contains only
  // that control; its public checkbox role identifies the interactive target.
  // Read the DOM without modifying vendor nodes or inspecting private state.
  () =>
    host.value?.querySelector<HTMLButtonElement>('button[role="checkbox"]') ??
    null,
  () => [
    props.control.focusRef,
    controlRef<HTMLButtonElement>(props.control.attrs.ref),
  ]
);
</script>

<template>
  <div ref="host" class="adapttable-nuxt-checkbox-host">
    <UCheckbox
      v-bind="attrs"
      :model-value="control.checked"
      :label="control.label"
      :size="size"
      :ui="{ base: className }"
      @update:model-value="(value) => control.onChange(value === true)"
    />
  </div>
</template>

<style>
@layer components {
  .adapttable-nuxt-checkbox-host {
    display: inline-flex;
  }
}
</style>
