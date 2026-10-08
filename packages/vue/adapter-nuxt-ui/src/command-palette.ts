import type { StaticTableFeature } from "@adapttable/vue";
import {
  COMMAND_PALETTE_CONTROL,
  extendFeature,
  slotRender,
} from "@adapttable/vue/adapter";
import { commandPalette as bindingCommandPalette } from "@adapttable/vue/features";
import { h } from "vue";

import NuxtCommandPalette from "./actions/NuxtCommandPalette";

export function commandPalette(
  options: Parameters<typeof bindingCommandPalette>[0] = true
): StaticTableFeature {
  return extendFeature(bindingCommandPalette(options), [
    slotRender(COMMAND_PALETTE_CONTROL, (props) =>
      h(NuxtCommandPalette, props)
    ),
  ]);
}
export type { CommandPaletteOptions } from "@adapttable/vue/features";
