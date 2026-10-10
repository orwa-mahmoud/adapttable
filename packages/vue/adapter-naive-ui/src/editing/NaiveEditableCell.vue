<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  elementRef,
  useDataTableClassNames,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, mergeProps, type VNodeChild } from "vue";

import { naiveButton } from "../controls/button";
import { naiveCheckbox } from "../controls/checkbox";
import { naiveInput } from "../controls/input";
import { NaiveChoiceEditor } from "./NaiveChoiceEditor";
import { NaiveNumberEditor } from "./NaiveNumberEditor";

const props = defineProps<VueEditableCellProps<TRow>>();
const names = useDataTableClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    naiveButton(
      {
        title: control.title,
        "aria-label": control.title,
        class: [control.className, names.value.editCellActivate],
        ref: elementRef(control.activateRef),
        "data-adapttable-part": "edit-cell-activate",
        "data-save-status": control.saveStatus,
        "data-dirty": control.dirty ? "" : undefined,
        onClick: control.onClick,
        onDblclick: control.onDoubleClick,
        onKeydown: control.onKeyDown,
      },
      control.display,
      { text: true }
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    const attrs = mergeProps(control.attrs, {
      ref: elementRef<HTMLElement>(control.editorRef),
      class: names.value.editCellEditor,
      onBlur: control.onBlur,
      onKeydown: control.onKeyDown,
    });
    if (editor && typeof editor === "object") {
      if (editor.type === "custom")
        return h(Fragment, [
          editor.render(editableCustomControl(model.value)) as VNodeChild,
        ]);
      return h(NaiveChoiceEditor, {
        attrs,
        draft: control.controller.draft,
        multiple: editor.type === "multi-select",
        options: control.controller.selectOptions,
        onChange: control.onChange,
        onBlur: control.onBlur,
        onKeyDown: control.onKeyDown,
      });
    }
    if (editor === "number")
      return h(NaiveNumberEditor, {
        attrs,
        draft: control.controller.draft,
        onChange: control.onChange,
        onBlur: control.onBlur,
      });
    if (editor === "boolean")
      return naiveCheckbox({
        attrs,
        checked: control.controller.draft === "true",
        indeterminate: false,
        onToggle: () =>
          control.onChange(String(control.controller.draft !== "true")),
      });
    return naiveInput({
      attrs: {
        ...attrs,
        type: editor === "datetime" ? "datetime-local" : (editor ?? "text"),
      },
      value: control.controller.draft,
      onChange: control.onChange,
    });
  },
  Button: (control) =>
    naiveButton(
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

<template>
  <Render />
</template>
