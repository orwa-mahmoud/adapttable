import {
  type ActionButton,
  type CommandPaletteSlots,
  type ContextMenuSlots,
  managedCommandPaletteSurface,
  type SidePanelSlots,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import { ElDivider, ElDropdownItem } from "element-plus";
import { h } from "vue";

import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";
import { ElementCard } from "../presentation/ElementCard";
import { ElementCommandSurface } from "./ElementCommandSurface";
import { ElementContextSurface } from "./ElementContextSurface";
export const elementActionButton = ({ attrs, label, icon }: ActionButton) =>
  elementButton(attrs, [icon, label]);
export const elementPaletteSlots = (
  names: () => Readonly<Record<string, string | undefined>> = () => ({}),
  container: () => HTMLElement | undefined = () => undefined,
  dir: () => "ltr" | "rtl" | undefined = () => undefined
): CommandPaletteSlots => ({
  Surface: managedCommandPaletteSurface((control) =>
    h(ElementCommandSurface, { control, container: container(), dir: dir() })
  ),
  Input: ({ inputProps }) => {
    const { onChange, ref, value, ...attrs } = inputProps;
    return h(ElementInput, {
      ...toVueAttrs(attrs),
      value,
      inputRef: (element) => {
        if (element instanceof HTMLInputElement || element === null)
          ref(element);
      },
      class: names().commandInput,
      onChange,
    });
  },
  Item: ({ command, itemProps }) =>
    elementButton(
      {
        ...toVueAttrs(itemProps),
        class: names().commandItem,
        type: "button",
        tabindex: -1,
        disabled: command.disabled,
      },
      command.label
    ),
  Empty: ({ message }) =>
    h(
      "p",
      { "data-adapttable-part": "command-empty", class: names().commandEmpty },
      message
    ),
});
export const elementContextMenuSlots = (
  names: () => Readonly<Record<string, string | undefined>> = () => ({}),
  dir: () => "ltr" | "rtl" | undefined = () => undefined
): ContextMenuSlots => ({
  Surface: (props) => h(ElementContextSurface, { ...props, dir: dir() }),
  Item: ({ item, onSelect }) =>
    h(
      ElDropdownItem,
      {
        disabled: item.disabled,
        textValue: item.label,
        "aria-disabled": item.disabled,
        "data-danger": item.danger ? "" : undefined,
        "data-adapttable-part": "context-menu-item",
        class: names().contextMenuItem,
        onClick: onSelect,
      },
      { default: () => item.label }
    ),
  Separator: () =>
    h(ElDivider, {
      role: "separator",
      "data-adapttable-part": "context-menu-separator",
      class: names().contextMenuSeparator,
    }),
});
export const elementSidePanelSlots = (
  names: () => Readonly<Record<string, string | undefined>> = () => ({})
): SidePanelSlots => {
  let closeChoice: (() => void) | undefined;
  return {
    Frame: (props) => {
      const close = closeChoice;
      return h(
        ElementCard,
        {
          attrs: {
            "data-adapttable-part": "side-panel",
            class: props.className,
            "data-side": props.side,
            style: { minWidth: "min(18rem,100%)", maxWidth: "100%" },
            onKeydownCapture: (event: KeyboardEvent) => {
              const target = event.target;
              // ElSelect stops Escape even while closed; forward that case to the
              // binding's current close callback before the native event is consumed.
              if (
                event.key === "Escape" &&
                !event.defaultPrevented &&
                !event.isComposing &&
                target instanceof Element &&
                target.getAttribute("role") === "combobox" &&
                target.getAttribute("aria-expanded") === "false" &&
                !target.closest('[role="dialog"],[role="menu"]')
              ) {
                event.preventDefault();
                event.stopPropagation();
                close?.();
              }
            },
          },
        },
        { default: () => props.children }
      );
    },
    Tab: (props) =>
      elementButton(
        { ...toVueAttrs(props.buttonProps), class: names().sidePanelTab },
        props.panel.label
      ),
    Close: (props) => {
      closeChoice = props.onClose;
      return elementButton(
        {
          type: "button",
          "aria-label": props.label,
          "data-adapttable-part": "side-panel-close",
          class: names().sidePanelClose,
          onClick: props.onClose,
        },
        props.label
      );
    },
  };
};
