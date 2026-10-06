import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FULLSCREEN_CONTROL,
  FullscreenButtonChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { fullscreen as bindingFullscreen } from "@adapttable/vue/features";

import { nativeViewButton } from "./viewControls/nativeControls";

/** Browser fullscreen for the real native table root, when supported. */
export function fullscreen(): StaticTableFeature {
  return extendFeature(bindingFullscreen(), [
    slotRender(FULLSCREEN_CONTROL, (props) =>
      FullscreenButtonChrome({ ...props, slots: { Button: nativeViewButton } })
    ),
  ]);
}
