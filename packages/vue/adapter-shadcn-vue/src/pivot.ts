import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { shadcnSelect } from "./controls";
import { shadcnAction } from "./tableControls";

export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h(
      "div",
      {
        ...attrs,
        class: [
          "space-y-4 rounded-xl border border-border bg-card p-4",
          className,
        ],
      },
      [children]
    ),
  Zone: ({ children, label, zone, ...attrs }) =>
    h(
      "fieldset",
      {
        ...attrs,
        "data-zone": zone,
        class: "space-y-2 rounded-md border border-border p-3",
      },
      [h("legend", label), children]
    ),
  Field: ({
    label,
    aggregation,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    ...attrs
  }) =>
    h("div", { ...attrs, class: "flex flex-wrap items-center gap-2" }, [
      h("span", label),
      aggregation,
      shadcnAction(
        {
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      shadcnAction(
        {
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      shadcnAction(
        { "aria-label": `${removeLabel}: ${label}`, onClick: onRemove },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    shadcnSelect({
      attrs: { "aria-label": label, disabled: !options.length },
      value: "",
      options: [
        { value: "", label },
        ...options.map((item) => ({ value: item.key, label: item.label })),
      ],
      onChange: (value) => {
        if (value) onAdd(value);
      },
    }),
  Agg: ({ label, value, options, optionLabels, onChange }) =>
    shadcnSelect({
      attrs: { "aria-label": label },
      value,
      options: options.map((item) => ({
        value: item,
        label: optionLabels[item],
      })),
      onChange: (next) => {
        const option = options.find((item) => item === next);
        if (option) onChange(option);
      },
    }),
};

export function PivotPanel(props: PivotPanelProps) {
  return PivotPanelChrome({ ...props, slots });
}
PivotPanel.props = ["fields", "config", "onChange", "labels", "className"];
