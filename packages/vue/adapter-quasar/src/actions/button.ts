import type { ActionButton } from "@adapttable/vue/adapter";
import { h } from "vue";

import QuasarButton from "../controls/QuasarButton.vue";

export function quasarActionButton({ attrs, label, icon }: ActionButton) {
  return h(QuasarButton, { attrs }, () => [icon, label]);
}
