import type { RowActionControl } from "@adapttable/vue";
import {
  createMenuNavigation,
  mergeVueAttrs,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UCard from "@nuxt/ui/components/Card.vue";
import {
  createVNode,
  defineComponent,
  Fragment,
  h,
  nextTick,
  shallowRef,
  useId,
  type VNode,
  watch,
} from "vue";

import NuxtButton from "./controls/NuxtButton.vue";
import NuxtManagedPopover from "./controls/NuxtManagedPopover";
import type { RowActionsControlProps } from "./rowActionsSlot";

const actionProps = {
  controls: null,
  layout: null,
  label: null,
  classNames: null,
} satisfies Record<keyof RowActionsControlProps<unknown>, unknown>;

const stop = (event: Event) => event.stopPropagation();

/** The binding guards each action; Nuxt UI owns the menu surface and its focus. */
const NuxtRowActionsPresentation = /*#__PURE__*/ defineComponent(
  (props: RowActionsControlProps<unknown>) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLButtonElement | null>(null);
    const menuId = `adapttable-row-actions-${useId()}`;
    const navigation = createMenuNavigation();
    let focusLast = false;
    watch(open, navigation.reset, { flush: "sync" });
    watch(
      active,
      (live) => {
        if (!live) open.value = false;
      },
      { flush: "sync" }
    );
    const receiveTrigger = (element: HTMLButtonElement | null) => {
      trigger.value = element;
    };
    const actionAttrs = (action: RowActionControl<unknown>) =>
      mergeVueAttrs(action.attrs, {
        class: [props.classNames.actionButton, props.classNames.rowAction],
        onClick: stop,
      });
    // Focus returns to the trigger before the action runs, so a surface the
    // action opens, such as its confirmation, restores focus to the trigger.
    const closeToTrigger = () => {
      open.value = false;
      trigger.value?.focus({ preventScroll: true });
    };
    const keydown = (event: KeyboardEvent) => {
      if (
        !active.value ||
        !open.value ||
        !(event.currentTarget instanceof HTMLElement)
      )
        return;
      const buttons = [
        ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
          'button[role="menuitem"]'
        ),
      ];
      const focusTargets: readonly (EventTarget | null | undefined)[] = buttons;
      const focused = focusTargets.indexOf(event.target);
      const action = navigation.key(
        event,
        buttons.map((button) => ({
          label: button.textContent ?? "",
          disabled: button.disabled,
        })),
        focused
      );
      if (action?.kind === "focus") {
        event.preventDefault();
        event.stopPropagation();
        buttons[action.index]?.focus();
      } else if (action?.kind === "close" && action.key === "Tab") {
        event.stopPropagation();
        open.value = false;
      }
    };
    return () => {
      if (props.layout !== "menu" || props.controls.length === 0)
        return h(
          Fragment,
          null,
          props.controls.map((action) =>
            h(
              NuxtButton,
              { key: action.key, attrs: actionAttrs(action) },
              () => action.label
            )
          )
        );
      const items = props.controls.map((action) =>
        h(
          NuxtButton,
          {
            key: action.key,
            attrs: mergeVueAttrs(
              {
                role: "menuitem",
                tabindex: -1,
                variant: "ghost",
                style: { justifyContent: "flex-start" },
                onClick: closeToTrigger,
              },
              actionAttrs(action)
            ),
          },
          () => action.label
        )
      );
      const menuTrigger = h(
        NuxtButton,
        {
          attrs: {
            ref: receiveTrigger,
            "aria-label": props.label,
            "aria-haspopup": "menu",
            "aria-expanded": open.value,
            "aria-controls": open.value ? menuId : undefined,
            "data-adapttable-part": "row-actions-trigger",
            class: props.classNames.rowActionsTrigger,
            variant: "ghost",
            onClick: (event: MouseEvent) => {
              event.stopPropagation();
              if (!active.value) return;
              focusLast = false;
              open.value = !open.value;
            },
            onKeydown: (event: KeyboardEvent) => {
              if (
                active.value &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
                event.preventDefault();
                focusLast = event.key === "ArrowUp";
                open.value = true;
              }
            },
          },
        },
        () => h("span", { "aria-hidden": "true" }, "⋮")
      );
      const menu = open.value
        ? h(NuxtManagedPopover, {
            control: {
              open: true,
              anchor: trigger.value,
              isCurrent: () => active.value,
              onClose: () => {
                open.value = false;
              },
              attrs: {
                role: "dialog",
                "aria-label": props.label,
                onOpenAutoFocus: (event: Event) => {
                  event.preventDefault();
                  const root = event.target;
                  void nextTick(() => {
                    if (
                      !active.value ||
                      !open.value ||
                      !(root instanceof HTMLElement)
                    )
                      return;
                    const enabled = root.querySelectorAll<HTMLButtonElement>(
                      'button[role="menuitem"]:not([disabled])'
                    );
                    enabled.item(focusLast ? enabled.length - 1 : 0)?.focus();
                  });
                },
              },
              content: h(
                UCard,
                {
                  id: menuId,
                  as: "div",
                  role: "menu",
                  "aria-label": props.label,
                  class: "adapttable-nuxt-row-menu",
                  ui: { body: "adapttable-nuxt-row-menu-body" },
                  onKeydown: keydown,
                },
                () => items
              ),
            },
          })
        : null;
      return h(
        "span",
        {
          "data-adapttable-part": "row-actions-menu",
          class: props.classNames.rowActionsMenu,
          onPointerdown: stop,
          onClick: stop,
        },
        [menuTrigger, menu]
      );
    };
  },
  { name: "NuxtRowActions", props: actionProps }
);

/** Inline action buttons, or a Nuxt UI menu behind one trigger for `layout: "menu"`. */
export function NuxtRowActions<TRow>(
  props: RowActionsControlProps<TRow>
): VNode {
  return createVNode(NuxtRowActionsPresentation, { ...props });
}
NuxtRowActions.props = actionProps;
