import {
  ColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxChromeProps,
  FillHandleChrome,
  type FillHandleChromeProps,
  FindBarChrome,
  type FindBarProps,
  StatusBarChrome,
  type StatusBarChromeProps,
  useDataTableClassNames,
} from "@adapttable/vue/adapter";
import { defineComponent, h, mergeProps, type PropType } from "vue";

import { Button } from "../components/button";
import Card from "../components/card/Card.vue";
import {
  shadcnControlAttrs,
  shadcnInput,
  shadcnSelectionCheckbox,
} from "../controls";
import { cn } from "../lib/utils";
import { shadcnAction } from "../tableControls";

export const FindBar = defineComponent(
  (props: FindBarProps) => {
    const names = useDataTableClassNames();
    return () =>
      FindBarChrome({
        ...props,
        className: cn(
          "flex flex-wrap items-center gap-2 rounded-lg border border-border p-2",
          props.className
        ),
        slots: {
          Search: (control) =>
            shadcnInput({
              attrs: {
                type: "search",
                "aria-label": control.label,
                placeholder: control.placeholder,
                class: names.value.findInput,
                "data-adapttable-part": "find-input",
                ref: control.focusRef,
                onKeydown: control.onKeyDown,
              },
              value: control.value,
              onChange: control.onChange,
            }),
          Button: (control) =>
            shadcnAction(
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
    name: "ShadcnFindBar",
    props: {
      find: { type: Object as PropType<FindBarProps["find"]> },
      labels: { type: Object as PropType<FindBarProps["labels"]> },
      className: { type: String as PropType<FindBarProps["className"]> },
    },
  }
);

export const ColumnSelect = defineComponent(
  (props: Omit<ColumnSelectCheckboxChromeProps, "slots">) => () =>
    ColumnSelectCheckboxChrome({
      ...props,
      slots: {
        Checkbox: (control) =>
          shadcnSelectionCheckbox({
            attrs: { "aria-label": control.label },
            checked: control.checked,
            indeterminate: false,
            onToggle: control.onToggle,
          }),
      },
    }),
  {
    name: "ShadcnColumnSelect",
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

export const FillHandle = defineComponent(
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
                Button,
                shadcnControlAttrs(
                  mergeProps(control.handleProps, {
                    as: "span",
                    variant: "default",
                    "data-adapttable-part": "fill-handle",
                    title: control.label,
                    "aria-hidden": true,
                    class: control.className,
                    style: {
                      position: "absolute",
                      insetInlineEnd: "-3px",
                      bottom: "-3px",
                      width: "8px",
                      height: "8px",
                      minWidth: "8px",
                      minHeight: "8px",
                      padding: 0,
                      border: 0,
                      borderRadius: "2px",
                      cursor: "crosshair",
                    },
                  })
                ),
                () => null
              ),
            ]
          ),
      },
    }),
  {
    name: "ShadcnFillHandle",
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

export const StatusBar = defineComponent(
  (props: Omit<StatusBarChromeProps, "slots">) => {
    const names = useDataTableClassNames();
    const slots: StatusBarChromeProps["slots"] = {
      Bar: (control) =>
        h(
          Card,
          {
            as: "footer",
            "data-adapttable-part": "status-bar",
            class: cn(
              "flex-row flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border-border px-3 py-2 text-xs text-muted-foreground",
              control.className
            ),
          },
          () => [
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
              "aria-atomic": true,
              "data-adapttable-part": "selection-stats",
              class: cn(
                "inline-flex flex-wrap gap-3 tabular-nums",
                names.value.selectionStats
              ),
            },
            control.parts.map((item) =>
              h(
                "span",
                { key: item.key, "data-adapttable-part": "selection-stat" },
                item.text
              )
            )
          ),
      },
    };
    return () => StatusBarChrome({ ...props, slots });
  },
  {
    name: "ShadcnStatusBar",
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
