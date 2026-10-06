import type { RowActionControl } from "@adapttable/vue";
import type {
  DataTableClassNames,
  RowActionsLayout,
} from "@adapttable/vue/adapter";
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from "element-plus";
import {
  createVNode,
  defineComponent,
  Fragment,
  h,
  mergeProps,
  shallowRef,
  type VNode,
} from "vue";

import { elementButton } from "./controls/button";

interface ElementRowActionsProps<TRow> {
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
} satisfies Record<keyof ElementRowActionsProps<unknown>, unknown>;

const ElementRowActionsPresentation = defineComponent(
  (props: ElementRowActionsProps<unknown>) => {
    const trigger = shallowRef<HTMLElement | null>(null);
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
          class: [props.classNames.actionButton, props.classNames.rowAction],
          onClick: (event: MouseEvent) => event.stopPropagation(),
        },
        action.attrs
      );
    const menuItem = (action: RowActionControl<unknown>) =>
      h(
        ElDropdownItem,
        {
          ...mergeProps({ onClick: returnToTrigger }, attrs(action)),
          type: undefined,
        },
        { default: () => action.label }
      );
    return () => {
      if (props.layout !== "menu" || props.controls.length === 0)
        return h(
          Fragment,
          null,
          props.controls.map((action) =>
            elementButton(attrs(action), action.label)
          )
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
                ref: setTrigger,
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
              { default: () => props.controls.map(menuItem) }
            ),
        }
      );
    };
  },
  { name: "ElementRowActionsPresentation", props: actionProps }
);

/** A menu returns focus to its native trigger before an action opens another surface. */
export function ElementRowActions<TRow>(
  props: ElementRowActionsProps<TRow>
): VNode {
  return createVNode(ElementRowActionsPresentation, { ...props });
}
ElementRowActions.props = actionProps;
