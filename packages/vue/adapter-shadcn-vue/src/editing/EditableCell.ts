import {
  EditableCellChrome,
  type EditableCellChromeSlots,
  editableCustomControl,
  editorInputType,
  formatMultiDraft,
  readMultiDraft,
  useDataTableClassNames,
  useEditableCellModel,
  type VueEditableCellProps,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  Fragment,
  h,
  type SetupContext,
  type VNodeChild,
} from "vue";

import { Checkbox } from "../components/checkbox";
import {
  shadcnControlAttrs,
  shadcnInput,
  shadcnMultiSelect,
  shadcnSelect,
} from "../controls";
import { shadcnAction } from "../tableControls";

const propNames = [
  "editing",
  "row",
  "column",
  "rowId",
  "rowIndex",
  "rows",
  "columns",
  "rowKey",
  "editLabel",
  "undoLabel",
  "display",
] satisfies (keyof VueEditableCellProps<unknown>)[];

const EditableCellPresentation = defineComponent(
  (props: VueEditableCellProps<unknown>) => {
    const names = useDataTableClassNames();
    const model = useEditableCellModel(() => props);
    const controls: EditableCellChromeSlots<unknown> = {
      Activate: (control) =>
        shadcnAction(
          {
            variant: "ghost",
            type: "button",
            title: control.title,
            "aria-label": control.title,
            ref: control.activateRef,
            class: [control.className, names.value.editCellActivate],
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
        const attrs = {
          ...control.attrs,
          ref: control.editorRef,
          class: names.value.editCellEditor,
          onBlur: control.onBlur,
          onKeydown: control.onKeyDown,
        };
        if (editor && typeof editor === "object") {
          if (editor.type === "custom")
            return h(Fragment, [
              editor.render(editableCustomControl(model.value)) as VNodeChild,
            ]);
          const options = control.controller.selectOptions;
          return editor.type === "multi-select"
            ? shadcnMultiSelect({
                attrs,
                value: readMultiDraft(control.controller.draft),
                options,
                onChange: (value) =>
                  control.onChange(formatMultiDraft([...value])),
              })
            : shadcnSelect({
                attrs,
                value: control.controller.draft,
                options,
                onChange: control.onChange,
              });
        }
        if (editor === "boolean")
          return h(Checkbox, {
            ...shadcnControlAttrs(attrs),
            modelValue: control.controller.draft === "true",
            "onUpdate:modelValue": (checked: boolean | "indeterminate") =>
              control.onChange(String(checked === true)),
          });
        return shadcnInput({
          attrs: { ...attrs, type: editorInputType(editor) },
          value: control.controller.draft,
          onChange: control.onChange,
        });
      },
      Button: (control) =>
        shadcnAction(
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
    return () =>
      EditableCellChrome({
        model: model.value,
        controls,
        classNames: names.value,
      });
  },
  { name: "ShadcnEditableCellPresentation", props: propNames }
);

/** The generic façade retains row typing without traversing framework-neutral SFC macros. */
export function EditableCell<TRow>(
  props: VueEditableCellProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(EditableCellPresentation, { ...context.attrs, ...props });
}
EditableCell.props = propNames;
