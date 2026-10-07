import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  type EditingActionButtonProps,
  HistoryButtonsChrome,
  RowEditActionsChrome,
  type RowEditActionsProps,
  type ToolbarExtrasSlotProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import {
  createVNode,
  defineComponent,
  mergeProps,
  type SetupContext,
  type VNodeChild,
} from "vue";

import { shadcnButton } from "../controls";
import { shadcnAction } from "../tableControls";

function editingButton(control: EditingActionButtonProps, className?: string) {
  return shadcnAction(
    mergeProps(control.attrs, { class: className, onClick: control.onClick }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}
const rowProps = [
  "rowEditing",
  "row",
  "rowId",
  "labels",
  "className",
  "buttonClassName",
  "icons",
  "conflict",
  "showBegin",
] satisfies (keyof RowEditActionsProps<unknown>)[];
const RowActionsPresentation = defineComponent(
  (props: RowEditActionsProps<unknown>) => {
    const names = useDataTableClassNames();
    return () =>
      RowEditActionsChrome({
        ...props,
        className: [props.className, names.value.rowEditActions]
          .filter(Boolean)
          .join(" "),
        controls: {
          Button: (control) =>
            editingButton(control, names.value.rowEditButton),
        },
      });
  },
  { name: "ShadcnRowEditActionsPresentation", props: rowProps }
);
export function RowEditActions<TRow>(
  props: RowEditActionsProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(RowActionsPresentation, { ...context.attrs, ...props });
}
RowEditActions.props = rowProps;

const batchProps = [
  "batch",
  "contested",
  "labels",
  "className",
  "buttonClassName",
] satisfies (keyof BatchEditBarProps<unknown>)[];
const BatchBarPresentation = defineComponent(
  (props: BatchEditBarProps<unknown>) => {
    const names = useDataTableClassNames();
    return () =>
      BatchEditBarChrome({
        ...props,
        className: [props.className, names.value.batchEditBar]
          .filter(Boolean)
          .join(" "),
        controls: {
          Button: (control) =>
            editingButton(control, names.value.batchEditButton),
        },
      });
  },
  { name: "ShadcnBatchEditBarPresentation", props: batchProps }
);
export function BatchEditBar<TRow>(
  props: BatchEditBarProps<TRow>,
  context: Pick<SetupContext, "attrs">
) {
  return createVNode(BatchBarPresentation, { ...context.attrs, ...props });
}
BatchEditBar.props = batchProps;

export const HistoryButtons = defineComponent(
  (props: ToolbarExtrasSlotProps) => {
    const names = useDataTableClassNames();
    return () =>
      HistoryButtonsChrome({
        ...props,
        classNames: { ...names.value },
        slots: { Button: shadcnButton },
      });
  },
  {
    name: "ShadcnHistoryButtons",
    props: [
      "onUndo",
      "onRedo",
      "canUndo",
      "canRedo",
      "undoLabel",
      "redoLabel",
      "density",
      "onDensityChange",
      "labels",
      "classNames",
    ],
  }
);
