import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FULLSCREEN_CONTROL,
  FullscreenButtonChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { fullscreen as bindingFullscreen } from "@adapttable/vue/features";

import { rekaButton } from "./controls/basic";

export function fullscreen(): StaticTableFeature {
  return extendFeature(bindingFullscreen(), [
    slotRender(FULLSCREEN_CONTROL, (props) =>
      FullscreenButtonChrome({
        ...props,
        slots: { Button: ({ attrs, label }) => rekaButton(attrs, label) },
      })
    ),
  ]);
}
