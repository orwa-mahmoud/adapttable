<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  useDataTableClassNames,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, type VNodeChild } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtCellEditor from "./NuxtCellEditor";
const props = defineProps<{
  editing: VueEditableCellProps<TRow>["editing"];
  row: VueEditableCellProps<TRow>["row"];
  column: VueEditableCellProps<TRow>["column"];
  rowId: VueEditableCellProps<TRow>["rowId"];
  rowIndex: VueEditableCellProps<TRow>["rowIndex"];
  rows: VueEditableCellProps<TRow>["rows"];
  columns: VueEditableCellProps<TRow>["columns"];
  rowKey: VueEditableCellProps<TRow>["rowKey"];
  editLabel: VueEditableCellProps<TRow>["editLabel"];
  undoLabel?: Exclude<VueEditableCellProps<TRow>["undoLabel"], undefined>;
  display?: Exclude<VueEditableCellProps<TRow>["display"], undefined>;
}>();
const names = useDataTableClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    h(
      NuxtButton,
      {
        attrs: {
          ref: control.activateRef,
          title: control.title,
          "aria-label": control.title,
          class: [control.className, names.value.editCellActivate],
          "data-adapttable-part": "edit-cell-activate",
          "data-save-status": control.saveStatus,
          "data-dirty": control.dirty ? "" : undefined,
          onClick: control.onClick,
          onDblclick: control.onDoubleClick,
          onKeydown: control.onKeyDown,
        },
      },
      () => control.display
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    if (editor && typeof editor === "object" && editor.type === "custom")
      return h(Fragment, [
        editor.render(editableCustomControl(model.value)) as VNodeChild,
      ]);
    return h(NuxtCellEditor<TRow>, {
      ...control,
      className: names.value.editCellEditor,
    });
  },
  Button: (control) =>
    h(
      NuxtButton,
      {
        attrs: {
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
      },
      () => control.label
    ),
};
const Render = () =>
  EditableCellChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
