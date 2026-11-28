import type { RowActionControl } from "@adapttable/vue";
import {
  type DataTableClassNames,
  rowActionContent,
  type RowActionsLayout,
  scheduleTick,
  withProps,
} from "@adapttable/vue/adapter";
import { Dropdown, Menu, MenuItem } from "ant-design-vue";
import {
  createVNode,
  defineComponent,
  Fragment,
  h,
  mergeProps,
  shallowRef,
  type VNode,
} from "vue";

import { antdButton } from "./controls/button";
import { eventHandlers } from "./controls/handlers";
import { focusOnOpen, handleMenuKey } from "./controls/menuKeyboard";
import { popupContainer } from "./controls/popupContainer";

interface AntdRowActionsProps<TRow> {
  readonly controls: readonly RowActionControl<TRow>[];
  readonly layout?: RowActionsLayout;
  readonly label: string;
  readonly classNames: DataTableClassNames;
}
const actionProps = {
  controls: null,
  layout: null,
  label: null,
  classNames: null,
} satisfies Record<keyof AntdRowActionsProps<unknown>, unknown>;

const AntdRowActionsPresentation = defineComponent(
  (props: AntdRowActionsProps<unknown>) => {
    const trigger = shallowRef<HTMLElement | null>(null);
    // Ant Design Vue marks no expanded state on the trigger, so it is tracked
    // here and written to the button.
    const open = shallowRef(false);
    const focusMenu = focusOnOpen(scheduleTick);
    const setTrigger = (element: HTMLElement | null) => {
      trigger.value = element;
    };
    const returnToTrigger = () => {
      if (trigger.value?.isConnected)
        trigger.value.focus({ preventScroll: true });
    };
    const attrs = (action: RowActionControl<unknown>) =>
      mergeProps(
        {
          key: action.key,
          class: props.classNames.actionButton,
          onClick: (event: MouseEvent) => event.stopPropagation(),
        },
        action.attrs
      );
    const menuItem = (action: RowActionControl<unknown>) => {
      const { onClick, ...rest } = attrs(action);
      const handlers = eventHandlers<MouseEvent>(onClick);
      return h(
        MenuItem,
        {
          ...rest,
          type: undefined,
          onClick: (event: MouseEvent) => {
            returnToTrigger();
            for (const handler of handlers) handler(event);
          },
        },
        { default: () => action.label }
      );
    };
    return () => {
      if (props.layout !== "menu" || props.controls.length === 0)
        return h(
          Fragment,
          null,
          props.controls.map((action) =>
            antdButton(attrs(action), rowActionContent(action))
          )
        );
      return h(
        "span",
        {
          "data-adapttable-part": "row-actions-menu",
          class: props.classNames.rowActionsMenu,
          onPointerdown: (event: PointerEvent) => event.stopPropagation(),
        },
        [
          h(
            Dropdown,
            {
              trigger: ["click"],
              open: open.value,
              onOpenChange: (value: boolean) => {
                open.value = value;
              },
              // A controlled dropdown leaves closing on a chosen item to us.
              onOverlayClick: () => {
                open.value = false;
              },
              getPopupContainer: popupContainer(false),
              placement: "bottomRight",
            },
            {
              default: () =>
                antdButton(
                  {
                    ref: setTrigger,
                    "data-adapttable-part": "row-actions-trigger",
                    class: props.classNames.rowActionsTrigger,
                    "aria-label": props.label,
                    "aria-haspopup": "menu",
                    "aria-expanded": open.value,
                    onClick: (event: MouseEvent) => event.stopPropagation(),
                    onKeydown: (event: KeyboardEvent) => {
                      if (event.key === "ArrowDown" && !open.value) {
                        event.preventDefault();
                        open.value = true;
                      }
                    },
                  },
                  "⋮"
                ),
              overlay: () =>
                h(
                  Menu,
                  {
                    selectable: false,
                    ref: focusMenu,
                    onKeydown: (event: KeyboardEvent) => {
                      if (handleMenuKey(event)) return;
                      if (event.key === "Escape" && !event.defaultPrevented) {
                        event.preventDefault();
                        event.stopPropagation();
                        open.value = false;
                        returnToTrigger();
                      }
                    },
                  },
                  { default: () => props.controls.map(menuItem) }
                ),
            }
          ),
        ]
      );
    };
  },
  { name: "AntdRowActionsPresentation", props: actionProps }
);

/** A menu returns focus to its native trigger before an action opens another surface. */
export const AntdRowActions = /* @__PURE__ */ withProps(function AntdRowActions<
  TRow,
>(props: AntdRowActionsProps<TRow>): VNode {
  return createVNode(AntdRowActionsPresentation, { ...props });
}, actionProps);
