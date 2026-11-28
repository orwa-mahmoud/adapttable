import type {
  ColumnMenuButtonProps,
  ColumnMenuSlots,
} from "@adapttable/vue/adapter";
import { h } from "vue";

import { headlessButton, headlessInput } from "../controls/basic";
import { headlessManagedPanel } from "../controls/managedPanel";
import { headlessSelect } from "../controls/select";

const icons = {
  grip: "⠿",
  visible: "◉",
  hidden: "○",
  pin: "⌖",
  more: "⋯",
  rename: "✎",
};
const button = ({ attrs, label, icon }: ColumnMenuButtonProps) =>
  headlessButton(
    attrs,
    icon ? h("span", { "aria-hidden": true }, icons[icon]) : label
  );
export const headlessColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: (control) =>
    headlessInput({
      ...control,
      type:
        typeof control.attrs.type === "string" ? control.attrs.type : "text",
    }),
  Choice: headlessSelect,
  Panel: headlessManagedPanel,
};
