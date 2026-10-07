<script setup lang="ts">
import { type CommandPaletteSlots, toVueAttrs } from "@adapttable/vue/adapter";
import { computed } from "vue";
import { VField } from "vuetify/components/VField";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly control: Parameters<CommandPaletteSlots["Input"]>[0]["inputProps"];
  readonly className?: string;
}>();
const attrs = computed(() => {
  const { value, onChange, ...rest } = props.control;
  return {
    ...toVueAttrs(rest),
    value,
    onInput: (event: Event) => {
      if (event.target instanceof HTMLInputElement)
        onChange(event.target.value);
    },
  };
});
</script>

<template>
  <VField variant="outlined">
    <template #default="field">
      <input
        v-bind="{ ...field.props, ...attrs }"
        :class="className"
        autofocus
      />
    </template>
  </VField>
</template>
