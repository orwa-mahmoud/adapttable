/**
 * Density chooser — `@adapttable/angular-unstyled/density`.
 *
 * @packageDocumentation
 */
import {
  type AdaptTableFeature,
  coreDensityChooser,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/angular";
import { AdaptDensityButton } from "@adapttable/angular-unstyled";

/**
 * A toolbar button that switches between comfortable and compact rows. The
 * choice is kept in the URL.
 *
 * @public
 */
export function densityChooser(): AdaptTableFeature {
  return extendFeature(coreDensityChooser(), [
    slotRender(TOOLBAR_EXTRAS, () => AdaptDensityButton, {
      orderAs: "density-chooser",
    }),
  ]);
}
