<script setup lang="ts">
import { ChevronDownIcon } from "@lucide/vue";
import type { HTMLAttributes } from "vue";

import { forwardControlTarget } from "../../lib/forwardControlTarget";
import { cn } from "../../lib/utils";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  modelValue: string;
  elementRef?: (element: Element | null) => void;
  class?: NonNullable<HTMLAttributes["class"]>;
  hostClass?: NonNullable<HTMLAttributes["class"]>;
  dir?: "ltr" | "rtl";
}>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
function onChange(event: Event): void {
  const select = event.currentTarget;
  if (!(select instanceof HTMLSelectElement)) return;
  emit("update:modelValue", select.value);
  // Reconcile an unchanged controlled value after a rejected request.
  select.value = props.modelValue;
}
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
      :ref="forwardControlTarget(props.elementRef)"
      v-bind="$attrs"
      :value="props.modelValue"
      data-slot="native-select"
      :dir="props.dir"
      :class="
        cn(
          'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 h-9 w-full min-w-0 appearance-none rounded-md border bg-transparent ps-3 py-2 pe-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          props.class
        )
      "
      @change="onChange"
    >
      <slot />
    </select>
    <ChevronDownIcon
      class="text-muted-foreground pointer-events-none absolute top-1/2 end-3.5 size-4 -translate-y-1/2 opacity-50 select-none"
      aria-hidden="true"
      data-slot="native-select-icon"
    />
  </div>
</template>
