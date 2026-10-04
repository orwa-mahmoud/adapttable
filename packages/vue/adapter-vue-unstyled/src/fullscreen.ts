import {
  extendFeature,
  slotRender,
  type StaticTableFeature,
} from "@adapttable/vue/adapter";
import {
  fullscreen as bindingFullscreen,
  FULLSCREEN_CONTROL,
  FullscreenButtonChrome,
} from "@adapttable/vue/fullscreen";

import { nativeViewButton } from "./viewControls/nativeControls";

/** Browser fullscreen for the real native table root, when supported. */
export function fullscreen(): StaticTableFeature {
  return extendFeature(bindingFullscreen(), [
    slotRender(FULLSCREEN_CONTROL, (props) =>
      FullscreenButtonChrome({ ...props, slots: { Button: nativeViewButton } })
    ),
  ]);
}
