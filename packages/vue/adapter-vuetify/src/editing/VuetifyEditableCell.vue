<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  editorInputType,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

import { useClassNames } from "../classNamesContext";
import { vuetifyButton } from "../controls";
import VuetifyCheckbox from "../controls/VuetifyCheckbox.vue";
import VuetifyInput from "../controls/VuetifyInput.vue";
import VuetifyEditorSelect from "./VuetifyEditorSelect.vue";

const props = defineProps<VueEditableCellProps<TRow>>();
const names = useClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    vuetifyButton(
      {
        title: control.title,
        "aria-label": control.title,
        "data-adapttable-part": "edit-cell-activate",
        "data-save-status": control.saveStatus,
        "data-dirty": control.dirty ? "" : undefined,
        class: [control.className, names.value.editCellActivate],
        ref: control.activateRef,
        onClick: control.onClick,
        onDblclick: control.onDoubleClick,
        onKeydown: control.onKeyDown,
      },
      control.display
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    const attrs = {
      ...control.attrs,
      class: [control.attrs.class, names.value.editCellEditor],
      ref: control.editorRef,
    };
    if (editor && typeof editor === "object") {
      if (editor.type === "custom")
        return h(Fragment, [
          editor.render(editableCustomControl(model.value)) as VNodeChild,
        ]);
      return h(VuetifyEditorSelect, {
        attrs,
        value: control.controller.draft,
        options: control.controller.selectOptions,
        multiple: editor.type === "multi-select",
        onChange: control.onChange,
        onBlur: control.onBlur,
        onKeyDown: control.onKeyDown,
      });
    }
    const nativeAttrs = {
      ...attrs,
      onBlur: control.onBlur,
      onKeydown: control.onKeyDown,
    };
    if (editor === "boolean")
      return h(VuetifyCheckbox, {
        attrs: nativeAttrs,
        checked: control.controller.draft === "true",
        onChange: (value: boolean) => control.onChange(String(value)),
      });
    return h(VuetifyInput, {
      attrs: nativeAttrs,
      type: editorInputType(editor ?? null),
      value: control.controller.draft,
      onChange: control.onChange,
    });
  },
  Button: (control) =>
    vuetifyButton(
      {
        class: [
          control.className,
          control.part === "edit-cell-rollback"
            ? names.value.editCellRollback
            : names.value.editCellConflictButton,
        ],
        "data-adapttable-part": control.part,
        onMousedown: control.onMouseDown,
        onClick: control.onClick,
      },
      control.label
    ),
};
const Render = () =>
  EditableCellChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
