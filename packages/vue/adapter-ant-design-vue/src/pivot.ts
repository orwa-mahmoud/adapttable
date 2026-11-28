/** Pivot configuration with Ant Design Vue selects and buttons over the binding's Chrome. */
import "./pivot.css";

import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  withProps,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import AntdSelect from "./controls/AntdSelect.vue";
import { antdButton } from "./controls/button";

export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h(
      "div",
      { ...attrs, class: ["adapttable-ant-design-vue-pivot", className] },
      [children]
    ),
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
      antdButton(
        {
          type: "button",
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      antdButton(
        {
          type: "button",
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      antdButton(
        {
          type: "button",
          "aria-label": `${removeLabel}: ${label}`,
          onClick: onRemove,
        },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    h(AntdSelect, {
      "aria-label": label,
      disabled: !options.length,
      value: "",
      options: [
        { value: "", label },
        ...options.map((item) => ({ value: item.key, label: item.label })),
      ],
      onChange: (value: string) => {
        if (value) onAdd(value);
      },
    }),
  Agg: ({ label, value, options, optionLabels, onChange }) =>
    h(AntdSelect, {
      "aria-label": label,
      value,
      options: options.map((item) => ({
        value: item,
        label: optionLabels[item],
      })),
      onChange: (next: string) => {
        const option = options.find((item) => item === next);
        if (option) onChange(option);
      },
    }),
};

/** The pivot axes and measures, edited with Ant Design Vue controls. */
export const PivotPanel = /* @__PURE__ */ withProps(
  function PivotPanel(props: PivotPanelProps) {
    return PivotPanelChrome({ ...props, slots });
  },
  ["fields", "config", "onChange", "labels", "className"]
);
