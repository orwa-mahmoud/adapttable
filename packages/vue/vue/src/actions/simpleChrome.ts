import type { ToolbarExtrasSlotProps } from "@adapttable/core/binding";
import { h, type VNodeChild } from "vue";

import type {
  ActionButton,
  ActionPresentation,
  BulkActionsModel,
} from "./contracts";
export interface ActionButtonSlots {
  readonly Button: (props: ActionButton) => VNodeChild;
}
export type BulkActionsSlots = ActionButtonSlots;
export interface BulkActionsChromeProps extends ActionPresentation {
  readonly model: BulkActionsModel;
  readonly slots: BulkActionsSlots;
}
export function BulkActionsChrome(props: BulkActionsChromeProps): VNodeChild {
  if (typeof props.slots.Button !== "function")
    throw new Error(
      "AdaptTable: BulkActionsChrome requires the Button control slot."
    );
  const { model, slots, labels, classNames: names } = props;
  if (!model.count) return null;
  const button = (
    label: string,
    part: string | undefined,
    className: string | undefined,
    onClick: () => void,
    disabled = false,
    title?: string,
    appearance?: { readonly color?: string; readonly icon?: VNodeChild }
  ) =>
    slots.Button({
      label,
      icon: appearance?.icon,
      attrs: {
        type: "button",
        "data-adapttable-part": part,
        class: className,
        disabled,
        title,
        "data-color": appearance?.color,
        onClick,
      },
    });
  const banner = model.banner;
  return h(
    "div",
    {
      "data-adapttable-part": "bulk-bar",
      class: names?.bulkBar,
      dir: props.dir,
      role: "region",
      "aria-label": labels.selectedCount(model.count),
    },
    [
      h(
        "output",
        { class: names?.bulkCount },
        labels.selectedCount(model.count)
      ),
      banner.expandable || banner.scope?.allMatching
        ? h(
            "div",
            {
              "data-adapttable-part": "select-all-banner",
              class: names?.selectAllBanner,
            },
            [
              h(
                "span",
                {
                  "data-adapttable-part": "select-all-text",
                  class: names?.selectAllText,
                },
                banner.banner.text
              ),
              button(
                banner.banner.action,
                "select-all-button",
                names?.selectAllButton,
                banner.banner.command === "clear"
                  ? model.clear
                  : model.selectAllMatching,
                model.pending !== null
              ),
            ]
          )
        : null,
      ...model.actions.map((action) =>
        h("span", { key: action.key }, [
          button(
            action.label,
            "bulk-button",
            names?.bulkButton,
            () => model.run(action),
            model.pending !== null || Boolean(model.disabledReason(action)),
            model.disabledReason(action),
            { color: action.color, icon: action.icon as VNodeChild }
          ),
        ])
      ),
      button(
        labels.clearAll,
        undefined,
        names?.bulkClear,
        model.clear,
        model.pending !== null
      ),
      model.pending
        ? h(
            "span",
            {
              role: "status",
              "aria-live": "polite",
            },
            labels.loading
          )
        : null,
      model.error
        ? h(
            "span",
            {
              role: "alert",
              "data-adapttable-part": "bulk-error",
              class: names?.bulkError,
            },
            model.error
          )
        : null,
    ]
  );
}
export interface PrintChromeProps extends ActionPresentation {
  readonly onPrint: () => void;
  readonly slots: ActionButtonSlots;
}
export function PrintChrome(props: PrintChromeProps): VNodeChild {
  if (typeof props.slots.Button !== "function")
    throw new Error(
      "AdaptTable: PrintChrome requires the Button control slot."
    );
  return props.slots.Button({
    label: props.labels.print,
    attrs: {
      type: "button",
      "data-adapttable-part": "print-button",
      class: props.classNames?.printButton,
      onClick: props.onPrint,
    },
  });
}

export interface HistoryButtonsChromeProps extends ToolbarExtrasSlotProps {
  readonly slots: ActionButtonSlots;
}
export function HistoryButtonsChrome(
  props: HistoryButtonsChromeProps
): VNodeChild {
  if (typeof props.slots.Button !== "function")
    throw new Error(
      "AdaptTable: HistoryButtonsChrome requires the Button control slot."
    );
  if (!props.onUndo && !props.onRedo) return null;
  return h(
    "span",
    {
      class: props.classNames?.editHistory,
    },
    [
      props.onUndo
        ? props.slots.Button({
            label: props.undoLabel ?? props.labels.undoEdit,
            attrs: {
              type: "button",
              "data-adapttable-part": "undo-button",
              class: props.classNames?.undoButton,
              "aria-label": props.undoLabel,
              disabled: !props.canUndo,
              onClick: props.onUndo,
            },
          })
        : null,
      props.onRedo
        ? props.slots.Button({
            label: props.redoLabel ?? props.labels.redoEdit,
            attrs: {
              type: "button",
              "data-adapttable-part": "redo-button",
              class: props.classNames?.redoButton,
              "aria-label": props.redoLabel,
              disabled: !props.canRedo,
              onClick: props.onRedo,
            },
          })
        : null,
    ]
  );
}
