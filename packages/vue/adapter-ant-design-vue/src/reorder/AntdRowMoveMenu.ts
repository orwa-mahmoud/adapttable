import {
  type RowMoveMenuSlotProps,
  scheduleTick,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { Modal, Select } from "ant-design-vue";
import {
  defineComponent,
  h,
  type PropType,
  shallowRef,
  useId,
  watch,
} from "vue";

import { antdButton } from "../controls/button";
import { popupContainer } from "../controls/popupContainer";
/** The shared controller owns target selection and pending confirmation. */
export const AntdRowMoveMenu = defineComponent(
  (props: RowMoveMenuSlotProps) => {
    const active = useScopeActivity();
    let lifetime = 0;
    watch(active, () => lifetime++, { flush: "sync" });
    const trigger = shallowRef<{ $forceUpdate(): void }>();
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
        h(Select, {
          ref: trigger,
          value: undefined,
          placeholder: props.label,
          "aria-label": props.label,
          "data-adapttable-part": "row-move-menu-trigger",
          getPopupContainer: popupContainer(false),
          // The list is the menu's content; the part names the element
          // that wraps it.
          dropdownRender: (menu) =>
            h("div", { "data-adapttable-part": "row-move-menu-content" }, [
              menu?.menuNode,
            ]),
          disabled: props.items.every((item) => item.disabled),
          options: props.items.map((item) => ({
            value: item.id,
            label: item.label,
            disabled: item.disabled,
            title: item.disabledReason,
            "data-adapttable-part": "row-move-menu-item",
          })),
          onChange: (value: unknown) => {
            if (!isCurrent()) return;
            const item = items.find((item) => item.id === value);
            if (item && !item.disabled) item.onSelect();
            scheduleTick(() => {
              if (isCurrent()) trigger.value?.$forceUpdate();
            });
          },
        }),
        owner
          ? h(
              Modal,
              {
                open: active.value,
                title: owner.title,
                closable: false,
                destroyOnClose: true,
                keyboard: true,
                // The dialog does not forward attributes, so its name, part
                // and description go on the wrapper that carries role=dialog.
                wrapProps: {
                  "data-adapttable-part": "row-move-confirmation",
                  "aria-describedby": description,
                  "aria-modal": "true",
                },
                width: "min(28rem, calc(100vw - 2rem))",
                getContainer: false,
                onCancel: () => finish("onCancel"),
              },
              {
                default: () => h("p", { id: description }, owner.description),
                footer: () => [
                  antdButton(
                    {
                      type: "button",
                      "data-adapttable-part": "row-move-cancel",
                      onClick: () => finish("onCancel"),
                    },
                    owner.cancelLabel
                  ),
                  antdButton(
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
  {
    name: "AntdRowMoveMenu",
    props: {
      label: { type: String as PropType<RowMoveMenuSlotProps["label"]> },
      items: { type: Array as PropType<RowMoveMenuSlotProps["items"]> },
      confirmation: {
        type: Object as PropType<RowMoveMenuSlotProps["confirmation"]>,
      },
    },
  }
);
