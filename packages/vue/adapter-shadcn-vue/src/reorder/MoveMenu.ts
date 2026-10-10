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
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { shadcnPortal } from "../lib/portal";
import { shadcnAction } from "../tableControls";

export const ShadcnMoveMenu = defineComponent(
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
    const captureTrigger = (element: Element | null) => {
      trigger.value = element instanceof HTMLElement ? element : null;
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
          ? shadcnAction(
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
                asChild: true,
                "data-adapttable-part": "row-move-cancel",
              },
              { default: () => shadcnAction({}, confirmation?.cancelLabel) }
            );
      const menuItems = props.items.map((item) =>
        h(
          DropdownMenuItem,
          {
            key: item.id,
            disabled: item.disabled,
            title: item.disabledReason,
            asChild: true,
            "data-adapttable-part": "row-move-menu-item",
            onSelect: () => {
              if (current() && props.items.includes(item) && !item.disabled)
                item.onSelect();
            },
          },
          {
            default: () =>
              shadcnAction(
                {
                  variant: "ghost",
                  class: "w-full justify-start data-highlighted:bg-accent",
                  disabled: item.disabled,
                },
                item.label
              ),
          }
        )
      );
      const menuContent = () =>
        h(
          DropdownMenuContent,
          {
            "data-slot": "dropdown-menu-content",
            class:
              "adapttable-shadcn-vue z-50 min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md",
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
        h(DropdownMenuTrigger, { asChild: true }, () =>
          shadcnAction(
            {
              ref: captureTrigger,
              "data-adapttable-part": "row-move-menu-trigger",
              "aria-label": props.label,
            },
            props.label
          )
        ),
        shadcnPortal(DropdownMenuPortal, menuContent),
      ];
      const confirmChildren = [
        h(AlertDialogTitle, null, { default: () => confirmation?.title }),
        h(AlertDialogDescription, null, {
          default: () => confirmation?.description,
        }),
        h("div", { class: "flex flex-wrap justify-end gap-2" }, [
          button(false),
          button(true),
        ]),
      ];
      const confirmContent = () =>
        h(
          AlertDialogContent,
          {
            dir: dir.value,
            "data-slot": "alert-dialog-content",
            class:
              "adapttable-shadcn-vue fixed start-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 shadow-lg sm:max-w-lg rtl:translate-x-1/2",
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
        shadcnPortal(AlertDialogPortal, () => [
          h(AlertDialogOverlay, { class: "fixed inset-0 z-50 bg-black/50" }),
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
  {
    name: "ShadcnMoveMenu",
    props: {
      label: { type: String as PropType<RowMoveMenuSlotProps["label"]> },
      items: { type: Array as PropType<RowMoveMenuSlotProps["items"]> },
      confirmation: {
        type: Object as PropType<RowMoveMenuSlotProps["confirmation"]>,
      },
    },
  }
);
