import {
  type ActionButton,
  elementRef,
  toVueAttrs,
} from "@adapttable/vue/adapter";
import type { CommandPaletteSlots } from "@adapttable/vue/command-palette";
import type { ContextMenuSlots } from "@adapttable/vue/context-menu";
import type { ExportSlots } from "@adapttable/vue/export-csv";
import type { SidePanelSlots } from "@adapttable/vue/side-panel";
import { h } from "vue";

import { NativeContextMenuSurface } from "./NativeContextMenuSurface";
import { NativePaletteSurface } from "./NativePaletteSurface";
export const nativeActionButton = ({ label, attrs, icon }: ActionButton) =>
  h("button", attrs, [icon, label]);
export const nativePaletteSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): CommandPaletteSlots => ({
  Surface: (props) => h(NativePaletteSurface, { ...props }),
  Input: ({ inputProps }) => {
    const { onChange, ref, ...attrs } = inputProps;
    return h("input", {
      ...toVueAttrs(attrs),
      class: names.commandInput,
      ref: elementRef(ref),
      onInput: (event: Event) => {
        if (event.target instanceof HTMLInputElement)
          onChange(event.target.value);
      },
    });
  },
  Item: (props) =>
    h(
      "button",
      {
        ...toVueAttrs(props.itemProps),
        class: names.commandItem,
        type: "button",
        tabindex: -1,
        disabled: props.command.disabled,
      },
      props.command.label
    ),
  Empty: (props) =>
    h(
      "p",
      { "data-adapttable-part": "command-empty", class: names.commandEmpty },
      props.message
    ),
});
export const nativeContextMenuSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): ContextMenuSlots => ({
  Surface: (props) => h(NativeContextMenuSurface, { ...props }),
  Item: ({ item, onSelect }) =>
    h(
      "button",
      {
        type: "button",
        role: "menuitem",
        tabindex: -1,
        disabled: item.disabled,
        "aria-disabled": item.disabled,
        "data-danger": item.danger ? "" : undefined,
        "data-adapttable-part": "context-menu-item",
        class: names.contextMenuItem,
        onClick: onSelect,
      },
      item.label
    ),
  Separator: () =>
    h("hr", {
      role: "separator",
      "data-adapttable-part": "context-menu-separator",
      class: names.contextMenuSeparator,
    }),
});
export const nativeSidePanelSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): SidePanelSlots => ({
  Frame: (props) =>
    h(
      "aside",
      {
        "data-adapttable-part": "side-panel",
        class: props.className,
        "data-side": props.side,
        style: { minWidth: "min(18rem,100%)", maxWidth: "100%" },
      },
      [props.children]
    ),
  Tab: (props) =>
    h(
      "button",
      { ...toVueAttrs(props.buttonProps), class: names.sidePanelTab },
      props.panel.label
    ),
  Close: (props) =>
    h(
      "button",
      {
        type: "button",
        "aria-label": props.label,
        "data-adapttable-part": "side-panel-close",
        class: names.sidePanelClose,
        onClick: props.onClose,
      },
      props.label
    ),
});
export const nativeExportSlots = (
  names: Readonly<Record<string, string | undefined>> = {}
): ExportSlots => ({
  Button: ({ attrs, label, icon }) =>
    h("button", attrs, [
      attrs["aria-busy"] === true
        ? h(
            "svg",
            {
              "data-adapttable-part": "export-spinner",
              class: names.exportSpinner,
              viewBox: "0 0 24 24",
              width: 16,
              height: 16,
              "aria-hidden": "true",
              focusable: "false",
            },
            [
              h("circle", {
                cx: 12,
                cy: 12,
                r: 9,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 3,
                opacity: 0.2,
              }),
              h("path", {
                d: "M12 3a9 9 0 0 1 9 9",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 3,
              }),
            ]
          )
        : icon,
      label,
    ]),
  Surface: (props) =>
    h(
      "section",
      {
        "data-adapttable-part": "export-progress-surface",
        class: names.exportProgress,
        role: "region",
        "aria-label": props.heading,
      },
      [
        h("h3", props.heading),
        props.status === "busy"
          ? h("progress", {
              "data-adapttable-part": "export-progress-bar",
              class: names.exportProgressBar,
              max: 100,
              value: props.progress,
              "aria-label": props.progressLabel,
            })
          : null,
        props.message
          ? h(
              "p",
              {
                "data-adapttable-part": "export-progress-message",
                class: names.exportProgressMessage,
              },
              props.message
            )
          : null,
        props.error
          ? h(
              "p",
              {
                "data-adapttable-part": "export-progress-message",
                class: names.exportProgressMessage,
                role: "alert",
              },
              props.error
            )
          : null,
        h("div", { "data-adapttable-part": "export-progress-actions" }, [
          ...(
            [
              ["cancel", props.cancel],
              ["retry", props.retry],
              ["dismiss", props.dismiss],
            ] as const
          ).map(([key, action]) =>
            action
              ? h(
                  "button",
                  {
                    key,
                    type: "button",
                    "data-adapttable-part": `export-progress-${key}`,
                    class: names.exportProgressButton,
                    onClick: action.onAction,
                  },
                  action.label
                )
              : null
          ),
          props.download
            ? h(
                "a",
                {
                  "data-adapttable-part": "export-progress-download",
                  class: names.exportProgressDownload,
                  href: props.download.url,
                  download: "",
                },
                props.download.label
              )
            : null,
        ]),
      ]
    ),
});
