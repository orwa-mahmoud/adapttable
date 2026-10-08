import {
  type ActionPresentation,
  ContextMenuChrome,
  type ContextMenuModel,
  type ContextMenuPresentation,
  type ContextMenuPresentationProps,
  createMenuNavigation,
  toVueAttrs,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UCard from "@nuxt/ui/components/Card.vue";
import UPopover from "@nuxt/ui/components/Popover.vue";
import USeparator from "@nuxt/ui/components/Separator.vue";
import { defineComponent, h, onMounted, watch } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";

/** Nuxt owns the surface; core owns menu navigation and Chrome owns dispatch. */
export const NuxtContextMenuSurface = /*#__PURE__*/ defineComponent(
  (props: {
    readonly control: ContextMenuPresentationProps;
    readonly dir?: "ltr" | "rtl";
    readonly classNames?: Readonly<Record<string, string | undefined>>;
  }) => {
    const active = useScopeActivity();
    const navigation = createMenuNavigation();
    let opener: HTMLElement | null = null;
    let outside = false;
    let closing = false;
    let surface: HTMLElement | null = null;
    onMounted(() => {
      const element =
        props.control.anchorRef.current?.ownerDocument.activeElement;
      if (element instanceof HTMLElement) opener = element;
    });
    watch(
      [active, () => props.control.at, () => props.control.items],
      navigation.reset,
      { flush: "sync" }
    );
    const entries = () =>
      [
        ...(surface?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ??
          []),
      ].filter((item) => item.closest('[role="menu"]') === surface);
    const keydown = (event: KeyboardEvent) => {
      if (
        !active.value ||
        !props.control.isCurrent() ||
        !(event.target instanceof Element) ||
        event.target.closest('[role="menu"]') !== surface ||
        event.key === "Escape"
      )
        return;
      const items = entries();
      const action = navigation.key(
        event,
        items.map((item) => ({
          label: item.textContent ?? "",
          disabled: item.disabled,
        })),
        items.findIndex((item) => item === surface?.ownerDocument.activeElement)
      );
      if (!action) return;
      if (action.kind !== "close" || action.key !== "Tab")
        event.preventDefault();
      event.stopPropagation();
      if (action.kind === "close") {
        outside = action.key === "Tab";
        closing = true;
        props.control.onClose();
      } else items[action.index]?.focus({ preventScroll: true });
    };
    const renderBody = (control: ContextMenuPresentationProps) =>
      control.items.flatMap(({ item, onSelect }) => [
        item.separatorBefore
          ? h(USeparator, {
              key: `${item.key}-separator`,
              decorative: false,
              "data-adapttable-part": "context-menu-separator",
              class: props.classNames?.contextMenuSeparator,
            })
          : null,
        h(
          NuxtButton,
          {
            key: item.key,
            attrs: {
              role: "menuitem",
              tabindex: -1,
              disabled: item.disabled,
              "aria-disabled": item.disabled,
              "data-danger": item.danger ? "" : undefined,
              "data-adapttable-part": "context-menu-item",
              class: props.classNames?.contextMenuItem,
              variant: "ghost",
              color: item.danger ? "error" : "neutral",
              onClick: () => {
                if (control.isCurrent()) {
                  closing = true;
                  outside = false;
                  onSelect();
                }
              },
            },
          },
          () => item.label
        ),
      ]);
    return () => {
      const control = props.control;
      if (!active.value || !control.isCurrent()) return null;
      const reference = {
        getBoundingClientRect: () =>
          new DOMRect(control.at.x, control.at.y, 0, 0),
      };
      return h(
        UPopover,
        {
          open: true,
          reference,
          portal: control.container ?? true,
          content: {
            ...toVueAttrs({
              dir: props.dir,
              "aria-label": control.label,
            }),
            align: "start",
            side: "bottom",
            sideOffset: 0,
            positionStrategy: "fixed",
            onOpenAutoFocus: (event: Event) => {
              event.preventDefault();
              if (event.target instanceof HTMLElement)
                surface = event.target.querySelector<HTMLElement>(
                  '[data-adapttable-part="context-menu"]'
                );
              if (control.isCurrent())
                entries()
                  .find((item) => !item.disabled)
                  ?.focus({ preventScroll: true });
            },
            onInteractOutside: () => {
              outside = true;
            },
            onEscapeKeyDown: () => {
              outside = false;
            },
            onCloseAutoFocus: (event: Event) => {
              event.preventDefault();
              const focused = opener?.ownerDocument.activeElement;
              if (
                closing &&
                !outside &&
                opener?.isConnected &&
                (focused === opener.ownerDocument.body ||
                  focused === opener ||
                  surface?.contains(focused ?? null))
              )
                opener.focus();
            },
          },
          ui: { content: "bg-transparent ring-0 shadow-none" },
          "onUpdate:open": (open: boolean) => {
            if (!open && active.value && control.isCurrent()) {
              closing = true;
              control.onClose();
            }
          },
        },
        {
          content: () =>
            h(
              UCard,
              {
                role: "menu",
                tabindex: -1,
                dir: props.dir,
                "aria-label": control.label,
                "data-adapttable-part": "context-menu",
                class: ["adapttable-nuxt-context-menu", control.className],
                ui: { body: "adapttable-nuxt-context-body" },
                onKeydown: keydown,
              },
              () => renderBody(control)
            ),
        }
      );
    };
  },
  { name: "NuxtContextMenuSurface", props: ["control", "dir", "classNames"] }
);

export default /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: ContextMenuModel }) => {
    const presentation: ContextMenuPresentation = (control) =>
      h(NuxtContextMenuSurface, {
        control,
        dir: props.dir,
        classNames: props.classNames,
      });
    return () =>
      h(ContextMenuChrome, {
        items: props.model.items,
        at: props.model.at,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.contextMenu,
        container: props.container,
        presentation,
      });
  },
  {
    name: "NuxtContextMenu",
    props: ["model", "labels", "dir", "container", "classNames"],
  }
);
