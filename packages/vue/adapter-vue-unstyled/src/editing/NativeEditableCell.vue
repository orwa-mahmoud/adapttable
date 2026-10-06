<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  elementRef,
  formatMultiDraft,
  readMultiDraft,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, mergeProps, type VNodeChild } from "vue";

import { useClassNames } from "../classNamesContext";
defineOptions({ name: "NativeEditableCell" });
const props = defineProps<VueEditableCellProps<TRow>>();
const names = useClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    h(
      "button",
      {
        type: "button",
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
      [control.display]
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    const attrs = mergeProps(control.attrs, {
      ref: elementRef<HTMLInputElement | HTMLSelectElement>(control.editorRef),
      class: names.value.editCellEditor,
      onBlur: control.onBlur,
      onKeydown: control.onKeyDown,
    });
    if (editor && typeof editor === "object") {
      if (editor.type === "custom")
        return h(Fragment, [
          editor.render(editableCustomControl(model.value)) as VNodeChild,
        ]);
      const multiple = editor.type === "multi-select";
      return h(
        "select",
        {
          ...attrs,
          multiple,
          value: multiple
            ? readMultiDraft(control.controller.draft)
            : control.controller.draft,
          onChange: (event: Event) => {
            const element = event.currentTarget as HTMLSelectElement;
            control.onChange(
              multiple
                ? formatMultiDraft(
                    Array.from(
                      element.selectedOptions,
                      (option) => option.value
                    )
                  )
                : element.value
            );
          },
        },
        control.controller.selectOptions.map((option) =>
          h("option", { value: option.value, key: option.value }, option.label)
        )
      );
    }
    let type: string = editor ?? "text";
    if (editor === "boolean") type = "checkbox";
    if (editor === "datetime") type = "datetime-local";
    return h("input", {
      ...attrs,
      type,
      value: control.controller.draft,
      checked:
        editor === "boolean" ? control.controller.draft === "true" : undefined,
      onInput:
        editor === "boolean"
          ? undefined
          : (event: Event) => {
              control.onChange((event.currentTarget as HTMLInputElement).value);
            },
      onChange:
        editor === "boolean"
          ? (event: Event) => {
              control.onChange(
                String((event.currentTarget as HTMLInputElement).checked)
              );
            }
          : undefined,
    });
  },
  Button: (control) =>
    h(
      "button",
      {
        type: "button",
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
  EditableCellChrome({
    model: model.value,
    controls,
    classNames: names.value,
  });

// An explicit empty props list preserves all root attributes through this render component.
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template>
  <Render />
</template>
