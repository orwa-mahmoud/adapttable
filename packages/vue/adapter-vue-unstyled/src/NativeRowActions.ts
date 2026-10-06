import type { RowActionControl } from "@adapttable/vue";
import type { RowActionsLayout } from "@adapttable/vue/adapter";
import { Fragment, h, mergeProps, type VNodeChild } from "vue";

import type { DataTableClassNames } from "./types";

/** The native menu keeps the binding's guarded action controls intact. */
export function NativeRowActions<TRow>(props: {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: DataTableClassNames;
}): VNodeChild {
  const actions = props.controls.map((action) =>
    h(
      "button",
      mergeProps(
        {
          key: action.key,
          class: [props.classNames.actionButton, props.classNames.rowAction],
          onClick: (event: MouseEvent) => {
            event.stopPropagation();
            if (action.attrs.disabled) return;
            const target = event.currentTarget;
            if (props.layout === "menu" && target instanceof HTMLElement)
              target
                .closest('[data-adapttable-part="row-actions-menu"]')
                ?.removeAttribute("open");
          },
        },
        action.attrs
      ),
      action.label
    )
  );
  if (props.layout !== "menu" || actions.length === 0)
    return h(Fragment, null, actions);
  return h(
    "details",
    {
      "data-adapttable-part": "row-actions-menu",
      class: props.classNames.rowActionsMenu,
      onPointerdown: (event: PointerEvent) => event.stopPropagation(),
      onKeydown: (event: KeyboardEvent) => {
        if (
          event.key !== "Escape" ||
          !(event.currentTarget instanceof HTMLDetailsElement) ||
          !event.currentTarget.open
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      },
    },
    [
      h(
        "summary",
        {
          "data-adapttable-part": "row-actions-trigger",
          class: props.classNames.rowActionsTrigger,
          "aria-label": props.label,
          onClick: (event: MouseEvent) => event.stopPropagation(),
        },
        "⋮"
      ),
      ...actions,
    ]
  );
}
NativeRowActions.props = ["controls", "layout", "label", "classNames"];
