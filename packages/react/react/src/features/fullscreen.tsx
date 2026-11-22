/**
 * Fullscreen — `@adapttable/<kit>/fullscreen`.
 *
 * The hook names the portal container overlays must use while the table is
 * promoted. A table that never imports it never listens for fullscreen.
 */
import { coreFullscreen, liveStageKey } from "@adapttable/core/binding";
import { type ReactNode, useEffect, useState } from "react";

import { type FullscreenState, useFullscreen } from "../layout/useFullscreen";
import type { LiveStageProps } from "./liveStage";
import { slotRender } from "./providers";
import { type FullscreenLiveSlotProps } from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

/** Fullscreen's live stage: reads nothing, writes the fullscreen state. */
const FULLSCREEN_STAGE = liveStageKey<LiveStageProps<unknown>>("fullscreen", {
  reads: [],
  writes: "fullscreen",
});

/** Hand the committed table root to the fullscreen slot. */
function FullscreenStage<TRow>({
  shell,
  live,
  children,
}: LiveStageProps<TRow>): ReactNode {
  "use no memo";
  // The root exists only once the table has committed. Read from the ref
  // during render it is still null, and the button would do nothing until
  // something else happened to re-render the table. A passive effect runs
  // after every ref in the commit is attached, wherever the root sits; it
  // follows each shell render, since one can swap the root (loading to table).
  const rootRef = shell.chrome.rootRef;
  const [element, setElement] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setElement(rootRef.current);
  }, [rootRef, shell]);
  const fullscreenProps = {
    element,
    children: (fullscreen: FullscreenState) =>
      children({ ...live, fullscreen }),
  } satisfies FullscreenLiveSlotProps;
  return <LiveFullscreen {...fullscreenProps} />;
}

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
export function fullscreen(): StaticTableFeature {
  return {
    ...coreFullscreen(),
    renders: [
      slotRender(FULLSCREEN_STAGE, (props) => <FullscreenStage {...props} />),
    ],
  };
}
