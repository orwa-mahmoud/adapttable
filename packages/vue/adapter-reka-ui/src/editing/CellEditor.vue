<script setup lang="ts" generic="TRow">
import {
  type EditableCellEditorProps,
  formatMultiDraft,
  readMultiDraft,
} from "@adapttable/vue/adapter";
import { ListboxContent, ListboxItem, ListboxRoot, Primitive } from "reka-ui";
import { h, shallowRef } from "vue";

import { useRekaClasses } from "../context";
import { rekaInput } from "../controls/basic";
import { rekaCheckbox } from "../controls/checkbox";
import { rekaSelect } from "../controls/select";
import { useTargetAttrs } from "../controls/target";

const props = defineProps<{ control: EditableCellEditorProps<TRow> }>();
const names = useRekaClasses();
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
    ListboxItem,
    { key: item.value, value: item.value, class: "at-reka-listbox-item" },
    { default: () => item.label }
  );
const options = () => props.control.controller.selectOptions.map(option);
const listAttrs = useTargetAttrs(() => ({
  ...props.control.attrs,
  ref: props.control.editorRef,
  class: ["at-reka-listbox", names.value.editCellEditor],
}));
const listTarget = () =>
  h(Primitive, { ...listAttrs(), as: "div" }, { default: options });
const listContent = () =>
  h(
    ListboxContent,
    {
      asChild: true,
      onKeydown: props.control.onKeyDown,
      onFocusout: onListBlur,
    },
    { default: listTarget }
  );
const multi = () =>
  h(
    ListboxRoot,
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
    return rekaSelect({
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
    return rekaCheckbox({
      attrs: { ...attrs, onBlur: control.onBlur },
      checked: control.controller.draft === "true",
      onChange: (checked) => control.onChange(String(checked)),
    });
  return rekaInput({
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
