import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  elementRef,
  FillHandleChrome,
  type FillHandleChromeProps,
  FindBarChrome,
  type FindBarProps,
  StatusBarChrome,
  type StatusBarChromeProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h, mergeProps, type PropType } from "vue";

import { useClassNames } from "../classNamesContext";
export const NativeFindBar = defineComponent(
  (props: FindBarProps) => {
    const names = useClassNames();
    return () =>
      FindBarChrome({
        ...props,
        slots: {
          Search: (control) =>
            h("input", {
              type: "search",
              value: control.value,
              "aria-label": control.label,
              placeholder: control.placeholder,
              class: names.value.findInput,
              "data-adapttable-part": "find-input",
              ref: elementRef<HTMLElement>(control.focusRef),
              onInput: (event: Event) => {
                if (event.currentTarget instanceof HTMLInputElement)
                  control.onChange(event.currentTarget.value);
              },
              onKeydown: control.onKeyDown,
            }),
          Button: (control) =>
            h(
              "button",
              {
                type: "button",
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
    props: {
      find: { type: Object as PropType<FindBarProps["find"]> },
      labels: { type: Object as PropType<FindBarProps["labels"]> },
      className: { type: String as PropType<FindBarProps["className"]> },
    },
  }
);
export const NativeColumnSelect = defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          h("input", {
            type: "checkbox",
            checked: control.checked,
            "aria-label": control.label,
            onChange: (event: Event) => {
              control.onToggle();
              if (event.currentTarget instanceof HTMLInputElement)
                event.currentTarget.checked = control.checked;
            },
          }),
      },
    }),
  {
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
export const NativeFillHandle = defineComponent(
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
              h(
                "span",
                mergeProps(control.handleProps, {
                  "data-adapttable-part": "fill-handle",
                  title: control.label,
                  "aria-hidden": "true",
                  class: control.className,
                  style: {
                    position: "absolute",
                    insetInlineEnd: "-3px",
                    bottom: "-3px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "1px",
                    background: "var(--adapttable-fill-handle, currentColor)",
                    cursor: "crosshair",
                  },
                })
              ),
            ]
          ),
      },
    }),
  {
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
export const NativeStatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useClassNames();
    return () =>
      StatusBarChrome({
        ...props,
        slots: {
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
                    "span",
                    {
                      key: item.key,
                      "data-adapttable-part": "status-item",
                      "data-status": item.key,
                      "data-appearance": item.appearance,
                      class: names.value.statusItem,
                    },
                    item.text
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
                  class: names.value.selectionStats,
                },
                control.parts.map((item) =>
                  h(
                    "span",
                    {
                      key: item.key,
                      "data-adapttable-part": "selection-stat",
                    },
                    item.text
                  )
                )
              ),
          },
        },
      });
  },
  {
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
