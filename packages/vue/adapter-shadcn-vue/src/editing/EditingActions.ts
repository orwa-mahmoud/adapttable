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
  type PropType,
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
const rowProps = {
  rowEditing: {
    type: Object as PropType<RowEditActionsProps<unknown>["rowEditing"]>,
  },
  row: { type: null },
  rowId: { type: String as PropType<RowEditActionsProps<unknown>["rowId"]> },
  labels: { type: Object as PropType<RowEditActionsProps<unknown>["labels"]> },
  className: {
    type: String as PropType<RowEditActionsProps<unknown>["className"]>,
  },
  buttonClassName: {
    type: String as PropType<RowEditActionsProps<unknown>["buttonClassName"]>,
  },
  icons: { type: Object as PropType<RowEditActionsProps<unknown>["icons"]> },
  conflict: {
    type: Object as PropType<RowEditActionsProps<unknown>["conflict"]>,
  },
  showBegin: {
    type: Boolean as PropType<RowEditActionsProps<unknown>["showBegin"]>,
    default: undefined,
  },
};
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
RowEditActions.props = Object.keys(rowProps) as (keyof typeof rowProps)[];

const batchProps = {
  batch: { type: Object as PropType<BatchEditBarProps<unknown>["batch"]> },
  contested: {
    type: Boolean as PropType<BatchEditBarProps<unknown>["contested"]>,
    default: undefined,
  },
  labels: { type: Object as PropType<BatchEditBarProps<unknown>["labels"]> },
  className: {
    type: String as PropType<BatchEditBarProps<unknown>["className"]>,
  },
  buttonClassName: {
    type: String as PropType<BatchEditBarProps<unknown>["buttonClassName"]>,
  },
};
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
BatchEditBar.props = Object.keys(batchProps) as (keyof typeof batchProps)[];

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
    props: {
      onUndo: { type: Function as PropType<ToolbarExtrasSlotProps["onUndo"]> },
      onRedo: { type: Function as PropType<ToolbarExtrasSlotProps["onRedo"]> },
      canUndo: {
        type: Boolean as PropType<ToolbarExtrasSlotProps["canUndo"]>,
        default: undefined,
      },
      canRedo: {
        type: Boolean as PropType<ToolbarExtrasSlotProps["canRedo"]>,
        default: undefined,
      },
      undoLabel: {
        type: String as PropType<ToolbarExtrasSlotProps["undoLabel"]>,
      },
      redoLabel: {
        type: String as PropType<ToolbarExtrasSlotProps["redoLabel"]>,
      },
      density: { type: String as PropType<ToolbarExtrasSlotProps["density"]> },
      onDensityChange: {
        type: Function as PropType<ToolbarExtrasSlotProps["onDensityChange"]>,
      },
      labels: { type: Object as PropType<ToolbarExtrasSlotProps["labels"]> },
      classNames: {
        type: Object as PropType<ToolbarExtrasSlotProps["classNames"]>,
      },
    },
  }
);
