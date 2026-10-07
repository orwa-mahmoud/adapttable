import "./nuxtNavigation.css";

import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  type DataTableClassNames,
  FillHandleChrome,
  type FillHandleChromeProps,
  FindBarChrome,
  type FindBarProps,
  StatusBarChrome,
  type StatusBarChromeProps,
  type StatusBarSlots,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import UBadge from "@nuxt/ui/components/Badge.vue";
import { defineComponent, h, mergeProps } from "vue";

import NuxtButton from "../controls/NuxtButton.vue";
import NuxtCheckbox from "../controls/NuxtCheckbox.vue";
import NuxtInput from "../controls/NuxtInput.vue";

export const NuxtFindBar = /*#__PURE__*/ defineComponent(
  (props: FindBarProps) => {
    const names = useDataTableClassNames();
    return () =>
      FindBarChrome({
        ...props,
        slots: {
          Search: (control) =>
            h(NuxtInput, {
              control: {
                ...control,
                type: "search",
                attrs: {
                  placeholder: control.placeholder,
                  "data-adapttable-part": "find-input",
                  onKeyDown: control.onKeyDown,
                },
              },
              className: names.value.findInput,
            }),
          Button: (control) =>
            h(
              NuxtButton,
              {
                attrs: {
                  "aria-label": control.label,
                  "data-adapttable-part": control.part,
                  className: names.value.findButton,
                  disabled: control.disabled,
                  onClick: control.onClick,
                },
              },
              () => control.label
            ),
        },
      });
  },
  { name: "NuxtFindBar", props: ["find", "labels", "className"] }
);

export const NuxtColumnSelect = /*#__PURE__*/ defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h(NuxtCheckbox, {
            control: {
              attrs: { "aria-label": control.label },
              checked: control.checked,
              onChange: control.onToggle,
            },
          }),
      },
    }),
  {
    name: "NuxtColumnSelect",
    props: ["label", "checked", "onToggle", "className"],
  }
);

export const NuxtFillHandle = /*#__PURE__*/ defineComponent(
  (props: Omit<FillHandleChromeProps, "slots">) => () =>
    FillHandleChrome({
      ...props,
      slots: {
        Handle: (control) =>
          h(
            "span",
            {
              "data-adapttable-part": "fill-handle-anchor",
            },
            [
              h(
                "span",
                mergeProps(control.handleProps, {
                  "data-adapttable-part": "fill-handle",
                  title: control.label,
                  "aria-hidden": "true",
                  class: control.className,
                })
              ),
            ]
          ),
      },
    }),
  {
    name: "NuxtFillHandle",
    props: ["focus", "windowIndex", "col", "firstRowIndex", "className"],
  }
);

function statusSlots(names: () => DataTableClassNames): StatusBarSlots {
  return {
    Bar: (control) =>
      h(
        "div",
        {
          "data-adapttable-part": "status-bar",
          class: control.className,
        },
        [
          ...control.items.map((item) =>
            h(
              UBadge,
              {
                key: item.key,
                color: "neutral",
                variant: "subtle",
                "data-adapttable-part": "status-item",
                "data-status": item.key,
                "data-appearance": item.appearance,
                class: names().statusItem,
              },
              () => item.text
            )
          ),
          control.stats,
        ]
      ),
    stats: {
      Stats: (control) =>
        h(
          "output",
          {
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true",
            "data-adapttable-part": "selection-stats",
            class: names().selectionStats,
          },
          control.parts.map((item) =>
            h(
              UBadge,
              {
                key: item.key,
                color: "neutral",
                variant: "soft",
                "data-adapttable-part": "selection-stat",
              },
              () => item.text
            )
          )
        ),
    },
  };
}

export const NuxtStatusBar = /*#__PURE__*/ defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useDataTableClassNames();
    const slots = statusSlots(() => names.value);
    return () => StatusBarChrome({ ...props, slots });
  },
  {
    name: "NuxtStatusBar",
    props: [
      "enabled",
      "shown",
      "page",
      "limit",
      "total",
      "selected",
      "stats",
      "labels",
      "locale",
      "className",
      "notices",
    ],
  }
);
