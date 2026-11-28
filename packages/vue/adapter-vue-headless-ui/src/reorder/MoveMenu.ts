import {
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, type PropType, shallowRef, watch } from "vue";

import { headlessButton } from "../controls/basic";
import { HeadlessDialog } from "../controls/dialog";
import { HeadlessMenu, headlessMenuItem } from "../controls/menu";

function moveItems(props: RowMoveMenuSlotProps, current: () => boolean) {
  return props.items.map((item) =>
    headlessMenuItem(
      {
        key: item.id,
        title: item.disabledReason,
        "data-adapttable-part": "row-move-menu-item",
        onClick: () => {
          if (current() && props.items.includes(item) && !item.disabled)
            item.onSelect();
        },
      },
      () => item.label,
      item.disabled
    )
  );
}

export const HeadlessMoveMenu = defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    const trigger = shallowRef<HTMLElement | null>(null);
    // A new epoch closes the menu, which is how an open one is retired.
    const generation = shallowRef(0);
    const captureTrigger = (element: HTMLElement | null) => {
      trigger.value = element;
    };
    watch(
      active,
      () => {
        generation.value++;
      },
      { flush: "sync" }
    );
    return () => {
      const ticket = generation.value;
      const current = () => active.value && ticket === generation.value;
      const confirmation = props.confirmation;
      const cancel = () => {
        if (current() && props.confirmation === confirmation)
          confirmation?.onCancel();
      };
      const menu = h(
        HeadlessMenu,
        {
          epoch: ticket,
          triggerAttrs: {
            class: "at-headless-button",
            "data-adapttable-part": "row-move-menu-trigger",
            "aria-label": props.label,
            ref: captureTrigger,
          },
          itemsAttrs: {
            "data-adapttable-part": "row-move-menu-content",
            "aria-label": props.label,
          },
        },
        {
          trigger: () => props.label,
          default: () => moveItems(props, current),
        }
      );
      return h("span", { "data-adapttable-part": "row-move-menu" }, [
        menu,
        h(
          HeadlessDialog,
          {
            open: active.value && confirmation !== undefined,
            role: "alertdialog",
            showTitle: true,
            label: confirmation?.title ?? "",
            part: "row-move-confirmation",
            className: "at-headless-confirm-dialog",
            onClose: cancel,
            onClosed: () => {
              if (
                current() &&
                !props.confirmation &&
                trigger.value?.isConnected
              )
                trigger.value.focus();
            },
          },
          {
            default: () => [
              h(
                "p",
                { class: "at-headless-dialog-description" },
                confirmation?.description
              ),
              h("div", { class: "at-headless-dialog-actions" }, [
                headlessButton(
                  {
                    "data-adapttable-part": "row-move-cancel",
                    onClick: cancel,
                  },
                  confirmation?.cancelLabel
                ),
                headlessButton(
                  {
                    "data-adapttable-part": "row-move-confirm",
                    onClick: () => {
                      if (current() && props.confirmation === confirmation)
                        confirmation?.onConfirm();
                    },
                  },
                  confirmation?.confirmLabel
                ),
              ]),
            ],
          }
        ),
      ]);
    };
  },
  {
    name: "HeadlessMoveMenu",
    props: {
      label: { type: String as PropType<RowMoveMenuSlotProps["label"]> },
      items: { type: Array as PropType<RowMoveMenuSlotProps["items"]> },
      confirmation: {
        type: Object as PropType<RowMoveMenuSlotProps["confirmation"]>,
      },
    },
  }
);
