import type { StaticTableFeature } from "@adapttable/vue";
import {
  extendFeature,
  FULLSCREEN_CONTROL,
  FullscreenButtonChrome,
  slotRender,
} from "@adapttable/vue/adapter";
import { fullscreen as bindingFullscreen } from "@adapttable/vue/features";
import { h } from "vue";

import QuasarButton from "./controls/QuasarButton.vue";

/** Quasar button for the binding-owned fullscreen action. */
export function fullscreen(): StaticTableFeature {
  return extendFeature(bindingFullscreen(), [
    slotRender(FULLSCREEN_CONTROL, (props) =>
      FullscreenButtonChrome({
        ...props,
        slots: { Button: (button) => h(QuasarButton, button) },
      })
    ),
  ]);
}
