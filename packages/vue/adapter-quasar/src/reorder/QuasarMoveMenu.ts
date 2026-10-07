import {
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import {
  QBtn,
  QCard,
  QCardActions,
  QCardSection,
  QDialog,
  QItem,
  QItemSection,
  QList,
  QMenu,
} from "quasar";
import { defineComponent, h, shallowRef, watch } from "vue";

import { finishOverlayFocus } from "../actions/focusHandoff";
import { focusMenuItem, moveMenuFocus } from "../actions/menuFocus";

export const QuasarMoveMenu = defineComponent(
  (props: { readonly control: RowMoveMenuSlotProps }) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<InstanceType<typeof QBtn> | null>(null);
    const card = shallowRef<InstanceType<typeof QCard> | null>(null);
    const list = shallowRef<InstanceType<typeof QList> | null>(null);
    const dir = shallowRef<"ltr" | "rtl">("ltr");
    watch(
      active,
      (live) => {
        if (!live) open.value = false;
      },
      { flush: "sync" }
    );
    watch(
      () => props.control.confirmation,
      (next, previous) => {
        if (next || !previous) return;
        const opener: unknown = trigger.value?.$el;
        const root: unknown = card.value?.$el;
        finishOverlayFocus(
          opener instanceof HTMLElement ? opener : null,
          root instanceof HTMLElement ? root : null,
          () => active.value && !props.control.confirmation
        );
      },
      { flush: "sync" }
    );
    const renderItem = (item: RowMoveMenuSlotProps["items"][number]) => {
      const label = () => item.label;
      const section = () => h(QItemSection, {}, label);
      return h(
        QItem,
        {
          key: item.id,
          clickable: true,
          disable: item.disabled,
          role: "menuitem",
          "aria-disabled": item.disabled,
          tabindex: -1,
          title: item.disabledReason,
          "data-adapttable-part": "row-move-menu-item",
          onClick: () => {
            if (
              active.value &&
              props.control.items.includes(item) &&
              !item.disabled
            ) {
              open.value = false;
              item.onSelect();
            }
          },
        },
        section
      );
    };
    const renderItems = () => props.control.items.map(renderItem);
    const renderList = () =>
      h(
        QList,
        {
          ref: list,
          role: "menu",
          "aria-label": props.control.label,
          "data-adapttable-part": "row-move-menu-content",
          onKeydown: moveMenuFocus,
        },
        renderItems
      );
    const renderMenu = () =>
      h(
        QMenu,
        {
          modelValue: open.value,
          transitionDuration: 0,
          dir: dir.value,
          onBeforeShow: () => {
            const element: unknown = trigger.value?.$el;
            if (element instanceof HTMLElement)
              dir.value =
                element.closest("[dir]")?.getAttribute("dir") === "rtl"
                  ? "rtl"
                  : "ltr";
          },
          "onUpdate:modelValue": (value: boolean) => {
            if (active.value) open.value = value;
          },
          onShow: () => {
            const element: unknown = list.value?.$el;
            if (active.value && element instanceof HTMLElement)
              focusMenuItem(element);
          },
        },
        renderList
      );
    const renderConfirmation = (
      confirmation: NonNullable<RowMoveMenuSlotProps["confirmation"]>
    ) => {
      const current = () =>
        active.value && props.control.confirmation === confirmation;
      const cancel = () => {
        if (current()) confirmation.onCancel();
      };
      const confirm = () => {
        if (current()) confirmation.onConfirm();
      };
      const body = [
        h("h2", confirmation.title),
        h("p", confirmation.description),
      ];
      const buttons = [
        h(QBtn, {
          label: confirmation.cancelLabel,
          autofocus: true,
          flat: true,
          noCaps: true,
          "data-adapttable-part": "row-move-cancel",
          onClick: cancel,
        }),
        h(QBtn, {
          label: confirmation.confirmLabel,
          color: "primary",
          noCaps: true,
          "data-adapttable-part": "row-move-confirm",
          onClick: confirm,
        }),
      ];
      const content = [
        h(QCardSection, {}, () => body),
        h(QCardActions, { align: "right" }, () => buttons),
      ];
      const surface = () => h(QCard, { ref: card }, () => content);
      return h(
        QDialog,
        {
          modelValue: true,
          noRefocus: true,
          transitionDuration: 0,
          role: "alertdialog",
          "aria-label": confirmation.title,
          dir: dir.value,
          "data-adapttable-part": "row-move-confirmation",
          "onUpdate:modelValue": (value: boolean) => {
            if (!value) cancel();
          },
        },
        surface
      );
    };
    return () =>
      !active.value
        ? null
        : [
            h(
              QBtn,
              {
                ref: trigger,
                label: props.control.label,
                flat: true,
                noCaps: true,
                "aria-haspopup": "menu",
                "aria-expanded": open.value,
                "data-adapttable-part": "row-move-menu-trigger",
              },
              renderMenu
            ),
            props.control.confirmation
              ? renderConfirmation(props.control.confirmation)
              : null,
          ];
  },
  { name: "QuasarMoveMenu", props: ["control"] }
);
