<script setup lang="ts" generic="TRow">
import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  useDataTableClassNames,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";
import QuasarCellEditor from "./QuasarCellEditor.vue";
const props = defineProps<{
  readonly editing: VueEditableCellProps<TRow>["editing"];
  readonly row: VueEditableCellProps<TRow>["row"];
  readonly column: VueEditableCellProps<TRow>["column"];
  readonly rowId: VueEditableCellProps<TRow>["rowId"];
  readonly rowIndex: VueEditableCellProps<TRow>["rowIndex"];
  readonly rows: VueEditableCellProps<TRow>["rows"];
  readonly columns: VueEditableCellProps<TRow>["columns"];
  readonly rowKey: VueEditableCellProps<TRow>["rowKey"];
  readonly editLabel: VueEditableCellProps<TRow>["editLabel"];
  readonly undoLabel?: Exclude<
    VueEditableCellProps<TRow>["undoLabel"],
    undefined
  >;
  readonly display?: Exclude<VueEditableCellProps<TRow>["display"], undefined>;
}>();
const names = useDataTableClassNames();
const model = useEditableCellModel(() => props);
const controls: EditableCellChromeSlots<TRow> = {
  Activate: (control) =>
    h(
      QuasarButton,
      {
        attrs: {
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
        focusRef: control.activateRef,
      },
      () => control.display
    ),
  Editor: (control) => {
    const editor = control.controller.editor;
    return editor && typeof editor === "object" && editor.type === "custom"
      ? (editor.render(editableCustomControl(model.value)) as VNodeChild)
      : h(QuasarCellEditor<TRow>, {
          ...control,
          className: names.value.editCellEditor,
        });
  },
  Button: (control) =>
    h(QuasarButton, {
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
      label: control.label,
    }),
};
const Render = () =>
  EditableCellChrome({ model: model.value, controls, classNames: names.value });
const renderProps: string[] = [];
Render.props = renderProps;
</script>
<template><Render /></template>
