import type { StaticTableFeature } from "@adapttable/vue";
import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { columnSelectionCheckbox as bindingColumnSelectionCheckbox } from "@adapttable/vue/features";
import { h } from "vue";

import { NuxtColumnSelect } from "./navigation/nuxtNavigation";

/** Canonical opt-in entry, also retained through cell-navigation for compatibility. */
export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(bindingColumnSelectionCheckbox(), [
    slotRender(COLUMN_SELECT, (props) => h(NuxtColumnSelect, props)),
  ]);
}
