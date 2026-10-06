<script setup lang="ts">
import { type HTMLAttributes, ref } from "vue";

import { forwardControlTarget } from "../../lib/forwardControlTarget";
import { cn } from "../../lib/utils";

const props = defineProps<{
  elementRef?: (element: Element | null) => void;
  defaultValue?: string | number;
  modelValue?: string | number;
  class?: NonNullable<HTMLAttributes["class"]>;
}>();
const emits = defineEmits<{
  "update:modelValue": [value: string | number];
}>();
const ownValue = ref(props.defaultValue ?? "");
function onInput(event: Event): void {
  const input = event.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const value = input.value;
  if (props.modelValue === undefined) ownValue.value = value;
  emits("update:modelValue", value);
  // Keep a controlled input truthful when its host declines the request.
  input.value = String(props.modelValue ?? ownValue.value);
}
defineOptions({ name: "ShadcnInput" });
</script>

<template>
  <input
    :ref="forwardControlTarget(props.elementRef)"
    :value="props.modelValue ?? ownValue"
    data-slot="input"
    :class="
      cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        props.class
      )
    "
    @input="onInput"
  />
</template>
