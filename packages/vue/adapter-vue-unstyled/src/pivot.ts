/** Native configuration controls; the binding owns their structure and model. */
import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
} from "@adapttable/vue/adapter";
import { h, type VNodeChild } from "vue";
export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;
const controls: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h("div", { ...attrs, class: className }, [children]),
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
      h(
        "button",
        {
          type: "button",
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      h(
        "button",
        {
          type: "button",
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      h(
        "button",
        {
          type: "button",
          "aria-label": `${removeLabel}: ${label}`,
          onClick: onRemove,
        },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    h(
      "select",
      {
        "aria-label": label,
        value: "",
        disabled: !options.length,
        onChange: (event: Event) => {
          const target = event.target;
          if (target instanceof HTMLSelectElement && target.value) {
            onAdd(target.value);
            target.value = "";
          }
        },
      },
      [
        h("option", { value: "" }, label),
        ...options.map((option) =>
          h("option", { value: option.key, key: option.key }, option.label)
        ),
      ]
    ),
  Agg: ({ label, value, options, optionLabels, onChange }) =>
    h(
      "select",
      {
        "aria-label": label,
        value,
        onChange: (event: Event) => {
          if (event.target instanceof HTMLSelectElement) {
            const value = event.target.value;
            const next = options.find((option) => option === value);
            if (next) onChange(next);
          }
        },
      },
      options.map((option) =>
        h("option", { value: option, key: option }, optionLabels[option])
      )
    ),
};
export function PivotPanel(props: PivotPanelProps): VNodeChild {
  return PivotPanelChrome({ ...props, slots: controls });
}
PivotPanel.props = ["fields", "config", "onChange", "labels", "className"];
