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
import { defineComponent, h, mergeProps, type PropType } from "vue";

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
  {
    name: "NaiveFindBar",
    props: {
      find: { type: Object as PropType<FindBarProps["find"]> },
      labels: { type: Object as PropType<FindBarProps["labels"]> },
      className: { type: String as PropType<FindBarProps["className"]> },
    },
  }
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
    props: {
      label: {
        type: String as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["label"]
        >,
      },
      checked: {
        type: Boolean as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["checked"]
        >,
        default: undefined,
      },
      onToggle: {
        type: Function as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["onToggle"]
        >,
      },
      className: {
        type: String as PropType<
          Omit<ColumnSelectCheckboxChromeProps, "slots">["className"]
        >,
      },
    },
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
    props: {
      focus: {
        type: Object as PropType<Omit<FillHandleChromeProps, "slots">["focus"]>,
      },
      windowIndex: {
        type: Number as PropType<
          Omit<FillHandleChromeProps, "slots">["windowIndex"]
        >,
      },
      col: {
        type: Number as PropType<Omit<FillHandleChromeProps, "slots">["col"]>,
      },
      firstRowIndex: {
        type: Number as PropType<
          Omit<FillHandleChromeProps, "slots">["firstRowIndex"]
        >,
      },
      className: {
        type: String as PropType<
          Omit<FillHandleChromeProps, "slots">["className"]
        >,
      },
    },
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
    props: {
      enabled: {
        type: Boolean as PropType<
          Omit<StatusBarChromeProps, "slots">["enabled"]
        >,
        default: undefined,
      },
      shown: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["shown"]>,
      },
      page: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["page"]>,
      },
      limit: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["limit"]>,
      },
      total: {
        type: Number as PropType<Omit<StatusBarChromeProps, "slots">["total"]>,
      },
      selected: {
        type: Number as PropType<
          Omit<StatusBarChromeProps, "slots">["selected"]
        >,
      },
      stats: {
        type: Object as PropType<Omit<StatusBarChromeProps, "slots">["stats"]>,
      },
      labels: {
        type: Object as PropType<Omit<StatusBarChromeProps, "slots">["labels"]>,
      },
      locale: {
        type: String as PropType<Omit<StatusBarChromeProps, "slots">["locale"]>,
      },
      className: {
        type: String as PropType<
          Omit<StatusBarChromeProps, "slots">["className"]
        >,
      },
      notices: {
        type: Array as PropType<Omit<StatusBarChromeProps, "slots">["notices"]>,
      },
    },
  }
);
