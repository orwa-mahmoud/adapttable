import type { ActionButtonSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import { antdButton } from "../controls/button";

export const antdActionSlots: ActionButtonSlots = {
  Button: ({ attrs, icon, label }) =>
    antdButton(attrs, [
      icon == null || icon === false
        ? null
        : h("span", { "aria-hidden": "true" }, icon),
      label,
    ]),
};
