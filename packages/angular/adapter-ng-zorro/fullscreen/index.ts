/**
 * Fullscreen control — `@adapttable/ng-zorro/fullscreen`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  coreFullscreen,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular";
import { AdaptFullscreenButton } from "@adapttable/ng-zorro";

/**
 * A toolbar button that takes the table fullscreen, where the browser
 * allows it.
 *
 * @public
 */
export function fullscreen(): AdaptTableFeature {
  return extendFeature(coreFullscreen(), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptFullscreenButton, {
      orderAs: "fullscreen",
    }),
  ]);
}
