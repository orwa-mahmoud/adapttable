import {
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  ElDialog,
  ElOption,
  ElSelect,
  type SelectInstance,
} from "element-plus";
import { defineComponent, h, nextTick, shallowRef, useId, watch } from "vue";

import { elementButton } from "../controls/button";
/** The shared controller owns target selection and pending confirmation. */
export const ElementRowMoveMenu = defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    let lifetime = 0;
    watch(active, () => lifetime++, { flush: "sync" });
    const trigger = shallowRef<SelectInstance>();
    const description = `adapttable-row-move-${useId()}`;
    return () => {
      const live = active.value;
      const ticket = lifetime;
      const items = props.items;
      const owner = props.confirmation;
      const isCurrent = () => live && active.value && ticket === lifetime;
      const finish = (kind: "onConfirm" | "onCancel") => {
        if (!isCurrent() || !owner) return;
        if (
          props.confirmation?.onConfirm === owner.onConfirm &&
          props.confirmation.onCancel === owner.onCancel
        )
          owner[kind]();
      };
      return h("span", { "data-adapttable-part": "row-move-menu" }, [
        h(
          ElSelect,
          {
            ref: trigger,
            modelValue: "",
            placeholder: props.label,
            "aria-label": props.label,
            "data-adapttable-part": "row-move-menu-trigger",
            teleported: false,
            disabled: props.items.every((item) => item.disabled),
            validateEvent: false,
            "onUpdate:modelValue": (value: unknown) => {
              if (!isCurrent()) return;
              const item = items.find((item) => item.id === value);
              if (item && !item.disabled) item.onSelect();
              void nextTick(() => {
                if (isCurrent()) trigger.value?.$forceUpdate();
              });
            },
          },
          {
            default: () =>
              props.items.map((item) =>
                h(ElOption, {
                  key: item.id,
                  value: item.id,
                  label: item.label,
                  disabled: item.disabled,
                  title: item.disabledReason,
                  "data-adapttable-part": "row-move-menu-item",
                })
              ),
          }
        ),
        owner
          ? h(
              ElDialog,
              {
                modelValue: active.value,
                title: owner.title,
                showClose: false,
                destroyOnClose: true,
                "data-adapttable-part": "row-move-confirmation",
                "aria-describedby": description,
                width: "min(28rem, calc(100vw - 2rem))",
                appendToBody: false,
                beforeClose: () => finish("onCancel"),
              },
              {
                default: () => h("p", { id: description }, owner.description),
                footer: () => [
                  elementButton(
                    {
                      type: "button",
                      "data-adapttable-part": "row-move-cancel",
                      onClick: () => finish("onCancel"),
                    },
                    owner.cancelLabel
                  ),
                  elementButton(
                    {
                      type: "button",
                      "data-adapttable-part": "row-move-confirm",
                      onClick: () => finish("onConfirm"),
                    },
                    owner.confirmLabel
                  ),
                ],
              }
            )
          : null,
      ]);
    };
  },
  { name: "ElementRowMoveMenu", props: ["label", "items", "confirmation"] }
);
