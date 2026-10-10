<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

import { useClassNames } from "../classNamesContext";
import { elementButton } from "../controls/button";
import ElementCellEditor from "./ElementCellEditor";

defineOptions({ name: "ElementEditableCell" });
const props = defineProps<VueEditableCellProps<TRow>>();
const names = useClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    elementButton(
      {
        title: control.title,
        "aria-label": control.title,
        class: [control.className, names.value.editCellActivate],
        ref: control.activateRef,
        "data-adapttable-part": "edit-cell-activate",
        "data-save-status": control.saveStatus,
        "data-dirty": control.dirty ? "" : undefined,
        onClick: control.onClick,
        onDblclick: control.onDoubleClick,
        onKeydown: control.onKeyDown,
      },
      control.display
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    if (editor && typeof editor === "object" && editor.type === "custom")
      return h(Fragment, [
        editor.render(editableCustomControl(model.value)) as VNodeChild,
      ]);
    return h(ElementCellEditor<TRow>, {
      ...control,
      className: names.value.editCellEditor,
    });
  },
  Button: (control) =>
    elementButton(
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
  EditableCellChrome({ model: model.value, classNames: names.value, controls });
const renderProps: string[] = [];
Render.props = renderProps;
</script>

<template><Render /></template>
