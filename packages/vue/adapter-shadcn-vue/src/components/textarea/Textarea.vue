<script setup lang="ts">
import { type HTMLAttributes, ref } from "vue";

import { useControlTarget } from "../../lib/useControlTarget";
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
  if (!(input instanceof HTMLTextAreaElement)) return;
  const value = input.value;
  if (props.modelValue === undefined) ownValue.value = value;
  emits("update:modelValue", value);
  // Keep a controlled input truthful when its host declines the request.
  input.value = String(props.modelValue ?? ownValue.value);
}
defineOptions({ name: "ShadcnTextarea" });
const targetRef = useControlTarget(() => props.elementRef);
</script>

<template>
  <textarea
    :ref="targetRef"
    :value="props.modelValue ?? ownValue"
    data-slot="textarea"
    :class="
      cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        props.class
      )
    "
    @input="onInput"
  />
</template>
