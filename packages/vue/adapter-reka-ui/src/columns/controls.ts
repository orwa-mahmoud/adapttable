import type {
  ColumnMenuButtonProps,
  ColumnMenuSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { rekaButton, rekaInput } from "../controls/basic";
import { rekaManagedPanel } from "../controls/managedPanel";
import { rekaSelect } from "../controls/select";

const icons = {
  grip: "⠿",
  visible: "◉",
  hidden: "○",
  pin: "⌖",
  more: "⋯",
  rename: "✎",
};
const button = ({ attrs, label, icon }: ColumnMenuButtonProps) =>
  rekaButton(
    attrs,
    icon ? h("span", { "aria-hidden": true }, icons[icon]) : label
  );
export const rekaColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: (control) =>
    rekaInput({
      ...control,
      type:
        typeof control.attrs.type === "string" ? control.attrs.type : "text",
    }),
  Choice: rekaSelect,
  Panel: rekaManagedPanel,
};
