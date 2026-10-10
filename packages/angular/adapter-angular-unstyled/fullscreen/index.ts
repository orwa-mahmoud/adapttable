/**
 * Fullscreen control — `@adapttable/angular-unstyled/fullscreen`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
} from "@adapttable/angular";
import { coreFullscreen, TOOLBAR_EXTRAS } from "@adapttable/angular/adapter";
import { AdaptFullscreenButton } from "@adapttable/angular-unstyled";

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
