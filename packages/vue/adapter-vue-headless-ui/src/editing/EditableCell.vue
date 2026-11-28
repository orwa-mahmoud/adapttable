<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

import { useHeadlessClasses } from "../context";
import { headlessButton } from "../controls/basic";
import CellEditor from "./CellEditor.vue";

const props = defineProps<VueEditableCellProps<TRow>>();
const names = useHeadlessClasses();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    headlessButton(
      {
        title: control.title,
        "aria-description": control.title,
        class: [
          "at-headless-edit-value",
          control.className,
          names.value.editCellActivate,
        ],
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
    return h(CellEditor<TRow>, { control });
  },
  Button: (control) =>
    headlessButton(
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
Render.props = [] as string[];
</script>

<template>
  <Render />
</template>

<style>
.at-headless-button.at-headless-edit-value {
  justify-content: start;
  inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: inherit;
  white-space: normal;
  overflow-wrap: anywhere;
  cursor: text;
}
</style>
