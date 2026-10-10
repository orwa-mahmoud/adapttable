import {
  createMenuNavigation,
  type RowMoveMenuSlotProps,
  toVueAttrs,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UCard from "@nuxt/ui/components/Card.vue";
import UModal from "@nuxt/ui/components/Modal.vue";
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  type PropType,
  shallowRef,
  useId,
  watch,
} from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtManagedPopover from "../controls/NuxtManagedPopover";

/** Destination selection and confirmation belong to the shared controller. */
export const NuxtRowMoveMenu = /*#__PURE__*/ defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    const mounted = shallowRef(false);
    onMounted(() => {
      mounted.value = true;
    });
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLButtonElement | null>(null);
    const menuId = `adapttable-row-move-${useId()}`;
    const cancelButton = shallowRef<HTMLButtonElement | null>(null);
    const navigation = createMenuNavigation();
    let focusLast = false;
    let popup = 0;
    watch(
      open,
      (expanded) => {
        navigation.reset();
        if (expanded) popup++;
      },
      { flush: "sync" }
    );
    let lifetime = 0;
    watch(
      active,
      (live) => {
        lifetime++;
        if (!live) open.value = false;
      },
      { flush: "sync" }
    );
    const receiveTrigger = (element: HTMLButtonElement | null) => {
      trigger.value = element;
    };
    const receiveCancel = (element: HTMLButtonElement | null) => {
      cancelButton.value = element;
    };
    return () => {
      if (mounted.value && !active.value) return null;
      const ticket = lifetime;
      const current = () => active.value && ticket === lifetime;
      const session = popup;
      const menuCurrent = () => current() && session === popup;
      const confirmation = props.confirmation;
      const finish = (action: "onConfirm" | "onCancel") => {
        if (current() && props.confirmation === confirmation)
          confirmation?.[action]();
      };
      const restoreFocus = (event: Event) => {
        event.preventDefault();
        const element = trigger.value;
        const surface = event.target;
        if (!element || !current()) return;
        const doc = element.ownerDocument;
        const focused = doc.activeElement;
        if (
          focused !== doc.body &&
          focused !== element &&
          !(surface instanceof Node && surface.contains(focused))
        )
          return;
        void nextTick(() => {
          if (
            current() &&
            !props.confirmation &&
            element.isConnected &&
            !element.disabled &&
            (doc.activeElement === doc.body ||
              doc.activeElement === focused ||
              doc.activeElement === element)
          )
            element.focus();
        });
      };
      const items = props.items.map((item) =>
        h(
          NuxtButton,
          {
            key: item.id,
            attrs: {
              role: "menuitem",
              tabindex: -1,
              disabled: item.disabled,
              "aria-disabled": item.disabled,
              title: item.disabledReason,
              "data-adapttable-part": "row-move-menu-item",
              style: { justifyContent: "flex-start" },
              onClick: () => {
                if (
                  menuCurrent() &&
                  open.value &&
                  props.items.includes(item) &&
                  !item.disabled
                ) {
                  open.value = false;
                  item.onSelect();
                }
              },
            },
          },
          () => item.label
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
            "data-adapttable-part": "row-move-menu-trigger",
            disabled: props.items.every((item) => item.disabled),
            onClick: () => {
              if (current()) {
                focusLast = false;
                open.value = !open.value;
              }
            },
            onKeydown: (event: KeyboardEvent) => {
              if (
                current() &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
                event.preventDefault();
                focusLast = event.key === "ArrowUp";
                open.value = true;
              }
            },
          },
        },
        () => props.label
      );
      const menu = open.value
        ? h(NuxtManagedPopover, {
            control: {
              open: true,
              anchor: trigger.value,
              isCurrent: menuCurrent,
              onClose: () => {
                if (menuCurrent()) open.value = false;
              },
              attrs: {
                role: "dialog",
                "aria-label": props.label,
                onOpenAutoFocus: (event: Event) => {
                  event.preventDefault();
                  const root = event.target;
                  void nextTick(() => {
                    if (
                      !menuCurrent() ||
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
                  "data-adapttable-part": "row-move-menu-content",
                  class: "adapttable-nuxt-row-menu",
                  ui: { body: "adapttable-nuxt-row-menu-body" },
                  onKeydown: (event: KeyboardEvent) => {
                    if (
                      !menuCurrent() ||
                      !open.value ||
                      !(event.currentTarget instanceof HTMLElement)
                    )
                      return;
                    const buttons = [
                      ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                        'button[role="menuitem"]'
                      ),
                    ];
                    const focusTargets: readonly (
                      EventTarget | null | undefined
                    )[] = buttons;
                    const focused = focusTargets.indexOf(event.target);
                    const action = navigation.key(event, props.items, focused);
                    if (action?.kind === "focus") {
                      event.preventDefault();
                      event.stopPropagation();
                      buttons[action.index]?.focus();
                    } else if (
                      action?.kind === "close" &&
                      action.key === "Tab"
                    ) {
                      event.stopPropagation();
                      open.value = false;
                    }
                  },
                },
                () => items
              ),
            },
          })
        : null;
      const dialog = confirmation
        ? h(
            UModal,
            {
              open: true,
              title: confirmation.title,
              description: confirmation.description,
              close: false,
              transition: false,
              content: {
                ...toVueAttrs({
                  role: "dialog",
                  "data-adapttable-part": "row-move-confirmation",
                }),
                onOpenAutoFocus: (event: Event) => {
                  event.preventDefault();
                  void nextTick(() => {
                    if (current() && props.confirmation === confirmation)
                      cancelButton.value?.focus();
                  });
                },
                onCloseAutoFocus: restoreFocus,
              },
              "onUpdate:open": (value: boolean) => {
                if (!value) finish("onCancel");
              },
            },
            {
              footer: () => [
                h(
                  NuxtButton,
                  {
                    attrs: {
                      ref: receiveCancel,
                      "data-adapttable-part": "row-move-cancel",
                      onClick: () => finish("onCancel"),
                    },
                  },
                  () => confirmation.cancelLabel
                ),
                h(
                  NuxtButton,
                  {
                    attrs: {
                      "data-adapttable-part": "row-move-confirm",
                      onClick: () => finish("onConfirm"),
                    },
                  },
                  () => confirmation.confirmLabel
                ),
              ],
            }
          )
        : null;
      return h("span", { "data-adapttable-part": "row-move-menu" }, [
        menuTrigger,
        menu,
        dialog,
      ]);
    };
  },
  {
    name: "NuxtRowMoveMenu",
    props: {
      label: { type: String as PropType<RowMoveMenuSlotProps["label"]> },
      items: { type: Array as PropType<RowMoveMenuSlotProps["items"]> },
      confirmation: {
        type: Object as PropType<RowMoveMenuSlotProps["confirmation"]>,
      },
    },
  }
);
