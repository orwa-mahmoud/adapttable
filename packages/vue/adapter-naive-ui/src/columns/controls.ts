import {
  type ColumnMenuButtonProps,
  type ColumnMenuSlots,
  managedOverlayPanel,
} from "@adapttable/vue/adapter";
import { NIcon } from "naive-ui";
import { h } from "vue";

import { naiveButton } from "../controls/button";
import { naiveInput } from "../controls/input";
import { naiveSelect } from "../controls/select";
import { NaiveManagedPopover } from "./NaiveManagedPopover";

const icons = {
  grip: "⠿",
  visible: "◉",
  hidden: "○",
  pin: "⌖",
  more: "⋯",
  rename: "✎",
};
function button({ attrs, label, icon }: ColumnMenuButtonProps) {
  return naiveButton(
    attrs,
    icon
      ? h(NIcon, { "aria-hidden": true }, { default: () => icons[icon] })
      : label,
    pinnedPin(icon, attrs) ? { type: "primary" } : {}
  );
}

/** A pin button whose column is pinned takes the kit's primary emphasis. */
function pinnedPin(
  icon: ColumnMenuButtonProps["icon"],
  attrs: ColumnMenuButtonProps["attrs"]
): boolean {
  return icon === "pin" && attrs["aria-pressed"] === true;
}

export const naiveColumnMenuSlots: ColumnMenuSlots = {
  Trigger: button,
  Button: button,
  Input: naiveInput,
  Choice: naiveSelect,
  Panel: managedOverlayPanel((control) => h(NaiveManagedPopover, { control })),
};
