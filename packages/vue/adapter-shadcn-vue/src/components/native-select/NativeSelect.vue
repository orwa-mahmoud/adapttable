<script setup lang="ts">
import { ChevronDownIcon } from "@lucide/vue";
import { computed, type HTMLAttributes, nextTick, onScopeDispose } from "vue";

import { useControlTarget } from "../../lib/useControlTarget";
import { cn } from "../../lib/utils";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  modelValue: string | readonly string[];
  multiple?: boolean;
  elementRef?: (element: Element | null) => void;
  class?: NonNullable<HTMLAttributes["class"]>;
  hostClass?: NonNullable<HTMLAttributes["class"]>;
  dir?: "ltr" | "rtl";
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string | readonly string[]];
}>();
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value: string | readonly string[]) => emit("update:modelValue", value),
});
let active = true;
onScopeDispose(() => {
  active = false;
});
function onChange(event: Event): void {
  const select = event.currentTarget;
  if (!(select instanceof HTMLSelectElement)) return;
  // Let Vue apply accepted controlled props before reconciling a rejected request.
  void nextTick(() => {
    if (!active || !select.isConnected) return;
    if (props.multiple) {
      const accepted = new Set(
        typeof props.modelValue === "string"
          ? [props.modelValue]
          : props.modelValue
      );
      for (const option of select.options)
        option.selected = accepted.has(option.value);
    } else {
      select.value =
        typeof props.modelValue === "string" ? props.modelValue : "";
    }
  });
}
const targetRef = useControlTarget(() => props.elementRef);
</script>

<template>
  <div
    :class="
      cn(
        'group/native-select relative w-fit has-[select:disabled]:opacity-50',
        props.hostClass
      )
    "
    data-slot="native-select-wrapper"
    :dir="props.dir"
  >
    <select
      :ref="targetRef"
      v-bind="$attrs"
      v-model="selectedValue"
      :multiple="props.multiple"
      data-slot="native-select"
      :dir="props.dir"
      :class="
        cn(
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent ps-3 py-2 pe-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          props.multiple && 'h-auto min-h-24 pe-3',
          props.class
        )
      "
      @change="onChange"
    >
      <slot />
    </select>
    <ChevronDownIcon
      v-if="!props.multiple"
      class="text-muted-foreground pointer-events-none absolute top-1/2 end-3.5 size-4 -translate-y-1/2 opacity-50 select-none"
      aria-hidden="true"
      data-slot="native-select-icon"
    />
  </div>
</template>
