import type { RowActionControl } from "@adapttable/vue";
import type { RowActionsLayout } from "@adapttable/vue/adapter";
import { Ellipsis } from "@lucide/vue";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import { Fragment, h, mergeProps } from "vue";

import { shadcnPortal } from "../lib/portal";
import { shadcnAction } from "../tableControls";

interface ActionClassNames {
  readonly actionButton?: string;
  readonly rowAction?: string;
  readonly rowActionsMenu?: string;
  readonly rowActionsTrigger?: string;
}

/** The binding guards actions; the kit owns menu navigation and presentation. */
export function ShadcnRowActions<TRow>(props: {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: ActionClassNames;
}) {
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
      props.controls.map((action) => shadcnAction(attrs(action), action.label))
    );
  const item = (action: RowActionControl<TRow>) =>
    h(
      DropdownMenuItem,
      {
        key: action.key,
        asChild: true,
        disabled: action.attrs.disabled === true,
      },
      () =>
        shadcnAction(
          mergeProps(attrs(action), {
            variant: "ghost",
            "data-slot": "dropdown-menu-item",
            class:
              "w-full justify-start border-0 data-highlighted:bg-accent data-highlighted:text-accent-foreground",
          }),
          action.label
        )
    );
  const content = () =>
    h(
      DropdownMenuContent,
      {
        "data-slot": "dropdown-menu-content",
        class:
          "adapttable-shadcn-vue z-50 min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
        sideOffset: 4,
        collisionPadding: 8,
        align: "end",
      },
      () => props.controls.map(item)
    );
  const trigger = () =>
    h(DropdownMenuTrigger, { asChild: true }, () =>
      shadcnAction(
        {
          variant: "ghost",
          size: "icon-sm",
          "data-adapttable-part": "row-actions-trigger",
          "aria-label": props.label,
          class: props.classNames.rowActionsTrigger,
        },
        h(Ellipsis, { class: "size-4", "aria-hidden": true })
      )
    );
  return h(
    "div",
    {
      "data-adapttable-part": "row-actions-menu",
      class: props.classNames.rowActionsMenu,
      onPointerdown: (event: PointerEvent) => event.stopPropagation(),
      onClick: (event: MouseEvent) => event.stopPropagation(),
    },
    [
      h(DropdownMenuRoot, null, () => [
        trigger(),
        shadcnPortal(DropdownMenuPortal, content),
      ]),
    ]
  );
}
ShadcnRowActions.props = ["controls", "layout", "label", "classNames"];
