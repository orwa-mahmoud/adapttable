<script setup lang="ts">
import { cloneVNode, mergeProps, nextTick, shallowRef, type VNode } from "vue";
import { VCheckboxBtn } from "vuetify/components/VCheckbox";
import { VIcon } from "vuetify/components/VIcon";

import { controlAttrs, useControlRef } from "./controlRef";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly checked: boolean;
  readonly indeterminate?: boolean;
  readonly onChange: (checked: boolean) => void;
}>();
const input = shallowRef<HTMLElement>();
useControlRef(
  () => input.value,
  () => props.attrs
);
function captureInput(value: unknown): void {
  input.value = value instanceof HTMLElement ? value : undefined;
}
function restoreControlledState(event: Event): void {
  const target = event.currentTarget;
  if (!(target instanceof HTMLInputElement)) return;
  void nextTick(() => {
    target.checked = props.checked;
    target.indeterminate = props.indeterminate === true;
  });
}
function InputNode({ node }: { readonly node: VNode }): VNode {
  return cloneVNode(
    node,
    mergeProps(controlAttrs(props.attrs), {
      ref: captureInput,
      indeterminate: props.indeterminate === true,
      "aria-checked": props.indeterminate ? "mixed" : props.checked,
      onInput: restoreControlledState,
    }),
    true
  );
}
</script>

<template>
  <VCheckboxBtn
    :model-value="checked"
    :indeterminate="indeterminate"
    :disabled="attrs.disabled === true"
    :readonly="attrs.readonly === true"
    :multiple="false"
    density="compact"
    color="primary"
    class="adapttable-vuetify-checkbox"
    @update:model-value="onChange(Boolean($event))"
    @update:indeterminate="() => undefined"
  >
    <template #input="control">
      <VIcon v-if="control.icon" :icon="control.icon" aria-hidden="true" />
      <InputNode :node="control.inputNode" />
    </template>
  </VCheckboxBtn>
</template>
