<script setup lang="ts">
import { QSelect } from "quasar";
import { computed, shallowRef, useId } from "vue";

import { quasarFieldAttrs, useQuasarControlRef } from "./controlAttrs";
import { useQuasarPresentation } from "./presentation";
import type { QuasarSelectControl } from "./types";

defineOptions({ inheritAttrs: false });
const props = defineProps<{
  control: QuasarSelectControl;
  className?: string;
}>();
const select = shallowRef<InstanceType<typeof QSelect> | null>(null);
const id = `adapttable-quasar-${useId()}`;
const targetRevision = shallowRef(0);
function refreshTarget(): void {
  targetRevision.value++;
}
const attrs = computed(() => ({
  for: id,
  ...quasarFieldAttrs(props.control.attrs),
  "aria-label": props.control.label,
}));
const target = computed(() => ({
  component: select.value,
  revision: targetRevision.value,
}));
useQuasarControlRef(
  () => {
    const component = target.value.component;
    if (!component) return null;
    const label: unknown = component.$el;
    // The standard label association follows Quasar's public `for` prop.
    // It does not depend on vendor class names or a private component ref.
    if (!(label instanceof HTMLLabelElement)) return null;
    return label.control instanceof HTMLInputElement ? label.control : null;
  },
  () => props.control.attrs,
  () => props.control.focusRef
);
const { presentation, update } = useQuasarPresentation(
  () => props.control.value,
  (value) => props.control.onChange(value)
);
</script>

<template>
  <QSelect
    ref="select"
    v-bind="attrs"
    :class="className"
    :model-value="presentation"
    :options="control.options"
    dropdown-icon="M7 10l5 5 5-5z"
    emit-value
    map-options
    outlined
    dense
    hide-bottom-space
    @update:model-value="update"
    @popup-show="refreshTarget"
    @popup-hide="refreshTarget"
    @blur="refreshTarget"
  />
</template>
