<script setup lang="ts">
import type { Attrs, ElementRef } from "@adapttable/vue";
import { formatMultiDraft, readMultiDraft } from "@adapttable/vue/adapter";
import { QSelect } from "quasar";
import { computed, shallowRef, useId } from "vue";

import { quasarFieldAttrs, useQuasarControlRef } from "./controlAttrs";
import { useQuasarPresentation } from "./presentation";
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  attrs: Attrs;
  draft: string;
  label: string;
  options: readonly { readonly label: string; readonly value: string }[];
  onChange: (value: string) => void;
  focusRef?: ElementRef<HTMLInputElement>;
}>();
const select = shallowRef<InstanceType<typeof QSelect> | null>(null);
const id = `adapttable-quasar-${useId()}`;
const revision = shallowRef(0);
const attrs = computed(() => ({
  for: id,
  ...quasarFieldAttrs(props.attrs),
  "aria-label": props.label,
}));
const target = computed(() => ({
  component: select.value,
  revision: revision.value,
}));
useQuasarControlRef(
  () => {
    const component = target.value.component;
    if (!component) return null;
    const label: unknown = component.$el;
    return label instanceof HTMLLabelElement &&
      label.control instanceof HTMLInputElement
      ? label.control
      : null;
  },
  () => props.attrs,
  () => props.focusRef
);
const { presentation, update } = useQuasarPresentation(
  () => props.draft,
  (value) => props.onChange(value)
);
function change(value: unknown) {
  update(
    formatMultiDraft(
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : []
    )
  );
}
</script>
<template>
  <QSelect
    ref="select"
    v-bind="attrs"
    :model-value="readMultiDraft(presentation)"
    :options="options"
    multiple
    emit-value
    map-options
    outlined
    dense
    hide-bottom-space
    dropdown-icon="M7 10l5 5 5-5z"
    @update:model-value="change"
    @popup-show="revision++"
    @popup-hide="revision++"
    @blur="revision++"
  />
</template>
