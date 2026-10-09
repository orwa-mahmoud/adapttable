<script setup lang="ts">
import { type TableAssistantSlots, toVueAttrs } from "@adapttable/vue/adapter";
import UTextarea from "@nuxt/ui/components/Textarea.vue";
import { nextTick, onScopeDispose, shallowRef, watch } from "vue";

import { useNuxtControlSize } from "../densityContext";

// The host owns the draft: a change it rejects repaints through the model
// value of the textarea.
const props = defineProps<{
  control: Parameters<TableAssistantSlots["Composer"]>[0];
}>();
const size = useNuxtControlSize();
const presentation = shallowRef(props.control.value);
let revision = 0;

watch(
  () => props.control.value,
  (value) => {
    presentation.value = value;
  }
);
onScopeDispose(() => {
  revision++;
});

function update(value: unknown): void {
  const current = ++revision;
  presentation.value = typeof value === "string" ? value : "";
  props.control.onChange(presentation.value);
  void nextTick(() => {
    if (current === revision) presentation.value = props.control.value;
  });
}
</script>

<template>
  <UTextarea
    :model-value="presentation"
    :rows="2"
    :size="size"
    :disabled="control.disabled"
    :placeholder="control.placeholder"
    :class="['adapttable-nuxt-assistant-input', control.className]"
    v-bind="
      toVueAttrs({
        'data-adapttable-part': control.part,
        'aria-label': control.label,
        onKeydown: control.onKeyDown,
      })
    "
    @update:model-value="update"
  />
</template>
