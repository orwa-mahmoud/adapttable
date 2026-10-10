import {
  batchEditBarModel,
  type DisplayValue,
  resolveLabels,
  rowEditActionsLayout,
  rowEditControls,
} from "@adapttable/core";
import type {
  BatchEditBarProps as CoreBatchEditBarProps,
  RowEditActionsProps as CoreRowEditActionsProps,
} from "@adapttable/core/binding";
import { h, type VNodeChild } from "vue";

// Named aliases remain visible to Vue's SFC prop resolver after declaration bundling.
export type BatchEditBarProps<TRow> = CoreBatchEditBarProps<TRow>;
export type RowEditActionsProps<TRow> = CoreRowEditActionsProps<TRow>;
export interface EditingActionButtonProps {
  readonly icon?: DisplayValue | false;
  readonly label: string;
  readonly part: string;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly onClick: (event: { stopPropagation(): void }) => void;
}
export interface EditingActionSlots {
  readonly Button: (props: EditingActionButtonProps) => VNodeChild;
}
/** Shared row action structure; every actionable element remains kit supplied. */
export function RowEditActionsChrome<TRow>(
  props: RowEditActionsProps<TRow> & { readonly controls: EditingActionSlots }
): VNodeChild {
  const state = rowEditControls(props);
  const layout = rowEditActionsLayout(state, props.conflict, props.showBegin);
  if (layout.kind === "none") return null;
  if (typeof props.controls.Button !== "function")
    throw new Error(
      "AdaptTable: RowEditActionsChrome requires the Button control slot."
    );
  const pending =
    state.editing &&
    (props.rowEditing.commit?.phase === "saving" ||
      props.rowEditing.commit?.phase === "validating");
  const button = (
    label: string,
    part: string,
    run: () => void,
    disabled = false,
    icon?: DisplayValue | false
  ) =>
    props.controls.Button({
      label,
      part,
      icon,
      attrs: {
        type: "button",
        "aria-label": label,
        title: label,
        class: props.buttonClassName,
        disabled,
        "data-adapttable-part": part,
      },
      onClick: (event) => {
        event.stopPropagation();
        if (!disabled) run();
      },
    });
  const children: VNodeChild[] =
    layout.kind === "begin"
      ? [
          button(
            state.editLabel,
            "row-edit-begin",
            state.begin,
            false,
            props.icons?.begin
          ),
        ]
      : [
          layout.showSave
            ? button(
                state.saveLabel,
                "row-edit-save",
                state.save,
                pending,
                props.icons?.save
              )
            : null,
          button(
            state.cancelLabel,
            "row-edit-cancel",
            state.cancel,
            false,
            props.icons?.cancel
          ),
        ];
  if (state.editing && props.rowEditing.commit?.error)
    children.push(
      h(
        "span",
        { role: "status", "data-adapttable-part": "row-edit-error" },
        props.rowEditing.commit.error
      )
    );
  return h(
    "span",
    {
      class: props.className,
      "data-adapttable-part": "row-edit-actions",
      "aria-busy": pending || undefined,
    },
    children
  );
}
/** Staged edits are saved only through the required explicit batch controls. */
export function BatchEditBarChrome<TRow>(
  props: BatchEditBarProps<TRow> & { readonly controls: EditingActionSlots }
): VNodeChild {
  const model = batchEditBarModel(props.batch, props.contested, props.labels);
  if (!model) return null;
  if (typeof props.controls.Button !== "function")
    throw new Error(
      "AdaptTable: BatchEditBarChrome requires the Button control slot."
    );
  const labels = resolveLabels(props.labels);
  const pending =
    props.batch.commit?.phase === "saving" ||
    props.batch.commit?.phase === "validating";
  const button = (
    label: string,
    part: string,
    run: () => void,
    disabled = false
  ) =>
    props.controls.Button({
      label,
      part,
      attrs: {
        type: "button",
        "aria-label": label,
        class: props.buttonClassName,
        disabled,
        "data-adapttable-part": part,
      },
      onClick: (event) => {
        event.stopPropagation();
        if (!disabled) run();
      },
    });
  return h(
    "div",
    {
      class: props.className,
      "data-adapttable-part": "batch-edit-bar",
      "aria-busy": pending || undefined,
    },
    [
      h("output", { "data-adapttable-part": "batch-edit-count" }, model.count),
      model.conflictMessage
        ? h(
            "output",
            { "data-adapttable-part": "batch-edit-conflict" },
            model.conflictMessage
          )
        : button(
            model.saveLabel,
            "batch-edit-save",
            props.batch.saveAll,
            pending
          ),
      button(model.cancelLabel, "batch-edit-cancel", props.batch.cancelAll),
      props.batch.commit?.error
        ? h(
            "span",
            { role: "status", "data-adapttable-part": "batch-edit-error" },
            props.batch.commit.error
          )
        : null,
      pending ? h("span", { role: "status" }, labels.loading) : null,
    ]
  );
}
