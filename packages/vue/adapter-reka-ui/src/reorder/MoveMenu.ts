import {
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  useDirection,
} from "reka-ui";
import { defineComponent, h, shallowRef, watch } from "vue";

import { rekaButton } from "../controls/basic";
import { rekaPortal } from "../controls/portal";
import { rekaTarget } from "../controls/target";

export const RekaMoveMenu = defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    const dir = useDirection();
    const open = shallowRef(false);
    const trigger = shallowRef<HTMLElement | null>(null);
    let generation = 0;
    watch(
      active,
      (live) => {
        generation++;
        if (!live) open.value = false;
      },
      { flush: "sync" }
    );
    const captureTrigger = (element: HTMLElement | null) => {
      trigger.value = element;
    };
    return () => {
      const ticket = generation;
      const current = () => active.value && ticket === generation;
      const confirmation = props.confirmation;
      const cancel = () => {
        if (current() && props.confirmation === confirmation)
          confirmation?.onCancel();
      };
      const button = (confirm: boolean) =>
        confirm
          ? rekaButton(
              {
                "data-adapttable-part": "row-move-confirm",
                onClick: () => {
                  if (current() && props.confirmation === confirmation)
                    confirmation?.onConfirm();
                },
              },
              confirmation?.confirmLabel
            )
          : h(
              AlertDialogCancel,
              {
                class: "at-reka-button",
                "data-adapttable-part": "row-move-cancel",
              },
              { default: () => confirmation?.cancelLabel }
            );
      const menuItems = props.items.map((item) =>
        h(
          DropdownMenuItem,
          {
            key: item.id,
            disabled: item.disabled,
            title: item.disabledReason,
            class: "at-reka-menu-item",
            "data-adapttable-part": "row-move-menu-item",
            onSelect: () => {
              if (current() && props.items.includes(item) && !item.disabled)
                item.onSelect();
            },
          },
          { default: () => item.label }
        )
      );
      const menuContent = () =>
        h(
          DropdownMenuContent,
          {
            class: "at-reka-menu",
            "data-adapttable-part": "row-move-menu-content",
            "aria-label": props.label,
            sideOffset: 5,
            onCloseAutoFocus: (event: Event) => {
              if (!current() || props.confirmation) event.preventDefault();
            },
          },
          { default: () => menuItems }
        );
      const menuChildren = () => [
        rekaTarget(
          DropdownMenuTrigger,
          {
            ref: captureTrigger,
            class: "at-reka-button",
            "data-adapttable-part": "row-move-menu-trigger",
            "aria-label": props.label,
          },
          { default: () => props.label }
        ),
        rekaPortal(DropdownMenuPortal, menuContent),
      ];
      const confirmChildren = [
        h(AlertDialogTitle, null, { default: () => confirmation?.title }),
        h(AlertDialogDescription, null, {
          default: () => confirmation?.description,
        }),
        h("div", { class: "at-reka-dialog-actions" }, [
          button(false),
          button(true),
        ]),
      ];
      const confirmContent = () =>
        h(
          AlertDialogContent,
          {
            dir: dir.value,
            class: ["at-reka-surface", "at-reka-confirm-dialog"],
            "data-adapttable-part": "row-move-confirmation",
            onCloseAutoFocus: (event: Event) => {
              event.preventDefault();
              if (
                current() &&
                !props.confirmation &&
                trigger.value?.isConnected
              )
                trigger.value.focus();
            },
          },
          { default: () => confirmChildren }
        );
      const confirmPortal = () =>
        rekaPortal(AlertDialogPortal, () => [
          h(AlertDialogOverlay, { class: "at-reka-backdrop" }),
          confirmContent(),
        ]);
      return h("span", { "data-adapttable-part": "row-move-menu" }, [
        h(
          DropdownMenuRoot,
          {
            open: active.value && open.value,
            "onUpdate:open": (value: boolean) => {
              if (current()) open.value = value;
            },
          },
          { default: menuChildren }
        ),
        h(
          AlertDialogRoot,
          {
            open: active.value && confirmation !== undefined,
            "onUpdate:open": (value: boolean) => {
              if (!value) cancel();
            },
          },
          { default: confirmPortal }
        ),
      ]);
    };
  },
  { name: "RekaMoveMenu", props: ["label", "items", "confirmation"] }
);
