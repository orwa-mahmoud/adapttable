import {
  type RowMoveMenuSlotProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, shallowRef, watch } from "vue";
import { VBtn } from "vuetify/components/VBtn";
import {
  VCard,
  VCardActions,
  VCardText,
  VCardTitle,
} from "vuetify/components/VCard";
import { VDialog } from "vuetify/components/VDialog";
import { VList, VListItem } from "vuetify/components/VList";
import { VMenu } from "vuetify/components/VMenu";

import { finishOverlayFocus } from "../actions/focusHandoff";
import { vuetifyButton } from "../controls";

/** Local open state is presentation-only; destinations and approval stay shared. */
export const VuetifyMoveMenu = defineComponent(
  (props: { readonly control: RowMoveMenuSlotProps }) => {
    const active = useScopeActivity();
    const open = shallowRef(false);
    const trigger = shallowRef<InstanceType<typeof VBtn> | null>(null);
    const card = shallowRef<InstanceType<typeof VCard> | null>(null);
    const list = shallowRef<InstanceType<typeof VList> | null>(null);
    const element = () => {
      const value: unknown = trigger.value?.$el;
      return value instanceof HTMLElement ? value : null;
    };
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
        const root: unknown = card.value?.$el;
        finishOverlayFocus(
          element(),
          root instanceof HTMLElement ? root : null,
          () => active.value && !props.control.confirmation
        );
      },
      { flush: "sync" }
    );
    const confirmation = (
      control: NonNullable<RowMoveMenuSlotProps["confirmation"]>,
      dir: "ltr" | "rtl",
      attach: HTMLElement | false
    ) => {
      const current = () =>
        active.value && props.control.confirmation === control;
      const cancel = () => {
        if (current()) control.onCancel();
      };
      const buttons = [
        vuetifyButton(
          {
            autofocus: true,
            "data-adapttable-part": "row-move-cancel",
            onClick: cancel,
          },
          control.cancelLabel
        ),
        vuetifyButton(
          {
            "data-adapttable-part": "row-move-confirm",
            onClick: () => {
              if (current()) control.onConfirm();
            },
          },
          control.confirmLabel
        ),
      ];
      const body = [
        h(VCardTitle, { tag: "h2" }, () => control.title),
        h(VCardText, {}, () => control.description),
        h(VCardActions, {}, () => buttons),
      ];
      return h(
        VDialog,
        {
          modelValue: true,
          attach,
          transition: false,
          maxWidth: "min(32rem, 90vw)",
          contentProps: {
            role: "alertdialog",
            "aria-label": control.title,
            "data-adapttable-part": "row-move-confirmation",
            dir,
          },
          dir,
          "onUpdate:modelValue": (value: boolean) => {
            if (!value) cancel();
          },
        },
        () => h(VCard, { ref: card, dir }, () => body)
      );
    };
    const renderItem = (item: RowMoveMenuSlotProps["items"][number]) =>
      h(
        VListItem,
        {
          key: item.id,
          link: true,
          disabled: item.disabled,
          role: "menuitem",
          "aria-disabled": item.disabled,
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
        () => item.label
      );
    const renderList = (dir: "ltr" | "rtl") =>
      h(
        VList,
        {
          ref: list,
          role: "menu",
          dir,
          "aria-label": props.control.label,
          "data-adapttable-part": "row-move-menu-content",
        },
        () => props.control.items.map(renderItem)
      );
    return () => {
      if (!active.value) return null;
      const dir =
        element()?.closest("[dir]")?.getAttribute("dir") === "rtl"
          ? "rtl"
          : "ltr";
      const fullscreen =
        typeof document === "undefined" ? null : document.fullscreenElement;
      const attach = fullscreen instanceof HTMLElement ? fullscreen : false;
      return [
        h(
          VMenu,
          {
            modelValue: open.value,
            attach,
            transition: false,
            closeOnContentClick: false,
            maxHeight: "min(70dvh, 640px)",
            maxWidth: "min(28rem, 90vw)",
            "onUpdate:modelValue": (value: boolean) => {
              if (active.value) open.value = value;
            },
            onAfterEnter: () => {
              if (active.value) list.value?.focus("first");
            },
          },
          {
            activator: ({ props: attrs }: { props: Record<string, unknown> }) =>
              h(
                VBtn,
                {
                  ...attrs,
                  ref: trigger,
                  type: "button",
                  variant: "text",
                  size: "small",
                  "data-adapttable-part": "row-move-menu-trigger",
                },
                () => props.control.label
              ),
            default: () => renderList(dir),
          }
        ),
        props.control.confirmation
          ? confirmation(props.control.confirmation, dir, attach)
          : null,
      ];
    };
  },
  { name: "VuetifyMoveMenu", props: ["control"] }
);
