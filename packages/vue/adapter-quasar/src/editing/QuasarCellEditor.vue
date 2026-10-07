<script setup lang="ts" generic="TRow">
import {
  type EditableCellEditorProps,
  editorInputType,
} from "@adapttable/vue/adapter";
import { computed, shallowRef } from "vue";

import QuasarCheckbox from "../controls/QuasarCheckbox.vue";
import QuasarInput from "../controls/QuasarInput.vue";
import QuasarMultiSelect from "../controls/QuasarMultiSelect.vue";
import QuasarSelect from "../controls/QuasarSelect.vue";
const props = defineProps<
  EditableCellEditorProps<TRow> & { className?: string }
>();
const inputType = computed(() => editorInputType(props.controller.editor));
const popup = shallowRef(false);
const attrs = computed(() => ({
  ...props.attrs,
  class: props.className,
  onBlur: props.onBlur,
  onKeydownCapture: (event: KeyboardEvent) => {
    if (!popup.value && !event.defaultPrevented) props.onKeyDown(event);
  },
  onPopupShow: () => {
    popup.value = true;
  },
  onPopupHide: () => {
    popup.value = false;
  },
}));
const checkboxAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs.value };
  delete rest.onBlur;
  return {
    ...rest,
    onFocusout: (event: FocusEvent) => {
      // QCheckbox can move pointer focus within its public root. Only leaving
      // the complete control is an editor blur; no vendor internals are read.
      const root = event.currentTarget;
      if (
        root instanceof HTMLElement &&
        event.relatedTarget instanceof Node &&
        root.contains(event.relatedTarget)
      )
        return;
      props.onBlur();
    },
  };
});
</script>
<template>
  <QuasarCheckbox
    v-if="controller.editor === 'boolean'"
    :control="{
      attrs: checkboxAttrs,
      label,
      checked: controller.draft === 'true',
      onChange: (value) => onChange(String(value)),
      focusRef: editorRef,
    }"
  />
  <QuasarMultiSelect
    v-else-if="
      controller.editor &&
      typeof controller.editor === 'object' &&
      controller.editor.type === 'multi-select'
    "
    :attrs="attrs"
    :draft="controller.draft"
    :label="label"
    :options="controller.selectOptions"
    :on-change="onChange"
    :focus-ref="editorRef"
  />
  <QuasarSelect
    v-else-if="controller.editor && typeof controller.editor === 'object'"
    :control="{
      attrs,
      label,
      value: controller.draft,
      options: controller.selectOptions,
      onChange,
      focusRef: editorRef,
    }"
  />
  <QuasarInput
    v-else
    :control="{
      attrs,
      label,
      value: controller.draft,
      type: inputType,
      onChange,
      focusRef: editorRef,
    }"
  />
</template>
