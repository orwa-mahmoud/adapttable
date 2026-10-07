import type { Attrs } from "@adapttable/vue";
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
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { NFlex, NText } from "naive-ui";
import { defineComponent, h, mergeProps } from "vue";

import { naiveButton } from "../controls/button";
import { naiveCheckbox } from "../controls/checkbox";
import { naiveInput } from "../controls/input";

export const NaiveFindBar = /*#__PURE__*/ defineComponent(
  (props: FindBarProps) => {
    const names = useDataTableClassNames();
    return () =>
      FindBarChrome({
        ...props,
        slots: {
          Search: (control) =>
            naiveInput({
              value: control.value,
              onChange: control.onChange,
              attrs: {
                type: "search",
                "aria-label": control.label,
                placeholder: control.placeholder,
                class: names.value.findInput,
                "data-adapttable-part": "find-input",
                ref: control.focusRef,
                onKeydown: control.onKeyDown,
              },
            }),
          Button: (control) =>
            naiveButton(
              {
                "aria-label": control.label,
                "data-adapttable-part": control.part,
                class: names.value.findButton,
                disabled: control.disabled,
                onClick: control.onClick,
              },
              control.label
            ),
        },
      });
  },
  { name: "NaiveFindBar", props: ["find", "labels", "className"] }
);

export const NaiveColumnSelect = /*#__PURE__*/ defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          naiveCheckbox({
            attrs: { "aria-label": control.label },
            checked: control.checked,
            indeterminate: false,
            onToggle: control.onToggle,
          }),
      },
    }),
  {
    name: "NaiveColumnSelect",
    props: ["label", "checked", "onToggle", "className"],
  }
);

export const NaiveFillHandle = /*#__PURE__*/ defineComponent(
  (props: Omit<FillHandleChromeProps, "slots">) => () =>
    FillHandleChrome({
      ...props,
      slots: {
        Handle: (control) =>
          h(
            "span",
            {
              "data-adapttable-part": "fill-handle-anchor",
              style: { position: "relative", display: "block", height: 0 },
            },
            [
              naiveButton(
                mergeProps(control.handleProps, {
                  "data-adapttable-part": "fill-handle",
                  title: control.label,
                  "aria-hidden": true,
                  tabindex: -1,
                  class: ["adapttable-naive-fill-handle", control.className],
                }),
                ""
              ),
            ]
          ),
      },
    }),
  {
    name: "NaiveFillHandle",
    props: ["focus", "windowIndex", "col", "firstRowIndex", "className"],
  }
);

function statusText(attrs: Attrs, text: string) {
  return h(NText, attrs, { default: () => text });
}
function statusSlots(
  names: () => DataTableClassNames
): StatusBarChromeProps["slots"] {
  return {
    Bar: (control) =>
      h(
        NFlex,
        {
          "data-adapttable-part": "status-bar",
          class: control.className,
          align: "center",
        },
        {
          default: () => [
            ...control.items.map((item) =>
              statusText(
                {
                  key: item.key,
                  "data-adapttable-part": "status-item",
                  "data-status": item.key,
                  "data-appearance": item.appearance,
                  class: names().statusItem,
                },
                item.text
              )
            ),
            control.stats,
          ],
        }
      ),
    stats: {
      Stats: (control) =>
        h(
          NFlex,
          {
            role: "status",
            "aria-live": "polite",
            "aria-atomic": true,
            "data-adapttable-part": "selection-stats",
            class: names().selectionStats,
          },
          {
            default: () =>
              control.parts.map((item) =>
                statusText(
                  {
                    key: item.key,
                    "data-adapttable-part": "selection-stat",
                  },
                  item.text
                )
              ),
          }
        ),
    },
  };
}
export const NaiveStatusBar = /*#__PURE__*/ defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useDataTableClassNames();
    const slots = statusSlots(() => names.value);
    return () => StatusBarChrome({ ...props, slots });
  },
  {
    name: "NaiveStatusBar",
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
