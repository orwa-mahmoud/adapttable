import type { RowActionControl } from "@adapttable/vue";
import type {
  DataTableClassNames,
  RowActionsLayout,
} from "@adapttable/vue/adapter";
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from "element-plus";
import { Fragment, h, mergeProps, type VNodeChild } from "vue";

import { elementButton } from "./controls/button";

export function ElementRowActions<TRow>(props: {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: DataTableClassNames;
}): VNodeChild {
  const attrs = (action: RowActionControl<TRow>) =>
    mergeProps(
      {
        key: action.key,
        class: [props.classNames.actionButton, props.classNames.rowAction],
        onClick: (event: MouseEvent) => event.stopPropagation(),
      },
      action.attrs
    );
  if (props.layout !== "menu" || props.controls.length === 0)
    return h(
      Fragment,
      null,
      props.controls.map((action) => elementButton(attrs(action), action.label))
    );
  return h(
    ElDropdown,
    {
      trigger: "click",
      teleported: false,
      "data-adapttable-part": "row-actions-menu",
      class: props.classNames.rowActionsMenu,
      onPointerdown: (event: PointerEvent) => event.stopPropagation(),
    },
    {
      default: () =>
        elementButton(
          {
            "data-adapttable-part": "row-actions-trigger",
            class: props.classNames.rowActionsTrigger,
            "aria-label": props.label,
            onClick: (event: MouseEvent) => event.stopPropagation(),
          },
          "⋮"
        ),
      dropdown: () =>
        h(
          ElDropdownMenu,
          {},
          {
            default: () =>
              props.controls.map((action) =>
                h(
                  ElDropdownItem,
                  { ...attrs(action), type: undefined },
                  { default: () => action.label }
                )
              ),
          }
        ),
    }
  );
}
ElementRowActions.props = ["controls", "layout", "label", "classNames"];
