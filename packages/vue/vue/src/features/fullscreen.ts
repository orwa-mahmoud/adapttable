import { coreFullscreen } from "@adapttable/core/binding";
import { watch } from "vue";

import { useFullscreen } from "../layout/useFullscreen";
import {
  FULLSCREEN_CONTROL,
  FULLSCREEN_MODEL,
} from "../viewControls/contracts";
import type { FeatureMountContext, StaticTableFeature } from "./tableFeature";
function mountFullscreen<TRow>(context: FeatureMountContext<TRow>): void {
  const state = useFullscreen(context.root, context.active);
  watch(state, (value) => context.state.set(FULLSCREEN_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
}
/** Add fullscreen for the real table root; kit overlays use model.container. */
export function fullscreen(): StaticTableFeature {
  return {
    ...coreFullscreen(),
    mount: mountFullscreen,
    requiredSlots: [FULLSCREEN_CONTROL],
  };
}
