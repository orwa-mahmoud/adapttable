import type { RowActionControl } from "@adapttable/vue";
import type { RowActionsLayout } from "@adapttable/vue/adapter";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  Primitive,
} from "reka-ui";
import { Fragment, h, mergeProps } from "vue";

import { rekaButton } from "./basic";
import { rekaTarget } from "./target";

interface ActionClassNames {
  readonly actionButton?: string;
  readonly rowAction?: string;
  readonly rowActionsMenu?: string;
  readonly rowActionsTrigger?: string;
}

/** Binding guards own availability; Reka owns menu navigation and dismissal. */
export function RekaRowActions<TRow>(props: {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: ActionClassNames;
}) {
  const actionAttrs = (action: RowActionControl<TRow>) =>
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
      props.controls.map((action) =>
        rekaButton(actionAttrs(action), action.label)
      )
    );
  const item = (action: RowActionControl<TRow>) =>
    rekaTarget(
      DropdownMenuItem,
      mergeProps(actionAttrs(action), {
        as: "button",
        type: "button",
        class: "at-reka-menu-item",
      }),
      { default: () => action.label }
    );
  const content = () =>
    h(
      DropdownMenuContent,
      {
        class: "at-reka-menu",
        sideOffset: 5,
        collisionPadding: 8,
        align: "end",
      },
      {
        default: () => props.controls.map(item),
      }
    );
  const trigger = () =>
    h(
      DropdownMenuTrigger,
      {
        "data-adapttable-part": "row-actions-trigger",
        class: [
          "at-reka-button",
          "at-reka-icon-button",
          props.classNames.rowActionsTrigger,
        ],
        "aria-label": props.label,
      },
      { default: () => "⋮" }
    );
  const menu = () =>
    h(DropdownMenuRoot, null, {
      default: () => [
        trigger(),
        h(DropdownMenuPortal, null, { default: content }),
      ],
    });
  return rekaTarget(
    Primitive,
    {
      as: "div",
      "data-adapttable-part": "row-actions-menu",
      class: props.classNames.rowActionsMenu,
      onPointerdown: (event: PointerEvent) => event.stopPropagation(),
      onClick: (event: MouseEvent) => event.stopPropagation(),
    },
    { default: menu }
  );
}
RekaRowActions.props = ["controls", "layout", "label", "classNames"];
