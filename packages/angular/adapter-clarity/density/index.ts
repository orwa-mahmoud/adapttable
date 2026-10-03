/**
 * Density chooser — `@adapttable/clarity/density`.
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
import { AdaptDensityButton } from "@adapttable/clarity";

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
