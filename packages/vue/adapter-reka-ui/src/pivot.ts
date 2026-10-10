import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { rekaButton } from "./controls/basic";
import { rekaSelect } from "./controls/select";

export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h("div", { ...attrs, class: ["at-reka-pivot", className] }, [children]),
  Zone: ({ children, label, zone, ...attrs }) =>
    h("fieldset", { ...attrs, "data-zone": zone }, [
      h("legend", label),
      children,
    ]),
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
    h("div", attrs, [
      h("span", label),
      aggregation,
      rekaButton(
        {
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      rekaButton(
        {
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      rekaButton(
        { "aria-label": `${removeLabel}: ${label}`, onClick: onRemove },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    rekaSelect({
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
    rekaSelect({
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
