import type { RowActionControl } from "@adapttable/vue";
import {
  rowActionContent,
  type RowActionsLayout,
  withProps,
} from "@adapttable/vue/adapter";
import { Fragment, h, mergeProps } from "vue";

import { headlessButton } from "./basic";
import { HeadlessMenu, headlessMenuItem } from "./menu";
import { HeadlessPrimitive } from "./primitive";
import { headlessTarget } from "./target";

interface ActionClassNames {
  readonly actionButton?: string;
  readonly rowActionsMenu?: string;
  readonly rowActionsTrigger?: string;
}

/** Binding guards own availability; Headless UI owns menu navigation and dismissal. */
export const HeadlessRowActions = /* @__PURE__ */ withProps(
  function HeadlessRowActions<TRow>(props: {
    readonly controls: readonly RowActionControl<TRow>[];
    readonly layout?: RowActionsLayout;
    readonly label: string;
    readonly classNames: ActionClassNames;
  }) {
    const actionAttrs = (action: RowActionControl<TRow>) =>
      mergeProps(
        {
          key: action.key,
          class: props.classNames.actionButton,
          onClick: (event: MouseEvent) => event.stopPropagation(),
        },
        action.attrs
      );
    const menuItems = () =>
      props.controls.map((action) =>
        headlessMenuItem(actionAttrs(action), () => action.label)
      );
    if (props.layout !== "menu" || props.controls.length === 0)
      return h(
        Fragment,
        null,
        props.controls.map((action) =>
          headlessButton(actionAttrs(action), rowActionContent(action))
        )
      );
    return headlessTarget(
      HeadlessPrimitive,
      {
        as: "div",
        "data-adapttable-part": "row-actions-menu",
        class: props.classNames.rowActionsMenu,
        onPointerdown: (event: PointerEvent) => event.stopPropagation(),
        onClick: (event: MouseEvent) => event.stopPropagation(),
      },
      {
        default: () =>
          h(
            HeadlessMenu,
            {
              triggerAttrs: {
                "data-adapttable-part": "row-actions-trigger",
                class: [
                  "at-headless-button",
                  "at-headless-icon-button",
                  props.classNames.rowActionsTrigger,
                ],
                "aria-label": props.label,
              },
            },
            {
              trigger: () => "⋮",
              default: menuItems,
            }
          ),
      }
    );
  },
  ["controls", "layout", "label", "classNames"]
);
