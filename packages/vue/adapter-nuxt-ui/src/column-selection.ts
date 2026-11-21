import type { StaticTableFeature } from "@adapttable/vue";
import {
  COLUMN_SELECT,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { columnSelectionCheckbox as bindingColumnSelectionCheckbox } from "@adapttable/vue/features";
import { h } from "vue";

import { NuxtColumnSelect } from "./navigation/nuxtNavigation";

/** The opt-in column-selection entry. */
export function columnSelectionCheckbox(): StaticTableFeature {
  return extendFeature(bindingColumnSelectionCheckbox(), [
    slotRender(COLUMN_SELECT, (props) => h(NuxtColumnSelect, props)),
  ]);
}
