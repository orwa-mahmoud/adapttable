/** Pivot configuration with Vuetify selects and buttons over the binding's Chrome. */
import "./pivot.css";

import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { vuetifyButton } from "./controls";
import VuetifySelect from "./controls/VuetifySelect.vue";

export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h("div", { ...attrs, class: ["adapttable-vuetify-pivot", className] }, [
      children,
    ]),
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
      vuetifyButton(
        {
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      vuetifyButton(
        {
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      vuetifyButton(
        { "aria-label": `${removeLabel}: ${label}`, onClick: onRemove },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    h(VuetifySelect, {
      attrs: { "aria-label": label, disabled: !options.length },
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
    h(VuetifySelect, {
      attrs: { "aria-label": label },
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

/** The pivot axes and measures, edited with Vuetify controls. */
export function PivotPanel(props: PivotPanelProps) {
  return PivotPanelChrome({ ...props, slots });
}
PivotPanel.props = ["fields", "config", "onChange", "labels", "className"];
