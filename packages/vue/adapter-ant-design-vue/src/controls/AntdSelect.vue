<script setup lang="ts">
import { scheduleTick } from "@adapttable/vue/adapter";
import { Select } from "ant-design-vue";
import { shallowRef } from "vue";

import { useComboboxNaming } from "./comboboxNaming";
import { popupContainer } from "./popupContainer";

defineOptions({ inheritAttrs: false });
const {
  disabled = false,
  teleported = false,
  appendTo = undefined,
  ...props
} = defineProps<{
  value: string;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  teleported?: boolean;
  appendTo?: HTMLElement | string;
}>();
const emit = defineEmits<{
  change: [value: string];
  visibleChange: [open: boolean];
}>();
const control = shallowRef<{
  focus(): void;
  blur(): void;
  $forceUpdate(): void;
  readonly $el: unknown;
}>();
function change(value: unknown): void {
  if (typeof value === "string") emit("change", value);
  scheduleTick(() => control.value?.$forceUpdate());
}
const naming = useComboboxNaming(control);
// A parent ref resolves before this template ref does, so a focus requested
// while the select mounts waits a tick for it.
function focus(): void {
  if (control.value) control.value.focus();
  else scheduleTick(() => control.value?.focus());
}
defineExpose({
  focus,
  blur: () => control.value?.blur(),
});
</script>

<template>
  <Select
    ref="control"
    v-bind="naming.rootAttrs"
    :value="props.value === '' ? undefined : props.value"
    :options="props.options.map((option) => ({ ...option }))"
    :disabled="disabled"
    :get-popup-container="popupContainer(teleported, appendTo)"
    @keydown="naming.onKeydown"
    @dropdown-visible-change="(open: boolean) => emit('visibleChange', open)"
    @change="change"
  />
</template>
