import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import AntdInput from "../controls/AntdInput.vue";
import { antdButton } from "../controls/button";
import { isElementRef } from "../controls/ref";
import { AntdColumnChoice } from "./AntdColumnChoice";
import { AntdColumnMenuPanel } from "./AntdColumnMenuPanel";

function button(control: ColumnMenuButtonProps) {
  const icons = {
    grip: "⠿",
    visible: "◉",
    hidden: "○",
    pin: "⌖",
    more: "⋯",
    rename: "✎",
  };
  return antdButton(
    { "aria-label": control.label, ...control.attrs },
    control.icon
      ? h("span", { "aria-hidden": "true" }, icons[control.icon])
      : control.label
  );
}
export const antdColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: ({ attrs, value, onChange }) => {
    const nativeAttrs = Object.fromEntries(
      Object.entries(attrs).filter(([key]) => key !== "ref" && key !== "type")
    );
    return h(AntdInput, {
      ...nativeAttrs,
      value,
      type: attrs.type === "search" ? "search" : "text",
      inputRef: isElementRef(attrs.ref) ? attrs.ref : undefined,
      onChange,
    });
  },
  Choice: (control) => h(AntdColumnChoice, { control }),
  Panel: managedOverlayPanel((control) => h(AntdColumnMenuPanel, { control })),
};
