import type { ActionButton } from "@adapttable/vue/adapter";
import { Fragment, h } from "vue";

import { vuetifyButton } from "../controls";

/** The binding supplies action state and handlers; Vuetify owns presentation. */
export function vuetifyActionButton({ attrs, label, icon }: ActionButton) {
  return vuetifyButton(attrs, h(Fragment, [icon, label]));
}
