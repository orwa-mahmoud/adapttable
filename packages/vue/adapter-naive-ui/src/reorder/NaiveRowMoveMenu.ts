import {
  elementRef,
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { NCard, NModal } from "naive-ui";
import {
  type ComponentPublicInstance,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  useId,
  watch,
} from "vue";

import { naiveButton } from "../controls/button";
import { htmlRoot } from "../controls/elementTarget";
import { useNaiveModalEscape } from "../controls/modalEscape";
import { naiveSelect } from "../controls/select";

export const NaiveRowMoveMenu = /*#__PURE__*/ defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    const container = shallowRef<HTMLElement | null>(null);
    const trigger = shallowRef<HTMLElement | null>(null);
    const card = shallowRef<ComponentPublicInstance | null>(null);
    const escape = useNaiveModalEscape(() =>
      card.value ? htmlRoot(card.value) : null
    );
    const descriptionId = useId();
    let revision = 0;
    watch(
      [active, () => props.items, () => props.confirmation],
      () => {
        revision++;
      },
      { flush: "sync" }
    );
    const restore = () => {
      void nextTick(() => {
        if (active.value && !props.confirmation && trigger.value?.isConnected)
          trigger.value.focus();
      });
    };
    return () => {
      const ticket = revision;
      // Read activity on every render, even while no confirmation is visible.
      const live = active.value;
      const current = () => live && active.value && ticket === revision;
      const confirmation = props.confirmation;
      const finish = (accept: boolean) => {
        if (!current() || !confirmation || props.confirmation !== confirmation)
          return;
        if (accept) confirmation.onConfirm();
        else confirmation.onCancel();
        restore();
      };
      const content = confirmation
        ? [
            h("p", { id: descriptionId }, confirmation.description),
            // Native modal autofocus begins on the non-destructive choice.
            naiveButton(
              { onClick: () => finish(false) },
              confirmation.cancelLabel
            ),
            naiveButton(
              { onClick: () => finish(true) },
              confirmation.confirmLabel
            ),
          ]
        : [];
      return h(
        "span",
        {
          "data-adapttable-part": "row-move-menu",
          ref: elementRef<HTMLElement>((element) => {
            container.value = element;
          }),
        },
        [
          h("span", { "data-adapttable-part": "row-move-menu-content" }, [
            naiveSelect({
              attrs: {
                ref: (element: HTMLElement | null) => {
                  trigger.value = element;
                },
                "aria-label": props.label,
                placeholder: props.label,
                "data-adapttable-part": "row-move-menu-trigger",
                disabled: props.items.every((item) => item.disabled),
              },
              value: "",
              optionPart: "row-move-menu-item",
              // A destination list keeps disabled choices and their reasons visible.
              virtualScroll: false,
              options: props.items.map((item) => ({
                value: item.id,
                label: item.label,
                disabled: item.disabled,
                title: item.disabledReason,
              })),
              onChange: (key) => {
                if (!current()) return;
                const item = props.items.find((entry) => entry.id === key);
                if (item && !item.disabled) item.onSelect();
              },
            }),
          ]),
          confirmation && container.value
            ? h(
                NModal,
                {
                  show: live,
                  to: container.value,
                  autoFocus: true,
                  trapFocus: true,
                  maskClosable: false,
                  "onUpdate:show": (show: boolean) => {
                    if (!show && escape.allow()) finish(false);
                  },
                },
                {
                  default: () =>
                    h(
                      NCard,
                      {
                        ref: card,
                        role: "alertdialog",
                        onKeydownCapture: escape.capture,
                        "aria-modal": true,
                        "aria-label": confirmation.title,
                        "aria-describedby": descriptionId,
                        "data-adapttable-part": "row-move-confirmation",
                        title: confirmation.title,
                        style: { width: "min(28rem,calc(100vw - 2rem))" },
                      },
                      { default: () => content }
                    ),
                }
              )
            : null,
        ]
      );
    };
  },
  { name: "NaiveRowMoveMenu", props: ["label", "items", "confirmation"] }
);
