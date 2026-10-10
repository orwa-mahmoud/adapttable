import type { ActionButtonSlots } from "@adapttable/vue/adapter";
import { h } from "vue";

import { elementButton } from "../controls/button";

export const elementActionSlots: ActionButtonSlots = {
  Button: ({ attrs, icon, label }) =>
    elementButton(attrs, [
      icon == null || icon === false
        ? null
        : h("span", { "aria-hidden": "true" }, icon),
      label,
    ]),
};
