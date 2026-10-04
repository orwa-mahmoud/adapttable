import {
  BatchEditBarChrome,
  type BatchEditBarProps,
  type EditingActionButtonProps,
  RowEditActionsChrome,
  type RowEditActionsProps,
} from "@adapttable/vue/editing";
import { defineComponent, h, mergeProps, type VNodeChild } from "vue";

import { useClassNames } from "../classNamesContext";

function button(control: EditingActionButtonProps, className?: string) {
  return h(
    "button",
    mergeProps(control.attrs, {
      type: "button",
      class: className,
      onClick: control.onClick,
    }),
    [
      control.icon === false ? null : (control.icon as VNodeChild),
      control.label,
    ]
  );
}

export const NativeRowEditActions = defineComponent(
  <TRow>(props: RowEditActionsProps<TRow>) => {
    const names = useClassNames();
    return () =>
      RowEditActionsChrome({
        ...props,
        className: [props.className, names.value.rowEditActions]
          .filter(Boolean)
          .join(" "),
        controls: {
          Button: (control) => button(control, names.value.rowEditButton),
        },
      });
  },
  {
    name: "NativeRowEditActions",
    props: [
      "rowEditing",
      "row",
      "rowId",
      "labels",
      "conflict",
      "showBegin",
      "icons",
      "className",
      "buttonClassName",
    ],
  }
);

export const NativeBatchEditBar = defineComponent(
  <TRow>(props: BatchEditBarProps<TRow>) => {
    const names = useClassNames();
    return () =>
      BatchEditBarChrome({
        ...props,
        className: [props.className, names.value.batchEditBar]
          .filter(Boolean)
          .join(" "),
        controls: {
          Button: (control) => button(control, names.value.batchEditButton),
        },
      });
  },
  {
    name: "NativeBatchEditBar",
    props: ["batch", "contested", "labels", "className", "buttonClassName"],
  }
);
