import {
  elementRef,
  type RowMoveConfirmationProps,
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, nextTick, shallowRef, useId, watch } from "vue";

/** Native dialog lifetime; the neutral session-bound callbacks own the decision. */
const NativeRowMoveConfirmation = defineComponent(
  (props: {
    readonly confirmation: RowMoveConfirmationProps;
    readonly restoreFocus: () => void;
  }) => {
    const root = shallowRef<HTMLDialogElement | null>(null);
    const active = useScopeActivity();
    const cancel = shallowRef<HTMLButtonElement | null>(null);
    const confirm = shallowRef<HTMLButtonElement | null>(null);
    const descriptionId = useId();
    watch(
      [root, active],
      ([element, live], _old, cleanup) => {
        if (!element || !live) return;
        if (typeof element.showModal === "function") element.showModal();
        else element.setAttribute("open", "");
        let ownsSurface = true;
        void nextTick(() => {
          if (ownsSurface && active.value) cancel.value?.focus();
        });
        cleanup(() => {
          ownsSurface = false;
          if (typeof element.close === "function" && element.open)
            element.close();
          else element.removeAttribute("open");
        });
      },
      { flush: "post" }
    );
    const finish = (
      owner: RowMoveConfirmationProps,
      action: "onConfirm" | "onCancel"
    ) => {
      if (
        !active.value ||
        props.confirmation.onConfirm !== owner.onConfirm ||
        props.confirmation.onCancel !== owner.onCancel
      )
        return;
      owner[action]();
      props.restoreFocus();
    };
    return () => {
      const owner = props.confirmation;
      return h(
        "dialog",
        {
          ref: elementRef<HTMLDialogElement>((element) => {
            root.value = element;
          }),
          role: "alertdialog",
          "aria-modal": "true",
          "aria-label": owner.title,
          "aria-describedby": descriptionId,
          "data-adapttable-part": "row-move-confirmation",
          onCancel: (event: Event) => {
            event.preventDefault();
            finish(owner, "onCancel");
          },
          onKeydown: (event: KeyboardEvent) => {
            if (!active.value || event.defaultPrevented) return;
            if (event.key === "Tab") {
              const boundary = event.shiftKey ? confirm.value : cancel.value;
              const destination = event.shiftKey ? cancel.value : confirm.value;
              if (destination && event.target === boundary) {
                event.preventDefault();
                destination.focus();
              }
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              finish(owner, "onCancel");
            }
          },
        },
        [
          h("p", { id: descriptionId }, owner.description),
          h(
            "button",
            {
              type: "button",
              ref: elementRef<HTMLButtonElement>((element) => {
                confirm.value = element;
              }),
              onClick: () => finish(owner, "onConfirm"),
            },
            owner.confirmLabel
          ),
          h(
            "button",
            {
              type: "button",
              ref: elementRef<HTMLButtonElement>((element) => {
                cancel.value = element;
              }),
              onClick: () => finish(owner, "onCancel"),
            },
            owner.cancelLabel
          ),
        ]
      );
    };
  },
  { name: "NativeRowMoveConfirmation", props: ["confirmation", "restoreFocus"] }
);
export const NativeRowMoveMenu = defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const trigger = shallowRef<HTMLSelectElement | null>(null);
    const active = useScopeActivity();
    const restoreFocus = () => {
      void nextTick(() => {
        const element = trigger.value;
        if (
          active.value &&
          !props.confirmation &&
          element?.isConnected &&
          !element.disabled &&
          !element.ownerDocument.querySelector("dialog[open]")
        )
          element.focus();
      });
    };
    return () =>
      h("span", { "data-adapttable-part": "row-move-menu" }, [
        h("span", { "data-adapttable-part": "row-move-menu-content" }, [
          h(
            "select",
            {
              ref: elementRef<HTMLSelectElement>((element) => {
                trigger.value = element;
              }),
              "aria-label": props.label,
              "data-adapttable-part": "row-move-menu-trigger",
              disabled: props.items.every((item) => item.disabled),
              value: "",
              onChange: (event: Event) => {
                const target = event.target;
                if (!(target instanceof HTMLSelectElement)) return;
                const item = props.items.find(
                  (candidate) => candidate.id === target.value
                );
                target.value = "";
                if (active.value && item && !item.disabled) item.onSelect();
              },
            },
            [
              h("option", { value: "" }, props.label),
              ...props.items.map((item) =>
                h(
                  "option",
                  {
                    key: item.id,
                    value: item.id,
                    disabled: item.disabled,
                    title: item.disabledReason,
                    "data-adapttable-part": "row-move-menu-item",
                  },
                  item.label
                )
              ),
            ]
          ),
          props.confirmation
            ? h(NativeRowMoveConfirmation, {
                confirmation: props.confirmation,
                restoreFocus,
              })
            : null,
        ]),
      ]);
  },
  { name: "NativeRowMoveMenu", props: ["label", "items", "confirmation"] }
);
