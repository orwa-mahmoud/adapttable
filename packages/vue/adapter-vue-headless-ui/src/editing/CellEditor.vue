<script setup lang="ts" generic="TRow">
import {
  type EditableCellEditorProps,
  formatMultiDraft,
  readMultiDraft,
} from "@adapttable/vue/adapter";
import { Listbox, ListboxOption, ListboxOptions } from "@headlessui/vue";
import { h, shallowRef } from "vue";

import { useHeadlessClasses } from "../context";
import { headlessInput } from "../controls/basic";
import { headlessCheckbox } from "../controls/checkbox";
import { headlessSelect } from "../controls/select";
import { headlessTarget, useTargetAttrs } from "../controls/target";

const props = defineProps<{ control: EditableCellEditorProps<TRow> }>();
const names = useHeadlessClasses();
// This is the vendor popup's visibility, never a second editing controller.
const choiceOpen = shallowRef(false);
const onChoiceBlur = () => {
  if (!choiceOpen.value) props.control.onBlur();
};
const onListBlur = (event: FocusEvent) => {
  if (
    !(event.relatedTarget instanceof Node) ||
    !(event.currentTarget instanceof HTMLElement) ||
    !event.currentTarget.contains(event.relatedTarget)
  )
    props.control.onBlur();
};
const onListChange = (value: unknown) => {
  if (!Array.isArray(value)) return;
  const selected = value.filter(
    (item): item is string => typeof item === "string"
  );
  props.control.onChange(formatMultiDraft(selected));
};
const option = (item: { value: string; label: string }) =>
  h(
    ListboxOption,
    { key: item.value, value: item.value, class: "at-headless-listbox-item" },
    { default: () => item.label }
  );
const options = () => props.control.controller.selectOptions.map(option);
const listAttrs = useTargetAttrs(() => ({
  ...props.control.attrs,
  ref: props.control.editorRef,
  class: ["at-headless-listbox", names.value.editCellEditor],
}));
const listContent = () =>
  headlessTarget(
    ListboxOptions,
    {
      ...listAttrs(),
      static: true,
      onKeydown: props.control.onKeyDown,
      onFocusout: onListBlur,
    },
    { default: options }
  );
const multi = () =>
  h(
    Listbox,
    {
      multiple: true,
      modelValue: readMultiDraft(props.control.controller.draft),
      "onUpdate:modelValue": onListChange,
    },
    { default: listContent }
  );
const Render = () => {
  const control = props.control;
  const editor = control.controller.editor;
  const attrs = {
    ...control.attrs,
    ref: control.editorRef,
    class: names.value.editCellEditor,
    onKeydown: control.onKeyDown,
  };
  if (editor && typeof editor === "object") {
    if (editor.type === "multi-select") return multi();
    return headlessSelect({
      attrs: { ...attrs, onBlur: onChoiceBlur },
      value: control.controller.draft,
      options: control.controller.selectOptions,
      onChange: control.onChange,
      onOpenChange: (open) => {
        choiceOpen.value = open;
      },
    });
  }
  if (editor === "boolean")
    return headlessCheckbox({
      attrs: { ...attrs, onBlur: control.onBlur },
      checked: control.controller.draft === "true",
      onChange: (checked) => control.onChange(String(checked)),
    });
  return headlessInput({
    attrs: { ...attrs, onBlur: control.onBlur },
    type: editor === "datetime" ? "datetime-local" : (editor ?? "text"),
    value: control.controller.draft,
    onChange: control.onChange,
  });
};
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>
