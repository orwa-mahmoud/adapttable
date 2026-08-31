/**
 * Fullscreen — `@adapttable/<kit>/fullscreen`.
 *
 * The hook names the portal container overlays must use while the table is
 * promoted. A table that never imports it never listens for fullscreen.
 */
import type { ReactNode } from "react";

import { useFullscreen } from "../layout/useFullscreen";
import { slotRender } from "./providers";
import { FULLSCREEN_LIVE, type FullscreenLiveSlotProps } from "./slotKeys";
import type { TableFeature } from "./tableFeature";

function LiveFullscreen({
  element,
  children,
}: FullscreenLiveSlotProps): ReactNode {
  const fullscreen = useFullscreen(element);
  return children(fullscreen);
}

/**
 * Add a control that takes the table fullscreen.
 *
 * @public
 */
export function fullscreen<TRow>(): TableFeature<TRow> {
  return {
    id: "fullscreen",
    apply: () => ({ fullscreen: true }),
    renders: [
      slotRender(FULLSCREEN_LIVE, (props) => <LiveFullscreen {...props} />),
    ],
  };
}
