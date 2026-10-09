/** Pivot configuration with Nuxt UI selects and buttons over the binding's Chrome. */
import "./pivot.css";

import type { Attrs } from "@adapttable/vue";
import {
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import NuxtButton from "./controls/NuxtButton.vue";
import NuxtSelect from "./controls/NuxtSelect.vue";

export type PivotPanelProps = Omit<PivotPanelChromeProps, "slots">;

const button = (attrs: Attrs, label: string) =>
  h(NuxtButton, { attrs }, () => label);

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...attrs }) =>
    h("div", { ...attrs, class: ["adapttable-nuxt-pivot", className] }, [
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
      button(
        {
          disabled: !onMoveUp,
          "aria-label": `${moveUpLabel}: ${label}`,
          onClick: onMoveUp,
        },
        moveUpLabel
      ),
      button(
        {
          disabled: !onMoveDown,
          "aria-label": `${moveDownLabel}: ${label}`,
          onClick: onMoveDown,
        },
        moveDownLabel
      ),
      button(
        { "aria-label": `${removeLabel}: ${label}`, onClick: onRemove },
        removeLabel
      ),
    ]),
  Add: ({ label, options, onAdd }) =>
    h(NuxtSelect, {
      control: {
        label,
        attrs: { disabled: !options.length },
        value: "",
        options: [
          { value: "", label },
          ...options.map((item) => ({ value: item.key, label: item.label })),
        ],
        onChange: (value: string) => {
          if (value) onAdd(value);
        },
      },
    }),
  Agg: ({ label, value, options, optionLabels, onChange }) =>
    h(NuxtSelect, {
      control: {
        label,
        attrs: {},
        value,
        options: options.map((item) => ({
          value: item,
          label: optionLabels[item],
        })),
        onChange: (next: string) => {
          const option = options.find((item) => item === next);
          if (option) onChange(option);
        },
      },
    }),
};

/** The pivot axes and measures, edited with Nuxt UI controls. */
export function PivotPanel(props: PivotPanelProps) {
  return PivotPanelChrome({ ...props, slots });
}
PivotPanel.props = ["fields", "config", "onChange", "labels", "className"];
