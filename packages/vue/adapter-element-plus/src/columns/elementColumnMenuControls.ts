import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { elementButton } from "../controls/button";
import ElementInput from "../controls/ElementInput.vue";
import { isElementRef } from "../controls/ref";
import { ElementColumnChoice } from "./ElementColumnChoice";
import { ElementColumnMenuPanel } from "./ElementColumnMenuPanel";

function button(control: ColumnMenuButtonProps) {
  const icons = {
    grip: "⠿",
    visible: "◉",
    hidden: "○",
    pin: "⌖",
    more: "⋯",
    rename: "✎",
  };
  return elementButton(
    { "aria-label": control.label, ...control.attrs },
    control.icon
      ? h("span", { "aria-hidden": "true" }, icons[control.icon])
      : control.label
  );
}
export const elementColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) => {
    const nativeAttrs = Object.fromEntries(
      Object.entries(attrs).filter(([key]) => key !== "ref" && key !== "type")
    );
    return h(ElementInput, {
      ...nativeAttrs,
      value,
      type: attrs.type === "search" ? "search" : "text",
      inputRef: isElementRef(attrs.ref) ? attrs.ref : undefined,
      onChange,
    });
  },
  Choice: (control) => h(ElementColumnChoice, { control }),
  Panel: managedOverlayPanel((control) =>
    h(ElementColumnMenuPanel, { control })
  ),
};
