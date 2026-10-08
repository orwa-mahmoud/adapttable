import "./nuxtWorkspace.css";

import {
  type ActionPresentation,
  CommandPaletteChrome,
  type CommandPaletteModel,
  type CommandPaletteSlots,
  managedCommandPaletteSurface,
  type ManagedCommandPaletteSurfaceProps,
  toVueAttrs,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import UModal from "@nuxt/ui/components/Modal.vue";
import { defineComponent, h } from "vue";

import { nuxtButton } from "../controls/button";
import NuxtButton from "../controls/NuxtButton.vue";
import NuxtInput from "../controls/NuxtInput.vue";

/** Nuxt owns modal focus, trapping and dismissal; Chrome owns the command list. */
export const NuxtCommandSurface = /*#__PURE__*/ defineComponent(
  (props: {
    readonly control: ManagedCommandPaletteSurfaceProps;
    readonly dir?: "ltr" | "rtl";
    readonly container?: HTMLElement;
  }) => {
    const active = useScopeActivity();
    let outside = false;
    let surface: HTMLElement | null = null;
    return () => {
      const control = props.control;
      if (!active.value || !control.open || !control.isCurrent()) return null;
      return h(
        UModal,
        {
          open: control.open,
          title: control.label,
          close: false,
          transition: false,
          portal: props.container ?? true,
          content: {
            ...toVueAttrs({
              dir: props.dir,
              "aria-label": control.label,
              "data-adapttable-part": "command-palette",
            }),
            onOpenAutoFocus: (event: Event) => {
              if (event.target instanceof HTMLElement) surface = event.target;
            },
            onInteractOutside: () => {
              outside = true;
            },
            onEscapeKeyDown: () => {
              outside = false;
            },
            onCloseAutoFocus: (event: Event) => {
              event.preventDefault();
              const opener = control.getOpener();
              const focused = opener?.ownerDocument.activeElement;
              if (
                !outside &&
                control.isCurrent() &&
                opener?.isConnected &&
                (focused === opener.ownerDocument.body ||
                  focused === opener ||
                  surface?.contains(focused ?? null))
              )
                opener.focus();
            },
          },
          ui: {
            content: ["adapttable-nuxt-command-palette", control.className],
          },
          "onUpdate:open": (open: boolean) => {
            if (!open && active.value && control.isCurrent()) control.onClose();
          },
        },
        { content: () => control.children }
      );
    };
  },
  {
    name: "NuxtCommandSurface",
    props: ["control", "dir", "container"],
  }
);

export default /*#__PURE__*/ defineComponent(
  (props: ActionPresentation & { readonly model: CommandPaletteModel }) => {
    const slots: CommandPaletteSlots = {
      Surface: managedCommandPaletteSurface((control) =>
        h(NuxtCommandSurface, {
          control,
          dir: props.dir,
          container: props.container,
        })
      ),
      Input: ({ inputProps }) => {
        const { value, onChange, ref, ...attrs } = inputProps;
        return h(NuxtInput, {
          control: {
            value,
            onChange,
            attrs,
            focusRef: ref,
            label: inputProps["aria-label"],
          },
          className: props.classNames?.commandInput,
        });
      },
      Item: ({ command, active, itemProps }) =>
        h(
          NuxtButton,
          {
            attrs: {
              ...itemProps,
              tabindex: -1,
              disabled: command.disabled,
              variant: active ? "soft" : "ghost",
              class: props.classNames?.commandItem,
            },
          },
          () => command.label
        ),
      Empty: ({ message }) =>
        h(
          "p",
          {
            "data-adapttable-part": "command-empty",
            class: props.classNames?.commandEmpty,
          },
          message
        ),
    };
    return () => [
      props.model.button
        ? nuxtButton({
            label: props.labels.commandPalette,
            attrs: {
              type: "button",
              "data-adapttable-part": "command-palette-button",
              "aria-haspopup": "dialog",
              "aria-expanded": props.model.open,
              class: props.classNames?.commandPaletteButton,
              onClick: props.model.show,
            },
          })
        : null,
      h(CommandPaletteChrome, {
        commands: props.model.commands,
        open: props.model.open,
        onClose: props.model.close,
        labels: props.labels,
        className: props.classNames?.commandPalette,
        slots,
      }),
    ];
  },
  {
    name: "NuxtCommandPalette",
    props: ["model", "labels", "dir", "container", "classNames"],
  }
);
